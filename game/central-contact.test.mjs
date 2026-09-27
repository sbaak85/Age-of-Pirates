import test from 'node:test';
import assert from 'node:assert/strict';
import {JUNGLE_GATES} from './central-jungle-layout.js';
import {CENTRAL_JUNGLE_SCALE as scale} from './central-jungle-placement.js';
import {centralBlocked,resolveCentralMotion} from './central-navigation.js';
import {createBoatState,stepBoat} from './physics.js';
import {OBSTACLES} from './archipelago-data.js';

for(const gate of JUNGLE_GATES)for(const side of [-1,1]){
 test(`${gate.id} cave side ${side}: B steering escapes contact without entering rock`,()=>{
  const a=gate.path[0],b=gate.path[1],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  const nx=-dz/length*side,nz=dx/length*side,cx=b[0]*scale,cz=b[1]*scale;
  const boat=createBoatState(cx,cz,Math.atan2(-nz,nx));let touched=false;
  for(let i=0;i<240;i++){
   stepBoat(boat,{directional:true,targetYaw:boat.yaw,throttle:1},1/60,OBSTACLES);
   touched||=boat.centralContact;assert.ok(!centralBlocked(boat.x,boat.z,1.7));
  }
  assert.ok(touched,'must actually hit this wall');
  assert.ok(boat.speed>5,'contact must not erase propulsion every frame');
  const hit={x:boat.x,z:boat.z};let escaped=false;
  for(let i=0;i<1200;i++){
   stepBoat(boat,{directional:true,targetYaw:Math.atan2(-(cz-boat.z),cx-boat.x),throttle:.6},1/60,OBSTACLES);
   assert.ok(!centralBlocked(boat.x,boat.z,1.7));
   if(!boat.centralContact&&Math.hypot(boat.x-hit.x,boat.z-hit.z)>3)escaped=true;
  }
  assert.ok(escaped,'powered turn must escape the wall');
 });
}

test('a slightly overlapping hull is pushed clear instead of rolling back forever',()=>{
 const gate=JUNGLE_GATES[0],x=gate.path[1][0]*scale,z=gate.path[1][1]*scale;
 let px=x;while(!centralBlocked(px,z,1.7)&&px<x+20)px+=.05;
 const boat=createBoatState(px,z);assert.ok(centralBlocked(px,z,1.7));
 resolveCentralMotion(boat,px,z,1.7);
 assert.ok(!centralBlocked(boat.x,boat.z,1.7));
 assert.ok(Math.hypot(boat.x-px,boat.z-z)<1,'recovery stays on the nearby water side');
});
