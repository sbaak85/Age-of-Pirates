import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createFjordTown} from './fjord-town.js';
import {createFjordStreets} from './fjord-streets.js';
import {fjordToWorld,fjordToLocal,fjordBlocked,fjordSurfaceHeight} from './fjord-layout.js';
import {fjordIslandToWorld,fjordIslandToLocal,FJORD_ISLAND} from './fjord-island-placement.js';
import {fjordIslandBlocked} from './fjord-island-navigation.js';
import {navigable,OBSTACLES,TERRAIN,REGIONS} from './archipelago-data.js';
import {createBoatState,stepBoat} from './physics.js';
import {createWorld} from './world.js';

test('legacy castle-town model retains founded houses for the model workshop',()=>{
 const town=createFjordTown();assert.ok(!TERRAIN.some(t=>t.region==='fjord'));
 assert.equal(town.homes.length,38);assert.equal(town.homes.filter(h=>h.userData.style==='greek').length,19);assert.equal(town.castle.position.y,10);
 const ray=new T.Raycaster();ray.far=.5;
 for(const h of town.homes)for(const x of[-2.8,0,2.8])for(const z of[-2.35,0,2.8]){
  ray.set(h.localToWorld(new T.Vector3(x,.12,z)),new T.Vector3(0,-1,0));assert.ok(ray.intersectObject(town.terrain,true).length,h.name+' unsupported');
  ray.ray.direction.set(0,1,0);ray.far=40;assert.equal(ray.intersectObject(town.terrain,true).length,0,h.name+' buried in terrain');ray.far=.5;
 }
 for(const h of town.homes){
  ray.set(h.localToWorld(new T.Vector3(0,.12,3.9)),new T.Vector3(0,-1,0));
  assert.ok(ray.intersectObject(town.terrain,true).length,h.name+' front steps unsupported');
 }
 assert.equal(createFjordStreets(fjordSurfaceHeight,town.homes).userData.routeFailures,0,'cliff houses severed a street or stair route');
});
test('new sea gate, statue bypass, dock and east trench connect at hull clearance',()=>{
 for(const path of [[[0,95],[0,49],[-9,39],[-9,12]],[[83,55],[79,40],[83,30],[88,20],[91,5],[91,-20]]])for(let j=1;j<path.length;j++)for(let i=0;i<=100;i++){
  const a=path[j-1],b=path[j],t=i/100,p=fjordIslandToWorld(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t);
  assert.ok(navigable(p.x,p.z,1.7),JSON.stringify({path:j,i,local:fjordIslandToLocal(p.x,p.z)}));
 }
 const dock=REGIONS.find(r=>r.id==='fjord').dock,p=fjordIslandToWorld(...FJORD_ISLAND.dock);assert.equal(dock.x,p.x);assert.equal(dock.z,p.z);
});
test('legacy sea-gate model keeps its arched passage clear in the model workshop',()=>{
 const town=createFjordTown(),ray=new T.Raycaster();ray.far=40;
 for(const x of[-17.5,17.5]){
  const height=fjordSurfaceHeight(x,31),p=fjordToWorld(x,31);
  assert.ok(height>=3.5,'gate tower lacks a land foundation at '+x);
  ray.set(new T.Vector3(p.x,30,p.z),new T.Vector3(0,-1,0));
  const hit=ray.intersectObject(town.terrain,true)[0];
  assert.ok(hit,'gate tower foundation is invisible at '+x);
  assert.ok(Math.abs(hit.point.y-height)<.05,'tower foundation does not match rock surface at '+x);
 }
 for(const x of[-9,0,9])for(const z of[25,28,31,34,37]){
  const p=fjordToWorld(x,z);
  assert.ok(!fjordBlocked(p.x,p.z,1.7),`main arch pinched at ${x},${z}`);
 }
});
test('actual sailing enters the new gate and can reverse off a tower',()=>{
 for(const [start,end]of[[[0,95],[0,47]],[[91,46],[91,5]]]){
  const a=fjordIslandToWorld(...start),b=fjordIslandToWorld(...end),boat=createBoatState(a.x,a.z,Math.atan2(-(b.z-a.z),b.x-a.x));
  for(let i=0;i<300;i++){stepBoat(boat,{throttle:1,steer:0},1/60,OBSTACLES);assert.ok(!fjordIslandBlocked(boat.x,boat.z,1.7));}
  assert.ok(Math.hypot(boat.x-a.x,boat.z-a.z)>18,'gate or trench obstructed');
 }
 const a=fjordIslandToWorld(-17.5,87),b=fjordIslandToWorld(-17.5,61),boat=createBoatState(a.x,a.z,Math.atan2(-(b.z-a.z),b.x-a.x));
 let contacted=false;for(let i=0;i<400;i++){
  stepBoat(boat,{throttle:1,steer:0},1/60,OBSTACLES);
  assert.ok(!fjordIslandBlocked(boat.x,boat.z,1.7));
  if(boat.fjordContact){contacted=true;break;}
 }
 assert.ok(contacted,'boat did not meet the sloped gate shoulder');const hit={x:boat.x,z:boat.z};
 for(let i=0;i<400;i++)stepBoat(boat,{throttle:-1,steer:0},1/60,OBSTACLES);
 assert.ok(Math.hypot(boat.x-hit.x,boat.z-hit.z)>10,'cannot reverse off pier');
});
test('integrated island has local camera occlusion and overview restores full architecture',()=>{
 const scene=new T.Scene(),world=createWorld(scene),p=fjordIslandToWorld(17.5,40),eye=fjordIslandToWorld(17.5,90),target=new T.Vector3(p.x,.4,p.z),camera=new T.PerspectiveCamera(54,1,.1,240);scene.updateMatrixWorld(true);
 camera.position.set(eye.x,12,eye.z);camera.lookAt(target);
 for(let i=0;i<120;i++)world.updateCentralOcclusion(camera,target,0,1/60);
 world.frameCentralOcclusion(camera,target);assert.ok(world.cameraHeightMultiplier>1);
 world.setOverview(true);for(let i=0;i<180;i++)world.updateCentralOcclusion(camera,target,0,1/60);assert.equal(world.cameraHeightMultiplier,1);
});
