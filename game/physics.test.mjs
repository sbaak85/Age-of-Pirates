import test from 'node:test';
import assert from 'node:assert/strict';
import { createBoatState, stepBoat, createVolley, dueVolleyShots, nearestSide } from './physics.js';

test('ship accelerates, coasts, then slows with water drag', () => {
  const boat=createBoatState(0,20,0);
  stepBoat(boat,{throttle:1,steer:0},.1);
  const initial=boat.speed;
  for(let i=0;i<20;i++)stepBoat(boat,{throttle:1,steer:0},.1);
  assert.ok(initial>0&&initial<2);
  assert.ok(boat.speed>initial*3);
  const cruising=boat.speed;
  stepBoat(boat,{throttle:0,steer:0},.1);
  assert.ok(boat.speed<cruising&&boat.speed>cruising*.8);
});

test('broadside follows closest live target', () => {
  const boat=createBoatState(0,0,0);
  const targets=[{x:0,z:7,alive:true},{x:0,z:-3,alive:true}];
  assert.equal(nearestSide(boat,targets).side,-1);
  targets[1].alive=false;
  assert.equal(nearestSide(boat,targets).side,1);
});

test('four cannon shots are spaced 0.3 seconds and reload ends after last shot', () => {
  const volley=createVolley(5,-1);
  assert.deepEqual(dueVolleyShots(volley,5),[0]);
  assert.deepEqual(dueVolleyShots(volley,5.29),[]);
  assert.deepEqual(dueVolleyShots(volley,5.3),[1]);
  assert.deepEqual(dueVolleyShots(volley,5.6),[2]);
  assert.deepEqual(dueVolleyShots(volley,5.9),[3]);
  assert.deepEqual(dueVolleyShots(volley,6.2),[]);
  assert.equal(Number(volley.reloadUntil.toFixed(1)),9.1);
});

test('ship does not pass through an island collider', () => {
  const boat=createBoatState(0,8,Math.PI/2);
  for(let i=0;i<100;i++)stepBoat(boat,{throttle:1,steer:0},.05,[{x:0,z:0,rx:3,rz:3}]);
  assert.ok(boat.z>4.6);
});
