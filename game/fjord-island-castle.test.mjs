import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createFjordIslandCastle,ISLAND_CASTLE_POSITION,ISLAND_CASTLE_SCALE} from './fjord-island-castle.js';
import {BUILDING_TERRACES,HARBOR_FOUNDATION_TOP,castleApproachAxis,createFjordIslandStudy,islandHeight} from './fjord-island-study.js';

test('the enlarged citadel stands on its graded rock shelf and remains a separate detailed model',()=>{
 const castle=createFjordIslandCastle();castle.updateMatrixWorld(true);
 const core=castle.getObjectByName('蒼壁主堡・高塔與雙層城牆');
 const pad=core.getObjectByName('irregular lower bailey platform paving');
 const plot=BUILDING_TERRACES.find(p=>p.name==='主堡用地');
 assert.ok(pad&&plot);
 const bounds=new T.Box3().setFromObject(core);
 assert.ok(bounds.max.y>60,'the highest tower is legible against the mountain ridge');
 assert.ok(bounds.max.x-bounds.min.x>44,'the curtain walls form a broad castle silhouette');
 let coreTriangles=0;
 core.traverse(object=>{if(object.isMesh)coreTriangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;});
 assert.ok(coreTriangles<=5000,'the original citadel model stays within its own 5K triangle budget');
 const attr=pad.geometry.attributes.position;
 for(let i=0;i<attr.count;i++){
  const vertex=new T.Vector3(attr.getX(i),attr.getY(i),attr.getZ(i));
  pad.localToWorld(vertex);
  assert.ok(Math.abs(islandHeight(vertex.x,vertex.z)-ISLAND_CASTLE_POSITION.y)<.3,
   `castle paving is supported by graded terrain at ${vertex.x.toFixed(1)}, ${vertex.z.toFixed(1)}`);
 }
 for(const [x,z]of[[ISLAND_CASTLE_POSITION.x-23,-40],[ISLAND_CASTLE_POSITION.x+23,-40]])
  assert.ok(islandHeight(x,z)>HARBOR_FOUNDATION_TOP+10,'outer curtain is not set on the lower quay');
 assert.equal(ISLAND_CASTLE_SCALE.horizontal,1.17);
});

test('human-scale stairs rest on a continuous graded slope from the castle gate to the quay',()=>{
 const castle=createFjordIslandCastle();castle.updateMatrixWorld(true);
 const stairs=castle.getObjectByName('主堡城門至內港・依山雕出的儀式石階');
 const treads=stairs.children.filter(o=>o.name==='鑿入岩坡的寬石階');
 const {land}=createFjordIslandStudy();land.updateMatrixWorld(true);
 const ray=new T.Raycaster();
 assert.equal(treads.length,stairs.userData.steps);
 assert.ok(stairs.userData.landingZ<-39&&stairs.userData.harborZ>-12);
 assert.ok(stairs.userData.riser>=.16&&stairs.userData.riser<=.22,'step rise stays walkable');
 assert.ok(stairs.userData.treadRun>=.26,'each tread has usable depth');
 assert.equal(stairs.userData.restLandingCount,2);
 let previous=Infinity;
 let levelTreads=0;
 for(const tread of treads){
  const bounds=new T.Box3().setFromObject(tread);
  assert.ok(bounds.max.y>=islandHeight(tread.position.x,tread.position.z)+.1,'tread clears native rock');
  ray.set(new T.Vector3(tread.position.x,100,tread.position.z),new T.Vector3(0,-1,0));
  const terrainHit=ray.intersectObject(land)[0];
  assert.ok(terrainHit&&bounds.max.y-terrainHit.point.y>.2,'rendered earth remains beneath the walkable tread');
  assert.ok(bounds.max.y<=previous+.01,'stair descends steadily toward the harbor');
  if(Math.abs(bounds.max.y-previous)<.001)levelTreads++;
  assert.ok(Math.abs(tread.position.x-castleApproachAxis(tread.position.z).x)<.01,'stair follows the graded earth ramp');
  previous=bounds.max.y;
 }
 assert.equal(levelTreads,8,'two level rest landings interrupt the climb');
 assert.ok(Math.abs(previous-(HARBOR_FOUNDATION_TOP+.22))<.2,'lowest tread meets harbor pavement');
 assert.ok(treads[0].position.z<treads.at(-1).position.z);
 assert.ok(stairs.getObjectByName('階梯腳與碼頭地坪接合石'));
});
