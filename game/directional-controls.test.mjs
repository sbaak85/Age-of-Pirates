import test from 'node:test';
import assert from 'node:assert/strict';
import {directionalInput} from './directional-controls.js';
import {createBoatState,stepBoat,forward} from './physics.js';

const dt=1/60;
test('B stick directions follow the camera plane, with radial deadzone and analog speed',()=>{
 for(const view of [{x:-23,z:-27},{x:27,z:-23},{x:0,z:0}]){
  const up=forward(directionalInput(0,-1,view).targetYaw);
  const right=forward(directionalInput(1,0,view).targetYaw);
  assert.ok(Math.abs(up.x*right.x+up.z*right.z)<1e-10);
  if(Math.hypot(view.x,view.z)>0)assert.ok(up.x*view.x+up.z*view.z>0);
 }
 assert.equal(directionalInput(.05,-.05,{x:0,z:-1}).throttle,0);
 assert.equal(directionalInput(1,1,{x:0,z:-1}).throttle,1);
 assert.ok(directionalInput(.5,0,{x:0,z:-1}).throttle<.5);
});
test('B reverse-direction command makes a moving U-turn within the angular radius limit',()=>{
 const boat=createBoatState(0,0,0);
 for(let i=0;i<180;i++)stepBoat(boat,{directional:true,targetYaw:0,throttle:1},dt);
 const start={x:boat.x,z:boat.z};
 for(let i=0;i<480;i++){
  const yaw=boat.yaw,speed=Math.hypot(boat.vx,boat.vz);
  stepBoat(boat,{directional:true,targetYaw:Math.PI,throttle:1},dt);
  assert.ok(Math.abs(boat.yaw-yaw)<=speed/boat.minTurnRadius*dt+1e-10);
  if(i===0){assert.ok(Math.abs(boat.yaw)<.1);assert.ok(boat.vx>0);}
 }
 assert.ok(Math.abs(Math.atan2(Math.sin(Math.PI-boat.yaw),Math.cos(Math.PI-boat.yaw)))<.05);
 assert.ok(Math.abs(boat.z-start.z)>5,'turn takes a visible arc instead of pivoting');
});
test('B light throttle is slower, release coasts, and a stationary boat cannot pivot',()=>{
 const full=createBoatState(0,0,0),half=createBoatState(0,0,0);
 for(let i=0;i<180;i++){
  stepBoat(full,{directional:true,targetYaw:0,throttle:1},dt);
  stepBoat(half,{directional:true,targetYaw:0,throttle:.5},dt);
 }
 assert.ok(Math.abs(half.speed/full.speed-.5)<.01);
 const speed=full.speed,x=full.x;
 stepBoat(full,{directional:true,throttle:0},dt);
 assert.ok(full.speed<speed&&full.speed>speed*.95);assert.ok(full.x>x);
 const rest=createBoatState(0,0,0);
 for(let i=0;i<60;i++)stepBoat(rest,{directional:true,targetYaw:Math.PI,throttle:0},dt);
 assert.equal(rest.yaw,0);assert.equal(rest.x,0);
});
test('ship handling parameters change B turn radius and restart acceleration',()=>{
 const tight=createBoatState(0,0,0),wide=createBoatState(0,0,0);
 tight.minTurnRadius=6;wide.minTurnRadius=18;
 for(const boat of [tight,wide]){boat.speed=8;boat.vx=8;}
 for(let i=0;i<90;i++)for(const boat of [tight,wide])stepBoat(boat,{directional:true,targetYaw:Math.PI,throttle:1},dt);
 assert.ok(Math.abs(tight.yaw)>Math.abs(wide.yaw)*1.5);
 const fast=createBoatState(),slow=createBoatState();fast.acceleration=2;slow.acceleration=.5;
 for(let i=0;i<60;i++)for(const boat of [fast,slow])stepBoat(boat,{directional:true,targetYaw:boat.yaw,throttle:1},dt);
 assert.ok(fast.speed>slow.speed*1.5);
});
