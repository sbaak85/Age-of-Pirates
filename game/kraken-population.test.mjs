import test from 'node:test';
import assert from 'node:assert/strict';
import {KRAKEN_SPAWNS,KRAKEN_EXCLUSION_ZONES,isKrakenExclusion,insideKrakenZone,scheduleKrakenRespawn,respawnKrakens} from './kraken-population.js';
import {ENCOUNTERS,navigable,isEnemyPositionRestricted} from './archipelago-data.js';

const slots=()=>ENCOUNTERS.filter(t=>t.type==='octopus').map(t=>({...t,anchorX:t.start[0],anchorZ:t.start[1],x:t.start[0],z:t.start[1],health:t.hp,alive:true,model:{loaded:false}}));
function kill(t,time){t.alive=false;t.health=0;t.x=77;t.z=88;t.melee={engaged:true};scheduleKrakenRespawn(t,time);}

test('exactly four authored kraken origins have clear water and avoid the circled lagoons',()=>{
 const population=slots();assert.equal(population.length,4);
 assert.equal(new Set(population.map(t=>t.id)).size,4);
 for(const spawn of KRAKEN_SPAWNS){
  const t=population.find(t=>t.id===spawn.id);assert.deepEqual(t.start,spawn.start);
  assert.ok(navigable(...t.start,t.radius+7),t.id);
  assert.equal(isEnemyPositionRestricted(t,...t.start),false,t.id);
 }
});
test('yellow boundaries exclude an entire kraken body without banning the marked south origin',()=>{
 assert.equal(isKrakenExclusion(118,-55),true);assert.equal(isKrakenExclusion(-91,92),true);
 assert.equal(isKrakenExclusion(-2,138,4.5),false);
 for(const zone of KRAKEN_EXCLUSION_ZONES){
  for(const [x,z] of zone.points)assert.equal(insideKrakenZone(zone,x,z,4.5),true);
  const [ax,az]=zone.points[0],[bx,bz]=zone.points[1],dx=bx-ax,dz=bz-az,d=Math.hypot(dx,dz),mx=(ax+bx)/2,mz=(az+bz)/2;
  const outside=[1,-1].map(s=>[mx+s*dz/d*2,mz-s*dx/d*2]).find(([x,z])=>!insideKrakenZone(zone,x,z));
  assert.ok(outside);assert.equal(insideKrakenZone(zone,...outside,4.5),true);
 }
});
test('a killed slot respawns once at exactly 90 gameplay seconds even while streamed out',()=>{
 const population=slots(),t=population[0];kill(t,7);
 scheduleKrakenRespawn(t,12);assert.equal(t.respawnAt,97,'duplicate events cannot delay respawn');
 assert.deepEqual(respawnKrakens(population,96.999),[]);
 assert.deepEqual(respawnKrakens(population,97),[t]);
 assert.equal(t.health,t.hp);assert.deepEqual([t.x,t.z],t.start);assert.equal(t.melee,null);
 assert.equal(t.respawnAt,null);assert.equal(t.sinkAt,null);
 assert.deepEqual(respawnKrakens(population,98),[]);assert.equal(population.filter(t=>t.alive).length,4);
});
test('independent timers, repeated deaths and voyage resets never create extra kraken records',()=>{
 const population=slots(),ids=population.map(t=>t.id);kill(population[0],0);kill(population[1],5);
 assert.deepEqual(respawnKrakens(population,90),[population[0]]);
 assert.equal(population.filter(t=>t.alive).length,3);
 assert.deepEqual(respawnKrakens(population,95),[population[1]]);
 for(let cycle=0;cycle<8;cycle++){
  const now=100+cycle*91;population.forEach(t=>kill(t,now));
  assert.equal(respawnKrakens(population,now+90).length,4);
  assert.equal(population.length,4);assert.deepEqual(population.map(t=>t.id),ids);
 }
 kill(population[0],900);population[0].alive=true;population[0].respawnAt=null;
 assert.deepEqual(respawnKrakens(population,990),[]);
 const ship={type:'ship',alive:false};scheduleKrakenRespawn(ship,0);assert.equal(ship.respawnAt,undefined);
});
