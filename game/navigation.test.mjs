import test from 'node:test';import assert from 'node:assert/strict';
import {REGIONS,START,OBSTACLES,WHIRLPOOLS,polar} from './archipelago-data.js';
import {createBoatState,stepBoat,clamp} from './physics.js';
import {whirlpoolForce} from './archipelago-data.js';
test('actual inertial boat physics can circumnavigate and dock at all five villages',()=>{
 const boat=createBoatState(START.x,START.z,START.yaw),stops=[polar(REGIONS[0].angle,111)],ordered=REGIONS.map(r=>({...r,a:r.angle<REGIONS[0].angle?r.angle+Math.PI*2:r.angle})).sort((a,b)=>a.a-b.a);let last=REGIONS[0].angle;
 for(const r of ordered){for(let a=last+.08;a<r.a;a+=.08)stops.push(polar(a,111));stops.push(polar(r.a,111),{...r.dock,port:r.id},polar(r.a,111));last=r.a;}
 for(let a=last+.08;a<REGIONS[0].angle+Math.PI*2;a+=.08)stops.push(polar(a,111));stops.push({...REGIONS[0].dock,port:REGIONS[0].id});
 const visits=new Set();let target=0,damage=0;
 for(let tick=0;tick<36000&&target<stops.length;tick++){
  const p=stops[target],dx=p.x-boat.x,dz=p.z-boat.z;
  if(Math.hypot(dx,dz)<3.5){if(p.port)visits.add(p.port);target++;continue;}
  const heading=Math.atan2(-dz,dx),delta=Math.atan2(Math.sin(heading-boat.yaw),Math.cos(heading-boat.yaw));
  stepBoat(boat,{throttle:Math.abs(delta)>1?.3:1,steer:clamp(-delta*2,-1,1)},1/60,OBSTACLES);
  for(const v of WHIRLPOOLS)damage+=whirlpoolForce(boat,v,1/60);
 }
 assert.equal(visits.size,5,`Reached ${[...visits]} at step ${target}/${stops.length}`);assert.equal(target,stops.length);assert.ok(damage<160);
});
