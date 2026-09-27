import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {createCentralJungle} from '../game/central-jungle-model.js';
import {JUNGLE_BRIDGES} from '../game/central-jungle-layout.js';
const previousFetch=globalThis.fetch;globalThis.fetch=async url=>new Response(await fs.readFile(url));
try{
 const m=await createCentralJungle(),land=m.terrain.children[0],g=land.geometry;
 assert.equal(m.gates.length,4);assert.equal(m.terrain.children.length,1);assert.equal(m.roofs.children.length,0,'no independent cave roofs');
 assert.equal(g.index.count/3,4980);assert.deepEqual(m.skull.root.scale.toArray(),[.6,.6,.6]);
 assert.equal(m.skull.fossil.children.reduce((n,o)=>n+o.geometry.index.count/3,0),4929);
 assert.equal(m.lagoonBones.children.length,3);
 for(const cluster of m.lagoonBones.children){assert.equal(cluster.userData.ribs,3);const bounds=new THREE.Box3().setFromObject(cluster);assert(bounds.min.y<-.8&&bounds.max.y>6,'bones extend from below water above the surface');assert(cluster.children[0].geometry.index.count/3<5000);}
 let total=0,max=0;const models=[];
 m.root.traverseVisible(o=>{if(!o.isMesh)return;const triangles=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert(triangles<=5000,`${o.name}: budget exceeded`);max=Math.max(max,triangles);total+=triangles*(o.count??1);models.push(triangles);for(const a of Object.values(o.geometry.attributes))assert(a.array.every(Number.isFinite),'finite geometry');});
 // Topological connectivity: joining meshes into a Group would not pass this test.
 const idx=g.index.array,parent=Array.from({length:g.attributes.position.count},(_,i)=>i);
 const find=i=>parent[i]===i?i:parent[i]=find(parent[i]);
 for(let i=0;i<idx.length;i+=3){parent[find(idx[i])]=find(idx[i+1]);parent[find(idx[i+1])]=find(idx[i+2]);}
 assert.equal(new Set(parent.map((_,i)=>find(i))).size,1,'cliffs, central island and bridges form one connected surface');
 for(const gate of m.gates){
  for(let i=0;i<2;i++)for(const y of [1,4,7])for(const side of [-4,0,4]){
   const a=gate.path[i],b=gate.path[i+1],direction=new THREE.Vector3(b[0]-a[0],0,b[1]-a[1]),distance=direction.length();direction.normalize();
   const origin=new THREE.Vector3(a[0]-direction.z*side,y,a[1]+direction.x*side);
   assert.equal(new THREE.Raycaster(origin,direction,0,distance).intersectObjects([m.terrain,m.lagoonBones],true).length,0,`${gate.id}: 8m wide / 7m high sailing envelope`);
  }
  const [x,z]=gate.path[1];land.material.side=THREE.DoubleSide;
  assert(new THREE.Raycaster(new THREE.Vector3(x,7,z),new THREE.Vector3(0,1,0),0,75).intersectObject(land).length,'cave has a connected rock ceiling');land.material.side=THREE.FrontSide;
 }
 for(const bridge of JUNGLE_BRIDGES){
  const x=(bridge.a[0]+bridge.b[0])/2,z=(bridge.a[1]+bridge.b[1])/2;land.material.side=THREE.DoubleSide;
  const hits=new THREE.Raycaster(new THREE.Vector3(x,0,z),new THREE.Vector3(0,1,0),0,90).intersectObject(land);
  assert(hits.length&&hits[0].point.y>8,'navigable clearance beneath connecting arch');land.material.side=THREE.FrontSide;
 }
 g.computeBoundingBox();assert(g.boundingBox.max.y-g.boundingBox.min.y>55,'distinct elevation range');
 console.log(JSON.stringify({pass:true,terrainTriangles:4980,connectedComponents:1,caves:4,archBridges:3,caveEnvelope:'8m width x 7m height',maxVisibleMeshTriangles:max,visibleModelCount:models.length,totalVisibleTriangles:total,skullTriangles:4929,skullScale:.6},null,2));
}finally{globalThis.fetch=previousFetch;}
