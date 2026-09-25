import test from 'node:test';
import assert from 'node:assert/strict';
import {START,REGIONS,ENCOUNTERS,LOOT,regionAt,isHarborSafeZone,isReefKrakenExclusion,isEnemyPositionRestricted} from './archipelago-data.js';
import {stepKrakenCombat,KRAKEN_MELEE} from './kraken-combat.js';

test('the whole named harbor is safe, all targets spawn outside with body clearance',()=>{
 assert.ok(isHarborSafeZone(START.x,START.z));
 for(let x=-200;x<=200;x+=5)for(let z=-200;z<=200;z+=5){
  assert.equal(isHarborSafeZone(x,z),regionAt(x,z).id==='harbor');
 }
 assert.equal(ENCOUNTERS.length,34);
 for(const t of ENCOUNTERS){assert.notEqual(t.region,'harbor');assert.equal(isHarborSafeZone(...t.start,t.radius),false,t.id);}
 for(const r of REGIONS.slice(1))assert.equal(ENCOUNTERS.filter(t=>t.region===r.id).length,({reef:12,redrock:8,fjord:7,mist:7}[r.id]));
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

test('reef kraken is replaced by seven separate sharks while other encounters remain',()=>{
 const reef=ENCOUNTERS.filter(t=>t.region==='reef');
 assert.equal(reef.some(t=>t.type==='octopus'),false);
 const replacements=reef.filter(t=>t.id.startsWith('reef-kraken-shark-'));
 assert.equal(replacements.length,7);
 assert.equal(reef.filter(t=>t.type==='shark').length,8);
 assert.equal(new Set(ENCOUNTERS.map(t=>t.id)).size,ENCOUNTERS.length);
 for(const t of replacements){assert.equal(t.type,'shark');assert.equal(regionAt(...t.start).id,'reef');assert.equal(t.fleeing,true);}
 for(let i=0;i<replacements.length;i++)for(let j=i+1;j<replacements.length;j++){
  const a=replacements[i],b=replacements[j];assert.ok(Math.hypot(a.start[0]-b.start[0],a.start[1]-b.start[1])>a.radius+b.radius);
 }
 assert.equal(ENCOUNTERS.filter(t=>t.type==='octopus').length,3);
});

test('reef excludes visiting kraken bodies but still admits sharks and cancels windup',()=>{
 const reef=REGIONS.find(r=>r.id==='reef').dock;
 for(let x=-190;x<=190;x+=7)for(let z=-190;z<=190;z+=7){
  if(Math.hypot(x,z)<5)continue;
  assert.equal(isReefKrakenExclusion(x,z),regionAt(x,z).id==='reef');
 }
 assert.equal(isEnemyPositionRestricted({type:'octopus',radius:4.5},reef.x,reef.z),true);
 assert.equal(isEnemyPositionRestricted({type:'shark',radius:2.3},reef.x,reef.z),false);
 for(const t of ENCOUNTERS.filter(t=>t.type==='octopus'))assert.equal(isEnemyPositionRestricted(t,...t.start),false,t.id);
 const target={x:reef.x-7,z:reef.z,yaw:0,alive:true};
 stepKrakenCombat(target,reef,0,false);
 const result=stepKrakenCombat(target,reef,1.7,isReefKrakenExclusion(reef.x,reef.z));
 assert.equal(result.engaged,false);assert.equal(result.strike,false);assert.equal(result.hit,false);assert.equal(result.warning,false);
 const neighbor=REGIONS.find(r=>r.id==='fjord').dock;
 const dx=neighbor.x-reef.x,dz=neighbor.z-reef.z,length=Math.hypot(dx,dz);
 const x=(reef.x+neighbor.x)/2+dx/length,z=(reef.z+neighbor.z)/2+dz/length;
 assert.equal(isReefKrakenExclusion(x,z),false);
 assert.equal(isReefKrakenExclusion(x,z,4.5),true,'body must not straddle the reef boundary');
});
