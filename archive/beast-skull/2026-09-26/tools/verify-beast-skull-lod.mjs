import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {createBeastSkull} from '../game/beast-skull-model.js';
import {createBeastSkullLod,fossilPartKey} from '../game/beast-skull-lod.js';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assets=path.join(project,'game/assets/beast-skull');
const level=process.argv.includes('--5k')?'lod5k':process.argv.includes('--10k')?'lod10k':'lod50';
const priorFetch=globalThis.fetch;
globalThis.fetch=async url=>{const file=path.resolve(project,'game',String(url));assert(file.startsWith(assets+path.sep));return new Response(await fs.readFile(file));};
let original,reduced,manifest;
try{original=await createBeastSkull();({model:reduced,manifest}=await createBeastSkullLod(original,level));}finally{globalThis.fetch=priorFetch;}

function components(geometry){
 const p=geometry.attributes.position,parent=Int32Array.from({length:p.count},(_,i)=>i),seen=new Uint8Array(p.count),index=geometry.index.array;
 const find=a=>{while(parent[a]!==a){parent[a]=parent[parent[a]];a=parent[a];}return a;};
 for(let i=0;i<index.length;i+=3){const a=index[i],b=index[i+1],c=index[i+2];seen[a]=seen[b]=seen[c]=1;parent[find(a)]=find(b);parent[find(c)]=find(b);}
 const groups=new Set();for(let i=0;i<p.count;i++)if(seen[i])groups.add(find(i));return groups.size;
}
const originals=new Map(original.fossil.children.map(mesh=>[fossilPartKey(mesh,original),mesh]));
let count=0;
for(const mesh of reduced.fossil.children){
 const key=fossilPartKey(mesh,reduced),source=originals.get(key),g=mesh.geometry;
 assert.notEqual(g,source.geometry,`${key}: original must stay independent`);
 assert.equal(mesh.material,source.material,`${key}: same material`);
 for(const [name,attribute] of Object.entries(g.attributes)){assert.equal(attribute.count,g.attributes.position.count);assert(attribute.array.every(Number.isFinite),`${key}: finite ${name}`);}
 assert(g.index.array.every(i=>i>=0&&i<g.attributes.position.count));
 const oldComponents=components(source.geometry),newComponents=components(g);assert.equal(newComponents,oldComponents,`${key}: no missing or disconnected components`);
 g.computeBoundingBox();source.geometry.computeBoundingBox();assert(g.boundingBox.min.distanceTo(source.geometry.boundingBox.min)<.00002&&g.boundingBox.max.distanceTo(source.geometry.boundingBox.max)<.00002,`${key}: bounds retained`);
 count+=g.index.count/3;console.log(`${key}: ${source.geometry.index.count/3} -> ${g.index.count/3} triangles; ${newComponents} components retained`);
}
assert.equal(count,manifest.reducedTriangles);
// Exact removal of four teeth keeps the approved 50% LOD slightly above half.
if(level==='lod5k')assert(Math.abs(count-5000)<=250);else if(level==='lod10k')assert(Math.abs(count-10000)<=250);else assert(Math.abs(manifest.reduction-.5)<.001);
for(const model of [original,reduced]){
 model.root.updateMatrixWorld(true);
 for(const [name,x,y,expected] of [['eye',-11,27,false],['antorbital',6,24,false],['nasal',25.6,25,false],['bridge',-2,28,true]]){
  const ray=new THREE.Raycaster(new THREE.Vector3(x,y,30),new THREE.Vector3(0,0,-1));assert.equal(ray.intersectObject(model.cranium).length>0,expected,name);
 }
}
console.log(`PASS (${level}): originals preserved; attributes, bounds, components, three bone windows and triangle budget verified.`);
