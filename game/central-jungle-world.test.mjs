import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {createWorld} from './world.js';
import {JUNGLE_GATES} from './central-jungle-layout.js';
import {CENTRAL_JUNGLE_SCALE as scale,CENTRAL_JUNGLE_HEIGHT} from './central-jungle-placement.js';
import {centralBlocked} from './central-navigation.js';
import {navigable,OBSTACLES} from './archipelago-data.js';
import {createBoatState,stepBoat} from './physics.js';

test('central footprint grows by twenty percent twice with unchanged height',()=>{
 assert.ok(Math.abs((scale/.6)**2-1.44)<1e-12);
 assert.equal(CENTRAL_JUNGLE_HEIGHT,.6);
});
test('all four integrated cave passages clear the player hull',()=>{
 for(const gate of JUNGLE_GATES)for(let segment=0;segment<2;segment++)for(let i=0;i<=100;i++){
  const a=gate.path[segment],b=gate.path[segment+1],t=i/100;
  assert.ok(navigable((a[0]*(1-t)+b[0]*t)*scale,(a[1]*(1-t)+b[1]*t)*scale,1.7),gate.id);
 }
});
test('actual boat motion crosses cave entrances but cannot sail into central rock',()=>{
 for(const gate of JUNGLE_GATES){
  const a=gate.path[0],b=gate.path[1],boat=createBoatState(a[0]*scale,a[1]*scale,Math.atan2(-(b[1]-a[1]),b[0]-a[0]));
  for(let i=0;i<240;i++){stepBoat(boat,{throttle:1,steer:0},1/60,OBSTACLES);assert.ok(!centralBlocked(boat.x,boat.z,1.7));}
  assert.ok(Math.hypot(boat.x-a[0]*scale,boat.z-a[1]*scale)>18,gate.id+' entrance blocked');
 }
 const boat=createBoatState(35,80,Math.PI/2);
 for(let i=0;i<1200;i++){stepBoat(boat,{throttle:1,steer:0},1/60,OBSTACLES);assert.ok(!centralBlocked(boat.x,boat.z,1.7));}
 assert.ok(boat.z>20,'rock boundary failed');
});
test('main world loads one approved jungle and three bone groups, with local fade',async()=>{
 const saved=globalThis.fetch;globalThis.fetch=async url=>new Response(await fs.readFile(url));
 try{
  const scene=new THREE.Scene(),world=createWorld(scene),pending=world.loadCentral();
  assert.equal(world.loadCentral(),pending);
  const m=await pending;assert.equal(world.central,m);assert.equal(m.lagoonBones.children.length,3);
  assert.deepEqual(m.root.scale.toArray(),[scale,CENTRAL_JUNGLE_HEIGHT,scale]);
  assert.equal(scene.children.filter(o=>o===m.root).length,1);
  const camera=new THREE.PerspectiveCamera(54,1,.1,240),position=new THREE.Vector3(0,.4,15);
  camera.position.set(65,20,45);camera.lookAt(position);
  for(let i=0;i<120;i++)world.updateCentralOcclusion(camera,position,0,1/60);
  world.frameCentralOcclusion(camera,position);
  assert.ok(world.cameraHeightMultiplier>1.1);
  world.setOverview(true);
  for(let i=0;i<180;i++)world.updateCentralOcclusion(camera,position,0,1/60);
  assert.equal(world.cameraHeightMultiplier,1);
 }finally{globalThis.fetch=saved;}
});
