import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CombatExplosions, targetExplosionSize } from './combat-explosions.js';

test('combat pools remain bounded through repeated volleys and kills',()=>{
  const scene=new THREE.Scene(),fx=new CombatExplosions(scene),count=scene.children.length;
  for(let i=0;i<30;i++){fx.spawn('impact',i,1,2);fx.spawn('kill',-i,1.1,4);}
  assert.equal(fx.slots.filter(s=>s.active&&s.kind==='impact').length,8);
  assert.equal(fx.slots.filter(s=>s.active&&s.kind==='kill').length,3);
  assert.equal(scene.children.length,count);
  const camera=new THREE.PerspectiveCamera();camera.position.set(10,10,15);
  fx.update(.5,camera);assert.equal(fx.lights.filter(l=>l.intensity>0).length,2);
  fx.update(5,camera);assert.ok(fx.slots.every(s=>!s.active&&!s.group.visible));
  assert.ok(fx.lights.every(l=>l.intensity===0));
});

test('translated impacts use local camera and clip transforms; pause and reset are safe',()=>{
  const fx=new CombatExplosions(new THREE.Scene()),camera=new THREE.PerspectiveCamera(54,1,.1,240);
  camera.position.set(11,9,20);camera.lookAt(7,2,5);
  fx.spawn('impact',7,2,5);fx.update(.3,camera);
  const s=fx.slots.find(s=>s.active),u=s.volume.material.uniforms;
  assert.equal(s.group.scale.x,4.5);
  assert.ok(u.uEye.value.distanceTo(camera.position.clone().sub(s.group.position).divideScalar(4.5))<1e-8);
  assert.ok(new THREE.Vector3(0,.65,0).applyMatrix4(s.group.matrixWorld).distanceTo(new THREE.Vector3(7,2,5))<1e-8);
  const expected=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(s.group.matrixWorld);
  assert.deepEqual(u.uToClip.value.elements,expected.elements);
  assert.match(s.volume.material.fragmentShader,/gl_FragDepth=clip.z/);
  fx.update(0,camera);assert.equal(s.age,.3);
  fx.clear();assert.ok(fx.slots.every(s=>!s.active&&!s.group.visible));
});

test('kill fireball fits world target bounds and pool reuse resets scale',()=>{
  const parent=new THREE.Group(),model=new THREE.Mesh(new THREE.BoxGeometry(4,3,12));parent.add(model);parent.position.set(8,2,-5);parent.scale.setScalar(2);
  const fit=targetExplosionSize(model);assert.equal(fit.scale,4);assert.deepEqual(fit.center.toArray(),[8,2,-5]);
  const fx=new CombatExplosions(new THREE.Scene());fx.spawn('kill',8,2,-5,fit.scale);const slot=fx.slots.find(s=>s.active);assert.equal(slot.group.scale.x,4);
  fx.clear();fx.spawn('kill',0,1,0,.5);assert.equal(slot.group.scale.x,2);
});


test('small kill targets retain a large baseline while larger targets keep growing',()=>{
  for(const [width,expected] of [[.3,2],[6,2],[12,2],[18,3],[30,5]]){
    const model=new THREE.Mesh(new THREE.BoxGeometry(width,width*.5,width*.7));
    assert.equal(targetExplosionSize(model).scale,expected);
    model.geometry.dispose();model.material.dispose();
  }
});
