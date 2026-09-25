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

test('open arch and nearby side walls do not fade merely because their bounds cross the sightline',()=>{
 const cut=createCameraOcclusion(),root=new THREE.Group(),material=new THREE.MeshStandardMaterial();
 for(const [x,y,w,h] of [[-8,12,3,24],[8,12,3,24],[0,25,19,3]]){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,4),material);mesh.position.set(x,y,14);root.add(mesh);
 }
 cut.register(root);root.clear(); // Same removal performed by regional consolidation.
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,27.2,27);
 for(let i=0;i<120;i++)cut.update(camera,null,new THREE.Vector3(),1/60);
 assert.equal(cut.heightMultiplier,1);assert.ok(cut.uniforms.fadeAmount.value.every(x=>x===0));
});
test('instanced transformed walls still occlude after their render group is consolidated',()=>{
 const cut=createCameraOcclusion(),root=new THREE.Group();root.position.x=7;
 const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(10,40,4),new THREE.MeshStandardMaterial(),1);
 mesh.setMatrixAt(0,new THREE.Matrix4().makeTranslation(-7,20,14));root.add(mesh);cut.register(root);root.clear();
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,27.2,27);
 for(let i=0;i<4;i++)cut.update(camera,null,new THREE.Vector3(),1/60);
 assert.equal(cut.heightMultiplier,1,'brief edge contact must not trigger');
 for(let i=0;i<120;i++)cut.update(camera,null,new THREE.Vector3(),1/60);
 assert.ok(cut.heightMultiplier>1.149);
});
test('geometry behind the boat never triggers foreground fading',()=>{
 const cut=createCameraOcclusion(),wall=new THREE.Mesh(new THREE.BoxGeometry(20,40,4),new THREE.MeshStandardMaterial());wall.position.set(0,20,-12);cut.register(wall);
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,27.2,27);
 for(let i=0;i<120;i++)cut.update(camera,null,new THREE.Vector3(),1/60);
 assert.equal(cut.heightMultiplier,1);
});
