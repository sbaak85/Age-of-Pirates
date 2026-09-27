import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {createCentralJungle} from '../game/central-jungle-model.js';
const previousFetch=globalThis.fetch;
globalThis.fetch=async url=>new Response(await fs.readFile(url));
try{
 const model=await createCentralJungle(),blockers=[model.terrain,model.roofs,model.details];
 assert.equal(model.gates.length,4);assert.deepEqual(model.skull.root.scale.toArray(),[.6,.6,.6]);
 assert.equal(model.skull.fossil.children.reduce((n,m)=>n+m.geometry.index.count/3,0),4929);
 model.root.traverse(m=>{if(m.isMesh)for(const a of Object.values(m.geometry.attributes))assert(a.array.every(Number.isFinite));});
 for(const gate of model.gates)for(const y of [1,4,7])for(const side of [-4,0,4]){
  const origin=new THREE.Vector3(gate.x*119+gate.z*side,y,gate.z*119-gate.x*side),direction=new THREE.Vector3(-gate.x,0,-gate.z);
  assert.equal(new THREE.Raycaster(origin,direction,0,71).intersectObjects(blockers,true).length,0,`${gate.id}: cave transit corridor`);
 }
 for(let i=0;i<32;i++){
  const a=i/32*Math.PI*2,origin=new THREE.Vector3(Math.cos(a)*49,8,Math.sin(a)*49);
  assert.equal(new THREE.Raycaster(origin,new THREE.Vector3(0,-1,0),0,8).intersectObjects([...blockers,model.skull.root],true).length,0,'central loop clear');
 }
 for(let q=0;q<4;q++){
  const a=q*Math.PI/2+.6,origin=new THREE.Vector3(Math.cos(a)*119,4,Math.sin(a)*119);
  assert(new THREE.Raycaster(origin,new THREE.Vector3(-Math.cos(a),0,-Math.sin(a)),0,70).intersectObjects([model.terrain],true).length>0,'outer wall encloses lagoon');
 }
 console.log('PASS: 4 clear cave channels (8m width / 7m headroom), unobstructed 49m-radius loop, enclosing rock sectors, approved 4929-triangle / 60% skull, finite geometry.');
}finally{globalThis.fetch=previousFetch;}
