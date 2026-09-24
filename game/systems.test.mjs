import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { batchStatic } from './optimization.js';
import { WEAPONS, normalizeLoadout, weaponForSide } from './weapons.js';
import { createVolley, dueVolleyShots } from './physics.js';

test('mixed broadsides resolve independently and malformed saves recover',()=>{
  const loadout=normalizeLoadout({port:'long',starboard:'heavy'});
  assert.equal(weaponForSide(loadout,-1).speed,30);
  assert.equal(weaponForSide(loadout,1).damage,34);
  assert.deepEqual(normalizeLoadout({port:'toString',starboard:'missing'}),{port:'standard',starboard:'standard'});
  assert.equal(normalizeLoadout(null).port,'standard');
});
test('heavy cannon retains four-shot rhythm while extending reload',()=>{
  const volley=createVolley(0,1,WEAPONS.heavy);
  assert.deepEqual(dueVolleyShots(volley,.61),[0,1,2]);
  assert.deepEqual(dueVolleyShots(volley,.9),[3]);
  assert.ok(Math.abs(volley.reloadUntil-5.6)<1e-6);
  assert.equal(volley.weapon.speed,15);
});
test('static batching preserves world bounds and leaves animated parts intact',()=>{
  const root=new THREE.Group();root.position.set(4,2,8);root.rotation.y=.7;root.scale.setScalar(.72);
  const material=new THREE.MeshStandardMaterial({color:0x765432});
  for(let i=0;i<10;i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,2,3),material);mesh.position.set(i,0,i*.2);root.add(mesh);}
  const moving=new THREE.Group();moving.userData.dynamic=true;root.add(moving);
  const cannon=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);moving.add(cannon);
  const before=new THREE.Box3().setFromObject(root,true),counts=batchStatic(root),after=new THREE.Box3().setFromObject(root,true);
  assert.equal(counts.before,10);assert.equal(counts.after,1);
  assert.equal(cannon.parent,moving);
  assert.ok(before.min.distanceTo(after.min)<1e-5);assert.ok(before.max.distanceTo(after.max)<1e-5);
});
