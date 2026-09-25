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

test('upper cliff fade lifts by 15 percent without accumulation and restores outside occlusion',()=>{
 const cut=createCameraOcclusion(),camera=new THREE.PerspectiveCamera();camera.position.set(0,27.2,27);
 const rock=new THREE.Mesh(new THREE.BoxGeometry(20,40,10),new THREE.MeshStandardMaterial());rock.position.set(0,20,14);cut.register(rock);
 const distant=rock.clone();distant.position.x=100;cut.register(distant);
 const target=new THREE.Vector3();
 for(let i=0;i<180;i++)cut.update(camera,null,target,1/60);
 assert.ok(Math.abs(cut.heightMultiplier-1.15)<.0001);
 assert.ok(Math.abs(27.2*cut.heightMultiplier-31.28)<.001);
 assert.equal(cut.uniforms.fadeAmount.value.filter(x=>x>0).length,1);
 for(let i=0;i<180;i++)cut.update(camera,null,target,1/60);
 assert.ok(cut.heightMultiplier<=1.15);
 camera.position.x=100;target.x=100;target.z=100;
 for(let i=0;i<240;i++)cut.update(camera,null,target,1/60);
 assert.equal(cut.heightMultiplier,1);assert.ok(cut.uniforms.fadeAmount.value.every(x=>x===0));
});
