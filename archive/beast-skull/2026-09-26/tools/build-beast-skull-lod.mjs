// Offline only: preserves the approved original and writes a separate 50% LOD asset set.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {MeshoptSimplifier} from './vendor/meshoptimizer/meshopt_simplifier.js';
import {createBeastSkull} from '../game/beast-skull-model.js';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assetRoot=path.join(project,'game/assets/beast-skull');
const output=path.join(assetRoot,'lod50');
const previousFetch=globalThis.fetch;
globalThis.fetch=async url=>{
 const resolved=path.resolve(project,'game',String(url));
 if(!resolved.startsWith(assetRoot+path.sep))throw new Error(`Unexpected model asset: ${url}`);
 return new Response(await fs.readFile(resolved));
};
let model;
try{model=await createBeastSkull();}finally{globalThis.fetch=previousFetch;}
await MeshoptSimplifier.ready;
await fs.mkdir(output,{recursive:true});
const manifest={version:1,tool:'meshoptimizer 1.2.0',scope:'Complete fossil meshes, excluding vegetation, terrain and ship',originalTriangles:0,reducedTriangles:0,parts:[]};
const bytes=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength);

for(const [slot,mesh] of model.fossil.children.entries()){
 if(!mesh.isMesh)continue;
 const geometry=mesh.geometry,position=geometry.attributes.position;
 const indices=new Uint32Array(geometry.index.array),normal=geometry.attributes.normal,color=geometry.attributes.color;
 const target=Math.floor(indices.length/6)*3,locked=new Uint8Array(position.count);
 // The six bounds extrema stay at their original positions.
 for(let axis=0;axis<3;axis++){let lo=0,hi=0;for(let i=1;i<position.count;i++){if(position.array[i*3+axis]<position.array[lo*3+axis])lo=i;if(position.array[i*3+axis]>position.array[hi*3+axis])hi=i;}locked[lo]=locked[hi]=1;}
 const stride=color?6:3,attributes=new Float32Array(position.count*stride);
 for(let i=0;i<position.count;i++){attributes.set(normal.array.subarray(i*3,i*3+3),i*stride);if(color)attributes.set(color.array.subarray(i*3,i*3+3),i*stride+3);}
 const weights=color?[.15,.15,.15,.1,.1,.1]:[.15,.15,.15];
 const [reduced,error]=MeshoptSimplifier.simplifyWithAttributes(indices,position.array,3,attributes,stride,weights,locked,target,.02,['LockBorder']);
 const [remap,count]=MeshoptSimplifier.compactMesh(reduced);
 const key=mesh===model.cranium?'cranium':mesh===model.mandible?'mandible':mesh.material===model.toothMaterial?'teeth':mesh.material===model.plainBone?'axial-bones':'sutures';
 const part={key,name:mesh.name||key,originalTriangles:indices.length/3,triangles:reduced.length/3,vertices:count,error,sourceHash:createHash('sha256').update(bytes(position.array)).update(bytes(indices)).digest('hex'),attributes:{},index:`${key}-indices.bin`};
 for(const [name,attribute] of Object.entries(geometry.attributes)){
  const compact=new Float32Array(count*attribute.itemSize);
  for(let i=0;i<attribute.count;i++)if(remap[i]!==undefined&&remap[i]!==0xffffffff){compact.set(attribute.array.subarray(i*attribute.itemSize,(i+1)*attribute.itemSize),remap[i]*attribute.itemSize);}
  const file=`${key}-${name}.bin`;await fs.writeFile(path.join(output,file),bytes(compact));part.attributes[name]={file,itemSize:attribute.itemSize};
 }
 await fs.writeFile(path.join(output,part.index),bytes(reduced));
 manifest.parts.push(part);manifest.originalTriangles+=part.originalTriangles;manifest.reducedTriangles+=part.triangles;
 console.log(`${part.name}: ${part.originalTriangles} -> ${part.triangles}, estimated error ${error.toFixed(6)}`);
}
manifest.reduction=1-manifest.reducedTriangles/manifest.originalTriangles;
if(Math.abs(manifest.reduction-.5)>.005)throw new Error(`Unexpected reduction: ${manifest.reduction}`);
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Complete fossil: ${manifest.originalTriangles} -> ${manifest.reducedTriangles} triangles (${(manifest.reduction*100).toFixed(3)}% reduction)`);
