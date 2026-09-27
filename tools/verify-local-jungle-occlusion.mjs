import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import * as THREE from 'three';import {createCentralJungle} from '../game/central-jungle-model.js';import {createLocalCameraOcclusion} from '../game/local-camera-occlusion.js';
globalThis.fetch=async u=>new Response(await fs.readFile(u));const m=await createCentralJungle();const o=createLocalCameraOcclusion({surfaces:[m.terrain,m.lagoonBones],targets:[m.terrain,m.forest,m.lagoonBones],hullLength:4.774});const camera=new THREE.PerspectiveCamera(43,1.4,.5,1000),render=new THREE.PerspectiveCamera(),ray=new THREE.Raycaster();let blocked=0,bad=[];let ratios=[];
for(const gate of m.gates)for(const t of [.1,.25,.4,.5,.6,.75,.9]){const i=t<.5?0:1,u=t*2-i,a=gate.path[i],b=gate.path[i+1],pos=new THREE.Vector3(THREE.MathUtils.lerp(a[0],b[0],u),.05,THREE.MathUtils.lerp(a[1],b[1],u)),yaw=Math.atan2(-(b[1]-a[1]),b[0]-a[0]);camera.position.copy(pos).add(new THREE.Vector3(23,27.2,27));for(let k=0;k<100;k++)o.update(camera,pos,yaw,.05);render.copy(camera);render.position.y+=camera.position.y*.15*o.amount;o.setView(render,pos);ratios.push(o.diameter/4.774);if(o.blocked){blocked++;for(const [along,side,y] of [[0,0,1.4],[.4,0,1.3],[-.4,0,1.3],[0,.16,1.9],[0,-.16,1.9]]){const p=new THREE.Vector3(pos.x+4.774*(along*Math.cos(yaw)+side*Math.sin(yaw)),pos.y+y,pos.z+4.774*(-along*Math.sin(yaw)+side*Math.cos(yaw)));const d=p.clone().sub(render.position);ray.set(render.position,d.clone().normalize());ray.far=d.length()-.15;for(const hit of ray.intersectObjects([m.terrain,m.lagoonBones],true))if(hit.point.y>=8&&o.coverageAt(hit.point)<.99)bad.push([gate.id,t,hit.point.toArray(),o.coverageAt(hit.point)]);}}}
assert.equal(bad.length,0,'all upper rock intersections covering hull samples must lie inside full reveal core');
assert(blocked>0&&blocked<28,'sweep includes both occluded and clear positions');
assert(Math.max(...ratios)<=10,'diameter never exceeds the requested upper bound');
// Do not remove rock feet, off-axis terrain or the opposite side of the island.
const pos=new THREE.Vector3(13,.05,85);camera.position.copy(pos).add(new THREE.Vector3(23,27.2,27));
for(let k=0;k<100;k++)o.update(camera,pos,0,.05,true);
assert(o.amount>.99);o.setView(camera,pos,{diameter:10,adaptive:false});assert(Math.abs(o.diameter-47.74)<1e-5);
const axis=o.uniforms.localAxis.value,eye=o.uniforms.localEye.value,reach=o.uniforms.localReach.value;
const across=new THREE.Vector3().crossVectors(axis,new THREE.Vector3(0,1,0)).normalize();
const front=eye.clone().addScaledVector(axis,10);assert(o.coverageAt(front)>.99);
assert.equal(o.coverageAt(front.clone().addScaledVector(across,o.diameter)),0,'outside local radius stays opaque');
assert.equal(o.coverageAt(eye.clone().addScaledVector(axis,reach+10)),0,'terrain behind ship stays opaque');
const foot=pos.clone();foot.y=2;assert.equal(o.coverageAt(foot),0,'preserve low rock feet');
const peak=o.heightMultiplier;assert(peak>1.149&&peak<=1.15,'camera lift is exactly 15% at full fade');
for(let k=0;k<100;k++)o.update(camera,pos,0,.05,false);assert.equal(o.amount,0);assert.equal(o.heightMultiplier,1);
const clear=new THREE.Vector3(16,.05,145);camera.position.copy(clear).add(new THREE.Vector3(23,27.2,27));
for(let k=0;k<100;k++)o.update(camera,clear,0,.05,true);assert.equal(o.amount,0,'open water must not trigger cliff fading');
console.log({pass:true,positions:28,blockedCases:blocked,rangeInShipLengths:[Math.min(...ratios),Math.max(...ratios)],uncoveredUpperRockHits:bad.length,fixedTenLengthDiameter:47.74,maxHeightMultiplier:peak});
o.dispose();
