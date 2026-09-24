import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCameraOcclusion} from './camera-occlusion.js';
test('scenery patches are shared, isolated from ships, and reusable by streamed instances',()=>{
 const cut=createCameraOcclusion(),original=new THREE.MeshStandardMaterial(),g=new THREE.Group();
 const a=new THREE.Mesh(new THREE.BoxGeometry(),original),b=new THREE.InstancedMesh(a.geometry,original,2);g.add(a,b);cut.attach(g);
 assert.notEqual(a.material,original);assert.equal(a.material,b.material);assert.equal(original.transparent,false);assert.equal(a.material.transparent,false);assert.equal(a.material.depthWrite,true);
 const first=a.material;cut.attach(g);assert.equal(a.material,first);
 const next=new THREE.Mesh(a.geometry,original);cut.attach(next);assert.equal(next.material,first);cut.dispose();
});
test('cutaway tracks projected ship position across pixel ratios and fades when disabled',()=>{
 const cut=createCameraOcclusion(),camera=new THREE.PerspectiveCamera(54,16/9,.1,240);camera.position.set(23,34,-38);camera.lookAt(0,0,-65);
 const target=new THREE.Vector3(0,.4,-65),renderer={getDrawingBufferSize:v=>v.set(1280,720)};
 for(let i=0;i<60;i++)cut.update(camera,renderer,target,1/60);
 assert.ok(cut.uniforms.cutStrength.value>.99);const centre=cut.uniforms.cutCenter.value.clone(),radius=cut.uniforms.cutRadius.value.clone();
 assert.ok(centre.x>0&&centre.x<1280&&centre.y>0&&centre.y<720);assert.ok(radius.x>0&&radius.y>radius.x);
 renderer.getDrawingBufferSize=v=>v.set(2560,1440);cut.update(camera,renderer,target,1/60);assert.ok(cut.uniforms.cutCenter.value.distanceTo(centre.multiplyScalar(2))<1e-6);assert.ok(cut.uniforms.cutRadius.value.distanceTo(radius.multiplyScalar(2))<1e-6);
 for(let i=0;i<60;i++)cut.update(camera,renderer,target,1/60,false);assert.ok(cut.uniforms.cutStrength.value<.001);
});
