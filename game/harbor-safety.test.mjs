import test from 'node:test';
import assert from 'node:assert/strict';
import {START,REGIONS,ENCOUNTERS,LOOT,regionAt,isHarborSafeZone} from './archipelago-data.js';
import {stepKrakenCombat,KRAKEN_MELEE} from './kraken-combat.js';

test('the whole named harbor is safe, all targets spawn outside with body clearance',()=>{
 assert.ok(isHarborSafeZone(START.x,START.z));
 for(let x=-200;x<=200;x+=5)for(let z=-200;z<=200;z+=5){
  assert.equal(isHarborSafeZone(x,z),regionAt(x,z).id==='harbor');
 }
 assert.equal(ENCOUNTERS.length,24);
 for(const t of ENCOUNTERS){assert.notEqual(t.region,'harbor');assert.equal(isHarborSafeZone(...t.start,t.radius),false,t.id);}
 for(const r of REGIONS.slice(1))assert.equal(ENCOUNTERS.filter(t=>t.region===r.id).length,6);
 assert.equal(LOOT.filter(t=>t.region==='harbor').length,8,'harbor exploration rewards remain');
});
test('safe boundary includes enemy radius so a hull cannot straddle it',()=>{
 const a=REGIONS[0].dock,b=REGIONS[1].dock,d=Math.hypot(b.x-a.x,b.z-a.z);
 const x=(a.x+b.x)/2+(b.x-a.x)/d,z=(a.z+b.z)/2+(b.z-a.z)/d;
 assert.equal(isHarborSafeZone(x,z),false);
 assert.equal(isHarborSafeZone(x,z,2),true);
});
test('returning to harbor cancels an already winding-up kraken strike and permits later re-engagement',()=>{
 const t={x:0,z:0,yaw:0,alive:true},player={x:7,z:0};
 assert.ok(stepKrakenCombat(t,player,0).started);
 const safe=stepKrakenCombat(t,player,KRAKEN_MELEE.impact,true);
 assert.equal(safe.hit,false);assert.equal(safe.strike,false);assert.equal(safe.warning,false);
 assert.equal(t.melee.engaged,false);assert.equal(t.melee.startedAt,null);
 assert.ok(stepKrakenCombat(t,player,10,false).started);
});
