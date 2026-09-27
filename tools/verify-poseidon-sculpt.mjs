import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPoseidonSculpt,sculptStats} from '../game/poseidon-sculpt.js';
const base=path.resolve('game/assets/poseidon-sculpt');const original=globalThis.fetch;
globalThis.fetch=async url=>{const p=decodeURIComponent(new URL(url).pathname).replace(/^\/(?:([A-Za-z]):)/,'$1:');const f=path.resolve(p);assert.ok(f.startsWith(base+path.sep));return new Response(await fs.readFile(f));};
try{
 const root=await createPoseidonSculpt();root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;assert.ok(p.count>0,o.name);for(const v of p.array)assert.ok(Number.isFinite(v),o.name+' nonfinite');for(const i of o.geometry.index.array)assert.ok(i<p.count,o.name+' invalid index');});
 const stats=sculptStats(root),size=new T.Box3().setFromObject(root).getSize(new T.Vector3());assert.ok(stats.triangles>100000);assert.equal(root.userData.metadata.simplified,false);assert.ok(size.y>16&&size.y<18);
 console.log(JSON.stringify({...stats,size:size.toArray(),status:'high-resolution-review',simplified:false},null,2));
 await fs.writeFile(path.join(base,'verification.json'),JSON.stringify({...stats,size:size.toArray(),status:'high-resolution-review',simplified:false},null,2)+'\n');
}finally{globalThis.fetch=original;}
