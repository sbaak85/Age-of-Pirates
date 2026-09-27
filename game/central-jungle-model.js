import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createBeastSkull} from './beast-skull-model.js';
import {createLagoonBones} from './lagoon-bones.js';
import {JUNGLE_LAYOUT as L,JUNGLE_GATES} from './central-jungle-layout.js';

export async function createCentralJungle(){
 const root=new THREE.Group();root.name='Central jungle · continuous eroded massif';
 const terrain=new THREE.Group(),roofs=new THREE.Group(),forest=new THREE.Group(),details=new THREE.Group();root.add(terrain,roofs,forest,details);
 let seed=629;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
 const rockMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96,flatShading:true});
 rockMat.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 cliffP;').replace('#include <begin_vertex>','#include <begin_vertex>\ncliffP=(modelMatrix*vec4(position,1.)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 cliffP;').replace('#include <color_fragment>',`#include <color_fragment>
float band=sin(cliffP.y*.75+sin(cliffP.x*.09)*1.5+sin(cliffP.z*.12));
float stain=sin(cliffP.x*.53+sin(cliffP.z*.4))*sin(cliffP.y*.83+cliffP.z*.23);
diffuseColor.rgb*=.87+.1*band+.08*stain;`);
 };rockMat.customProgramCacheKey=()=> 'jungle-rock-strata-v1';
 const barkMat=new THREE.MeshStandardMaterial({color:0x4c5140,roughness:1});
 const canopyMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,flatShading:true});
 const leafMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.88,side:THREE.DoubleSide});
 const stone=new THREE.MeshStandardMaterial({color:0x8b9470,roughness:1,flatShading:true});
 const trunkParts=[],crownInstances=[],leafInstances=[],boulderInstances=[];
 const dummy=new THREE.Object3D();
 function mesh(geometry,material,parent){const m=new THREE.Mesh(geometry,material);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 const polar=(a,r,y=0)=>[Math.cos(a)*r,y,Math.sin(a)*r];
 function coloredGeometry(vertices,indices){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(new THREE.BufferAttribute(new Uint32Array(indices),1));g.computeVertexNormals();
  const colors=[],n=g.attributes.normal;
  for(let i=0;i<vertices.length;i+=3){const y=vertices[i+1],up=n.getY(i/3),c=new THREE.Color(y<2?0x9c9b7a:0x788375);if(y>2)c.lerp(new THREE.Color(0x4e7049),THREE.MathUtils.smoothstep(up,.25,.9));c.multiplyScalar(.92+rand()*.14);colors.push(c.r,c.g,c.b);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;
 }
 const base=new URL('./assets/central-jungle/',import.meta.url);
 const read=async name=>{const r=await fetch(new URL(name,base));if(!r.ok)throw new Error(name);return r;};
 const metadata=await (await read('terrain.json')).json();
 const positions=new Float32Array(await (await read('terrain.positions.bin')).arrayBuffer());
 const indices=new Uint32Array(await (await read('terrain.indices.bin')).arrayBuffer());
 const land=mesh(coloredGeometry(positions,indices),rockMat,terrain);land.name='Continuous cliffs · four caves · three stone bridges';
 const coast=new THREE.DataTexture(new Uint8Array(await (await read('coast.bin')).arrayBuffer()),256,256,THREE.RedFormat);coast.minFilter=coast.magFilter=THREE.LinearFilter;coast.needsUpdate=true;
 const skull=await createBeastSkull();skull.root.rotation.y=-Math.PI/2;skull.root.position.z=12;skull.habitat.visible=false;skull.foliage.visible=false;root.add(skull.root);skull.root.updateMatrixWorld(true);
 land.updateMatrixWorld(true);
 const ray=new THREE.Raycaster();
 function surface(x,z){ray.set(new THREE.Vector3(x,90,z),new THREE.Vector3(0,-1,0));return ray.intersectObject(land)[0];}
 function branch(points,radius){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),g=new THREE.TubeGeometry(curve,8,radius,6,false);trunkParts.push(g);
 }
 function matrix(x,y,z,sx,sy,sz,ry=0,rz=0){dummy.position.set(x,y,z);dummy.rotation.set(0,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();return dummy.matrix.clone();}
 const leafGeometry=(()=>{
  const p=[],idx=[];
  for(let j=0;j<=10;j++){const t=j/10,w=Math.pow(Math.sin(Math.PI*t),.7)*.23;
   for(const side of [-1,0,1])p.push(t,Math.sin(t*Math.PI)*.23-t*t*.22+(side===0?.025:0),w*side*(1+.1*Math.sin(t*47)));
   if(j<10){const k=j*3;idx.push(k,k+3,k+1,k+1,k+3,k+4,k+1,k+4,k+2,k+2,k+4,k+5);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
 })();
 function tree(x,y,z,height,palm=false){
  const firstPart=trunkParts.length;
  const lean=(rand()-.5)*3,top=[x+lean,y+height,z+.6];
  branch([[x,y,z],[x+lean*.3,y+height*.55,z],top],palm?.35:.65);
  if(!palm)for(let k=0;k<5;k++){const a=k*Math.PI*2/5;branch([[x+Math.cos(a)*2.8,y-.3,z+Math.sin(a)*2.8],[x+Math.cos(a),y+1.2,z+Math.sin(a)],[x,y+3,z]],.22);}
  if(palm){for(let k=0;k<10;k++){const a=k*Math.PI*.2;leafInstances.push({matrix:matrix(...top,5+rand()*2,5,5,a),color:0x477950});}}
  else {
   const colors=[0x245e46,0x3c7550,0x568652,0x729858];
   for(let k=0;k<7;k++){const a=k*2.4,r=k===0?0:3.1;
    const tx=top[0]+Math.cos(a)*r,tz=top[2]+Math.sin(a)*r,ty=top[1]+Math.sin(k*3)*1.2;
    crownInstances.push({matrix:matrix(tx,ty,tz,3.5+rand()*1.4,1.8+rand(),3.3+rand(),a),color:colors[k%4]});
    if(k>0)branch([[x,y+height*.7,z],[tx,ty-.6,tz]],.18);
    for(let m=0;m<4;m++)leafInstances.push({matrix:matrix(tx,ty+.4,tz,3.5,3.5,3.5,m*Math.PI/2+a),color:colors[(k+1)%4]});
   }
  }
  for(let i=0;i<3;i++)crownInstances.push({matrix:matrix(x+(rand()-.5)*5,y+.8+rand(),z+(rand()-.5)*5,1.5+rand()*1.2,.9,1.7+rand(),rand()*6),color:0x42764a});
  const parts=trunkParts.splice(firstPart);const g=mergeGeometries(parts);mesh(g,barkMat,forest).name=palm?'Palm trunk':'Buttress tree';parts.forEach(p=>p.dispose());
 }
 // Vegetation follows the sculpted surface, clustered rather than evenly spaced.
 const planted=[];
 for(let i=0;i<1400&&planted.length<130;i++){
  if(i%24===0)await new Promise(resolve=>setTimeout(resolve,0));
  const x=(rand()-.5)*214,z=(rand()-.5)*207,hit=surface(x,z);
  if(!hit||hit.point.y<5||hit.face.normal.y<.45||Math.hypot(x,z)<31)continue;
  if(planted.some(p=>Math.hypot(x-p[0],z-p[1])<5))continue;
  if(Math.sin(x*.1+z*.12)>.65&&rand()<.65)continue;
  planted.push([x,z]);tree(x,hit.point.y-.2,z,5+rand()*10,rand()<.24);
 }
 // Replace the old dense fossil foliage batches with budgeted preview plants.
 for(const [x,z,h] of [[-9,-11,7],[11,-9,9],[-7,-21,8],[8,-23,6]]){const hit=surface(x,z);if(hit)tree(x,hit.point.y,z,h,true);}
 const fossilRay=new THREE.Raycaster();
 for(let i=0;i<45;i++){const x=(rand()-.5)*24,z=-25+rand()*45;fossilRay.set(new THREE.Vector3(x,60,z),new THREE.Vector3(0,-1,0));const hit=fossilRay.intersectObject(skull.fossil,true)[0];if(!hit||hit.face.normal.y<.3)continue;for(let k=0;k<7;k++)leafInstances.push({matrix:matrix(x,hit.point.y+.05,z,.6+rand()*.8,1,1,k*.9),color:0x496c36});}
 // Fern colonies on low shelves and creeping greenery on the stone bridges.
 for(let i=0;i<650;i++){
  if(i%24===0)await new Promise(resolve=>setTimeout(resolve,0));
  const x=(rand()-.5)*214,z=(rand()-.5)*212,hit=surface(x,z);
  if(!hit||hit.point.y<0||hit.face.normal.y<.5||Math.hypot(x,z)<24)continue;
  for(let k=0;k<7;k++)leafInstances.push({matrix:matrix(x,hit.point.y+.12,z,1.3+rand()*1.8,2,2,k*.9),color:k%2?0x567d40:0x2d653d});
 }
 function instances(geometry,material,list,parent){
  const m=new THREE.InstancedMesh(geometry,material,list.length);list.forEach((v,i)=>{m.setMatrixAt(i,v.matrix);m.setColorAt(i,new THREE.Color(v.color));});m.castShadow=m.receiveShadow=true;m.computeBoundingSphere();parent.add(m);return m;
 }
 instances(new THREE.IcosahedronGeometry(1,1),canopyMat,crownInstances,forest);
 instances(leafGeometry,leafMat,leafInstances,forest);
 const lagoonBones=createLagoonBones(skull.plainBone);root.add(lagoonBones);
 root.updateMatrixWorld(true);
 return {root,terrain,roofs,forest,details,skull,lagoonBones,coast,metadata,gates:JUNGLE_GATES,layout:L,update(){}};
}

