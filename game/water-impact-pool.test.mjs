import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WaterImpactPool } from './water-impact-pool.js';

test('water volleys have bounded allocation, expire and clear on restart',()=>{
  const scene=new THREE.Scene(),pool=new WaterImpactPool(scene),count=scene.children.length;
  for(let i=0;i<30;i++)pool.spawn(i,.1,-i);
  assert.equal(pool.slots.filter(s=>s.active).length,6);assert.equal(scene.children.length,count);
  const camera=new THREE.PerspectiveCamera();camera.position.set(4,12,20);
  pool.update(.45,camera);assert.ok(pool.slots.every(s=>s.effect.group.visible));
  pool.update(2,camera);assert.ok(pool.slots.every(s=>!s.active&&!s.effect.group.visible));
  pool.spawn(0,0,0);pool.update(.1,camera);pool.clear();assert.ok(pool.slots.every(s=>!s.active&&!s.effect.group.visible));
});
test('water mist follows translated impact and stays stable when paused',()=>{
  const pool=new WaterImpactPool(new THREE.Scene(),1),camera=new THREE.PerspectiveCamera();camera.position.set(15,9,20);
  pool.spawn(9,.2,-4);pool.update(.45,camera);
  const slot=pool.slots[0],group=slot.effect.group,volume=group.children.find(m=>m.material?.uniforms?.uEye);
  assert.ok(volume.material.uniforms.uEye.value.distanceTo(camera.position.clone().sub(group.position))<1e-8);
  const foam=group.children.find(m=>m.isInstancedMesh&&m.count===64),before=Array.from(foam.instanceMatrix.array);
  pool.update(0,camera);assert.equal(slot.age,.45);assert.deepEqual(Array.from(foam.instanceMatrix.array),before);
  pool.spawn(-5,0,8);pool.update(.45,camera);assert.notDeepEqual(Array.from(foam.instanceMatrix.array),before);
  assert.ok(foam.instanceMatrix.array.every(Number.isFinite));
});
