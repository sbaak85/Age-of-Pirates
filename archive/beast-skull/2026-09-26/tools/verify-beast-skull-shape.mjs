import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createBeastSkull} from '../game/beast-skull-model.js';
import {createBeastSkullLod} from '../game/beast-skull-lod.js';
import {setSkullWideProfile,skullWidthProfile} from '../game/beast-skull-shape.js';

const previousFetch=globalThis.fetch;
globalThis.fetch=async url=>new Response(await fs.readFile(new URL('../game/'+String(url),import.meta.url)));
const hash=g=>{const h=createHash('sha256');for(const a of Object.values(g.attributes))h.update(new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength));h.update(new Uint8Array(g.index.array.buffer,g.index.array.byteOffset,g.index.array.byteLength));return h.digest('hex');};
try{
 const original=await createBeastSkull(),models=[['baseline',original]];
 for(const level of ['lod50','lod10k','lod5k'])models.push([level,(await createBeastSkullLod(original,level)).model]);
 for(const [level,model] of models){
  const records=[];model.root.traverse(mesh=>{if(mesh.isMesh)records.push({mesh,g:mesh.geometry,hash:hash(mesh.geometry)});});
  setSkullWideProfile(model,true);
  for(const {mesh,g,hash:before} of records){
   assert.equal(hash(g),before,'source buffers must remain untouched');
   const p=mesh.geometry.attributes.position,old=g.attributes.position;
   assert.equal(p.count,old.count);assert.equal(mesh.geometry.index.count,g.index.count);
   for(let i=0;i<p.count;i++){assert.equal(p.getX(i),old.getX(i));assert.equal(p.getY(i),old.getY(i));}
   for(const a of Object.values(mesh.geometry.attributes))assert(a.array.every(Number.isFinite));
   if(mesh===model.cranium)for(let i=0;i<p.count;i++)assert(Math.abs(p.getZ(i)-old.getZ(i)*skullWidthProfile(old.getX(i)).scale)<.000004);
   if(mesh===model.mandible||mesh.material===model.plainBone||model.habitat.children.includes(mesh))assert.equal(mesh.geometry,g,'jaw, ribs and island stay unchanged');
   if(mesh.material===model.toothMaterial){
    const index=g.index.array;
    for(let i=0;i<index.length;i+=3){const delta=v=>p.getZ(v)-old.getZ(v);assert(Math.abs(delta(index[i])-delta(index[i+1]))<.000004);assert(Math.abs(delta(index[i])-delta(index[i+2]))<.000004);}
    for(let i=0;i<p.count;i++)if(old.getY(i)<10)assert.equal(p.getZ(i),old.getZ(i),'lower teeth unchanged');
   }
  }
  const widened=model.cranium.geometry;
  setSkullWideProfile(model,false);for(const {mesh,g} of records)assert.equal(mesh.geometry,g,'toggle restores exact source');
  setSkullWideProfile(model,true);assert.equal(model.cranium.geometry,widened,'toggle never accumulates deformation');
  console.log(`PASS ${level}: identical counts/length/height; upper teeth stay rigid; baseline, jaw, ribs and island preserved; toggle reversible.`);
 }
 assert.equal(skullWidthProfile(-12).scale,1.45);assert.equal(skullWidthProfile(31).scale,1);
}finally{globalThis.fetch=previousFetch;}
