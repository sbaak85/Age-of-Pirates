import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGameShark} from './game-shark.js';
import {populateSharks} from './shark-population.js';
import {ENCOUNTERS,REGIONS,navigable,regionAt,isEnemyPositionRestricted} from './archipelago-data.js';
test('large shark is 50 percent longer, including after animation and batching',()=>{
 const sharks=[0,1].map(sharkVariant=>createGameShark({sharkVariant}));
 const lengths=sharks.map(s=>new THREE.Box3().setFromObject(s.group).getSize(new THREE.Vector3()).x);
 assert.ok(Math.abs(lengths[0]/lengths[1]-1.5)<.001);
 for(const s of sharks){s.animate(.3,'burst');assert.ok(Number.isFinite(s.tail.rotation.y));assert.ok(s.group.getObjectById(s.body.id));}
});
test('random population keeps 6 large / 9 small with clear separated spawns across seeds',()=>{
 const base=ENCOUNTERS.filter(t=>!t.id.startsWith('roaming-shark-'));
 const layouts=[];
 for(let seed=1;seed<=25;seed++){
  let state=seed;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const result=populateSharks(base,{regions:REGIONS,navigable,regionAt,restricted:isEnemyPositionRestricted},random);
  const sharks=result.filter(t=>t.type==='shark');
  assert.equal(sharks.filter(t=>t.sharkVariant===0).length,6);assert.equal(sharks.filter(t=>t.sharkVariant===1).length,9);
  for(const t of sharks){assert.ok(navigable(...t.start,t.radius+2));assert.equal(isEnemyPositionRestricted(t,...t.start),false);assert.equal(regionAt(...t.start).id,t.region);
   for(const other of result.filter(o=>o!==t))assert.ok(Math.hypot(t.start[0]-other.start[0],t.start[1]-other.start[1])>=t.radius+other.radius+4);
  }
  layouts.push(JSON.stringify(sharks.map(t=>t.start)));
 }
 assert.equal(new Set(layouts).size,25);
});
