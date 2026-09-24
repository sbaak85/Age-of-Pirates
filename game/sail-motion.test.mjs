import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceSails,sailPoint,SAIL_TRANSITION_SECONDS} from './sail-motion.js';
import {createBoatState,stepBoat} from './physics.js';
test('sails transition for 1.4 seconds and reverse without a jump',()=>{
 let p=advanceSails(1,false,.7);assert.ok(Math.abs(p-.5)<1e-10);
 assert.ok(Math.abs(advanceSails(p,true,.07)-.55)<1e-10);
 assert.equal(advanceSails(p,false,0),p);
 assert.equal(advanceSails(1,false,SAIL_TRANSITION_SECONDS),0);
 assert.equal(advanceSails(0,true,SAIL_TRANSITION_SECONDS),1);
});
test('furled cloth retains volume along the yard and every pose stays finite',()=>{
 const rig={x:0,top:5,height:2.26,width:3.65};let minY=Infinity,maxY=-Infinity,minX=Infinity,maxX=-Infinity;
 for(let j=0;j<=24;j++)for(let i=0;i<=24;i++)for(const p of [0,.25,.5,.75,1]){
  const point=sailPoint(rig,i/24,j/24,p,1.2);assert.ok(Object.values(point).every(Number.isFinite));
  if(p===0){minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y);minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);}
 }
 assert.ok(maxY-minY>.25&&maxY-minY<.5);assert.ok(maxX-minX>.25);
});
test('furled handling turns faster but preserves inertia; full sail reaches higher speed',()=>{
 const a=createBoatState(0,0,0),b=createBoatState(0,0,0);b.sails=false;b.sailDeployment=0;
 for(let i=0;i<240;i++){stepBoat(a,{throttle:1},1/60);stepBoat(b,{throttle:1},1/60);}
 assert.ok(a.speed>b.speed+1.5);
 a.speed=b.speed=6;a.steering=b.steering=0;
 const vx=b.vx;stepBoat(a,{throttle:1,steer:1},1/60);stepBoat(b,{throttle:1,steer:1},1/60);
 assert.ok(Math.abs(b.yaw)>Math.abs(a.yaw)*1.2);assert.ok(Math.abs(b.vx-vx)<.2);
 for(let i=0;i<60;i++){stepBoat(a,{throttle:0},1/60);stepBoat(b,{throttle:0},1/60);}
 assert.ok(b.speed<a.speed*.8);
});
