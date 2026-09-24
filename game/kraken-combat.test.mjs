import test from 'node:test';
import assert from 'node:assert/strict';
import {stepKrakenCombat,KRAKEN_MELEE} from './kraken-combat.js';
const creature=()=>({x:0,z:0,yaw:0,alive:true});
test('kraken detects, chases, winds up and strikes once after anticipation',()=>{
 const t=creature();assert.equal(stepKrakenCombat(t,{x:45,z:0},0).engaged,false);
 const chase=stepKrakenCombat(t,{x:25,z:0},1);assert.equal(chase.engaged,true);assert.equal(chase.speed,KRAKEN_MELEE.speed);
 const start=stepKrakenCombat(t,{x:8,z:0},2);assert.equal(start.started,true);assert.equal(start.speed,0);assert.equal(start.warning,true);
 assert.equal(stepKrakenCombat(t,{x:8,z:0},3.3).strike,false);
 const hit=stepKrakenCombat(t,{x:8,z:0},3.7);assert.equal(hit.strike,true);assert.equal(hit.hit,true);assert.equal(hit.warning,false);
 assert.equal(stepKrakenCombat(t,{x:8,z:0},3.8).strike,false);
 assert.equal(stepKrakenCombat(t,{x:8,z:0},5.1).locked,false);
 assert.equal(stepKrakenCombat(t,{x:8,z:0},6).started,false);
 assert.equal(stepKrakenCombat(t,{x:8,z:0},6.9).started,true);
});
test('locked direction allows evasion; range escape and death prevent damage',()=>{
 for(const escape of [{x:15,z:0},{x:0,z:8}]){
  const t=creature();stepKrakenCombat(t,{x:8,z:0},0);
  const result=stepKrakenCombat(t,escape,1.7);assert.equal(result.strike,true);assert.equal(result.hit,false);assert.equal(result.heading,0);
 }
 const t=creature();stepKrakenCombat(t,{x:8,z:0},0);t.alive=false;assert.equal(stepKrakenCombat(t,{x:8,z:0},1.7).strike,false);
});
test('pause time does not advance attack and disengagement returns to patrol',()=>{
 const t=creature();stepKrakenCombat(t,{x:8,z:0},0);
 for(let i=0;i<5;i++){const r=stepKrakenCombat(t,{x:8,z:0},.7);assert.equal(r.strike,false);assert.equal(r.age,.7);}
 stepKrakenCombat(t,{x:45,z:0},3.1);assert.equal(stepKrakenCombat(t,{x:45,z:0},3.2).engaged,false);
});
