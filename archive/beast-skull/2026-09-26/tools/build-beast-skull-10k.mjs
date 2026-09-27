// Offline 10k / 5k candidates. Approved meshes and other LODs are read-only inputs.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {MeshoptSimplifier} from './vendor/meshoptimizer/meshopt_simplifier.js';
import {createBeastSkull} from '../game/beast-skull-model.js';
import {fossilPartKey} from '../game/beast-skull-lod.js';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const targetTriangles=process.argv.includes('--5k')?5000:10000;
const level=targetTriangles===5000?'lod5k':'lod10k';
const assets=path.join(project,'game/assets/beast-skull'),output=path.join(assets,level);
const priorFetch=globalThis.fetch;
globalThis.fetch=async url=>{const file=path.resolve(project,'game',String(url));if(!file.startsWith(assets+path.sep))throw new Error('Unexpected asset');return new Response(await fs.readFile(file));};
let model;try{model=await createBeastSkull();}finally{globalThis.fetch=priorFetch;}
await MeshoptSimplifier.ready;await fs.mkdir(output,{recursive:true});
const budgets=targetTriangles===5000
 ?{cranium:2300,mandible:800,teeth:1150,'axial-bones':600,sutures:150}
 :{cranium:4850,mandible:1500,teeth:2250,'axial-bones':1150,sutures:250};
const bytes=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength);
const manifest={version:1,tool:'meshoptimizer 1.2.0',targetTriangles,scope:'Complete fossil meshes, excluding vegetation, terrain and ship',originalTriangles:0,reducedTriangles:0,parts:[]};

// Weld coincident UV-seam vertices before aggressive reduction. Bone shading is object-space.
function weld(geometry){
 const src=geometry.attributes,map=new Map(),remap=new Uint32Array(src.position.count),values=Object.fromEntries(Object.keys(src).map(k=>[k,[]]));
 for(let i=0;i<src.position.count;i++){
  const p=src.position.array.subarray(i*3,i*3+3),key=[...p].map(v=>Math.round(v*1e5)).join(',');
  let next=map.get(key);if(next===undefined){next=map.size;map.set(key,next);for(const [name,attribute] of Object.entries(src))values[name].push(...attribute.array.subarray(i*attribute.itemSize,(i+1)*attribute.itemSize));}remap[i]=next;
 }
 const attrs=Object.fromEntries(Object.entries(values).map(([k,a])=>[k,new Float32Array(a)])),indices=[];
 const input=geometry.index.array;for(let i=0;i<input.length;i+=3){const a=remap[input[i]],b=remap[input[i+1]],c=remap[input[i+2]];if(a!==b&&a!==c&&b!==c)indices.push(a,b,c);}
 return {attrs,indices:new Uint32Array(indices),count:map.size};
}
function componentExtrema(position,indices){
 const count=position.length/3,parent=Int32Array.from({length:count},(_,i)=>i);
 const find=a=>{while(parent[a]!==a){parent[a]=parent[parent[a]];a=parent[a];}return a;};
 for(let i=0;i<indices.length;i+=3){parent[find(indices[i])]=find(indices[i+1]);parent[find(indices[i+2])]=find(indices[i+1]);}
 const groups=new Map();for(const i of indices){const root=find(i);if(!groups.has(root))groups.set(root,new Set());groups.get(root).add(i);}
 const locks=new Uint8Array(count);
 for(const group of groups.values())for(let axis=0;axis<3;axis++){let lo=-1,hi=-1;for(const i of group){if(lo<0||position[i*3+axis]<position[lo*3+axis])lo=i;if(hi<0||position[i*3+axis]>position[hi*3+axis])hi=i;}locks[lo]=locks[hi]=1;}
 return {locks,components:groups.size};
}

for(const mesh of model.fossil.children){
 const key=fossilPartKey(mesh,model),source=mesh.geometry,originalIndices=new Uint32Array(source.index.array),{attrs,indices,count}=weld(source);
 const {locks,components}=componentExtrema(attrs.position,indices);
 const normals=attrs.normal,colors=attrs.color,stride=colors?6:3,attributes=new Float32Array(count*stride);
 for(let i=0;i<count;i++){attributes.set(normals.subarray(i*3,i*3+3),i*stride);if(colors)attributes.set(colors.subarray(i*3,i*3+3),i*stride+3);}
 // Position curvature dominates; low normal weight avoids spending the budget on tiny erosion.
 const weights=colors?[.025,.025,.025,.015,.015,.015]:[.025,.025,.025];
 const [reduced,error]=MeshoptSimplifier.simplifyWithAttributes(indices,attrs.position,3,attributes,stride,weights,locks,budgets[key]*3,.05,[]);
 const [remap,vertices]=MeshoptSimplifier.compactMesh(reduced);
 const part={key,name:mesh.name||key,originalTriangles:originalIndices.length/3,targetTriangles:budgets[key],triangles:reduced.length/3,vertices,components,error,sourceHash:createHash('sha256').update(bytes(source.attributes.position.array)).update(bytes(originalIndices)).digest('hex'),attributes:{},index:`${key}-indices.bin`};
 for(const [name,array] of Object.entries(attrs)){
  const itemSize=source.attributes[name].itemSize,compact=new Float32Array(vertices*itemSize);
  for(let i=0;i<count;i++)if(remap[i]!==undefined&&remap[i]!==0xffffffff)compact.set(array.subarray(i*itemSize,(i+1)*itemSize),remap[i]*itemSize);
  const file=`${key}-${name}.bin`;await fs.writeFile(path.join(output,file),bytes(compact));part.attributes[name]={file,itemSize};
 }
 await fs.writeFile(path.join(output,part.index),bytes(reduced));manifest.parts.push(part);manifest.originalTriangles+=part.originalTriangles;manifest.reducedTriangles+=part.triangles;
 console.log(`${key}: ${part.originalTriangles} -> ${part.triangles} triangles (target ${budgets[key]}), ${components} components, estimated error ${error.toFixed(6)}`);
}
manifest.reduction=1-manifest.reducedTriangles/manifest.originalTriangles;
if(Math.abs(manifest.reducedTriangles-targetTriangles)>250)throw new Error(`Budget not met: ${manifest.reducedTriangles}`);
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Complete fossil: ${manifest.reducedTriangles} triangles, ${(manifest.reduction*100).toFixed(3)}% reduction.`);
