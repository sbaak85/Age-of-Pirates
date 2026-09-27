import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {rollKillTreasure,chestRewards} from './treasure.js';
import {spawnChest} from './feedback.js';

test('kill drop roll has a strict 20 percent boundary and doubles both currencies once',()=>{
 let golden=0;
 for(let i=0;i<1000;i++){
  const loot=rollKillTreasure(49,5,()=>i/1000);golden+=Number(loot.golden);
  assert.deepEqual(chestRewards({rewards:loot}),loot);
  assert.equal(loot.gold,loot.golden?98:49);assert.equal(loot.parts,loot.golden?10:5);
 }
 assert.equal(golden,200);
 assert.equal(rollKillTreasure(49,5,()=>.199999).golden,true);
 assert.equal(rollKillTreasure(49,5,()=>.2).golden,false);
});
test('authored scene chests keep their single-currency rewards',()=>{
 assert.deepEqual(chestRewards({kind:'parts',reward:6}),{gold:0,parts:6});
 assert.deepEqual(chestRewards({kind:'gold',reward:42}),{gold:42,parts:0});
});
test('all spawned chests settle at 1.2 times the original dimensions and gold stays visually distinct',()=>{
 const scene=new THREE.Scene(),regular=spawnChest(scene,0,0,0),gold=spawnChest(scene,4,0,0,{golden:true}),placed=spawnChest(scene,8,0,0);
 for(const t of [.1,.5,1,5,50])for(const chest of [regular,gold,placed]){
  chest.update(t);assert.ok(Number.isFinite(chest.group.position.y));
  if(t>=1)for(const axis of ['x','y','z'])assert.ok(Math.abs(chest.group.scale[axis]-1.2)<1e-9);
 }
 assert.equal(scene.children.length,3);
 assert.equal(gold.group.userData.sparks.length,6);
 assert.ok(gold.group.children[0].material.emissiveIntensity>0);
 assert.notEqual(regular.group.children[0].material,gold.group.children[0].material);
 assert.equal(regular.group.userData.sparks,undefined);
});
