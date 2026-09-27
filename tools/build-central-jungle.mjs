// Offline implicit sculpt. All cliffs, cave tunnels and bridges share one surface.
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {MeshoptSimplifier} from '../archive/beast-skull/2026-09-26/tools/vendor/meshoptimizer/meshopt_simplifier.js';
import {JUNGLE_GATES,JUNGLE_BRIDGES} from '../game/central-jungle-layout.js';
const out=new URL('../game/assets/central-jungle/',import.meta.url);await fs.mkdir(out,{recursive:true});
const smooth=(a,b,k)=>{const h=Math.max(0,Math.min(1,.5+.5*(b-a)/k));return b*(1-h)+a*h-k*h*(1-h);};
const lobes=[[-20,-80,38,26,62],[-62,-58,28,32,34],[-86,-10,24,32,47],[-73,36,30,24,20],[-44,70,40,29,39],[8,83,29,26,29],[52,69,33,29,54],[80,19,24,42,28],[70,-31,25,36,51],[34,-70,39,22,22]];
const segments=[];
for(const bridge of JUNGLE_BRIDGES){const points=Array.from({length:13},(_,i)=>{const t=i/12;return [bridge.a[0]*(1-t)+bridge.b[0]*t,1+Math.sin(Math.PI*t)*bridge.height,bridge.a[1]*(1-t)+bridge.b[1]*t];});for(let i=0;i<12;i++)segments.push([points[i],points[i+1],4.1+1.6*Math.abs(i/6-1)]);}
function capsule(x,y,z,a,b,r){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy+(z-a[2])*dz)/(dx*dx+dy*dy+dz*dz)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy,z-a[2]-t*dz)-r;}
function field(x,y,z){
 let f=999;
 for(const [cx,cz,rx,rz,h] of lobes){
  const terrace=1-Math.max(0,y)*.004+Math.sin(y*.36+cx)*.024;
  const angle=cx*.023,dx=x-cx,dz=z-cz;
  const u=(dx*Math.cos(angle)-dz*Math.sin(angle))/(rx*terrace),v=(dx*Math.sin(angle)+dz*Math.cos(angle))/(rz*terrace);
  const q=Math.pow(Math.abs(u),2.6)+Math.pow(Math.abs(v),2.6);
  const side=(Math.pow(q,1/2.6)-1)*Math.min(rx,rz)+Math.sin(x*.14+z*.08)*1.8+Math.sin(z*.25-x*.1)*1.1;
  const roof=h-8*(u*u+v*v)+Math.sin(x*.085+cz)*5+Math.cos(z*.14+cx)*3;
  f=smooth(f,Math.max(side,y-roof,-6-y),5);
 }
 for(const [cx,cz,rx,rz,h] of [[0,3,17,28,1.5],[-8,-18,14,14,2.5],[8,16,13,16,1]]){
  const d=(Math.hypot((x-cx)/rx,(z-cz)/rz)-1)*Math.min(rx,rz);f=smooth(f,Math.max(d,y-h,-5-y),3);
 }
 for(const [a,b,r] of segments)f=smooth(f,capsule(x,y,z,a,b,r),3.2);
 for(const gate of JUNGLE_GATES){let tunnel=999;for(let i=0;i<gate.path.length-1;i++){
  const a=gate.path[i],b=gate.path[i+1],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
  const d=(Math.hypot(Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)/gate.halfWidth,(y-1)/gate.height)-1)*gate.halfWidth;tunnel=smooth(tunnel,d,2);
 }f=Math.max(f,-tunnel);}
 return f;
}
const resolution=150,mc=new MarchingCubes(resolution,new THREE.MeshBasicMaterial(),false,false,500000);mc.isolation=0;
for(let z=0;z<resolution;z++)for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++)mc.field[x+y*resolution+z*resolution*resolution]=-field(x/resolution*280-140,y/resolution*100-12,z/resolution*280-140);
mc.update();const raw=new THREE.BufferGeometry(),positions=mc.geometry.attributes.position.array.slice(0,mc.count*3);
for(let i=0;i<positions.length;i+=3){positions[i]*=140;positions[i+1]=positions[i+1]*50+38;positions[i+2]*=140;}
raw.setAttribute('position',new THREE.BufferAttribute(positions,3));const welded=mergeVertices(raw,.001);await MeshoptSimplifier.ready;
const [indices,error]=MeshoptSimplifier.simplify(new Uint32Array(welded.index.array),welded.attributes.position.array,3,4980*3,.04,[]);
const [remap,count]=MeshoptSimplifier.compactMesh(indices),compact=new Float32Array(count*3);
for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff)compact.set(welded.attributes.position.array.subarray(i*3,i*3+3),remap[i]*3);
await fs.writeFile(new URL('terrain.positions.bin',out),Buffer.from(compact.buffer));await fs.writeFile(new URL('terrain.indices.bin',out),Buffer.from(indices.buffer));
const size=256,mask=new Uint8Array(size*size);for(let z=0;z<size;z++)for(let x=0;x<size;x++)mask[x+z*size]=field(x/(size-1)*280-140,-.8,z/(size-1)*280-140)<0?255:0;
await fs.writeFile(new URL('coast.bin',out),mask);
const meta={triangles:indices.length/3,vertices:count,sourceTriangles:mc.count/3,simplificationError:error,continuousTerrain:true,bridges:3,caves:4,bounds:280,maskSize:size};await fs.writeFile(new URL('terrain.json',out),JSON.stringify(meta,null,2));console.log(meta);
