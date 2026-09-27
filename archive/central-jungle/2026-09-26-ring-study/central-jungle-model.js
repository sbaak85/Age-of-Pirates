import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createBeastSkull} from './beast-skull-model.js';
import {JUNGLE_LAYOUT as L,JUNGLE_GATES} from './central-jungle-layout.js';

export async function createCentralJungle(){
 const root=new THREE.Group();root.name='Central jungle · independent layout study';
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
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
  const colors=[],n=g.attributes.normal;
  for(let i=0;i<vertices.length;i+=3){const y=vertices[i+1],up=n.getY(i/3),c=new THREE.Color(up>.45&&y>2?0x648357:y<2?0xada986:0x607a71);c.multiplyScalar(.82+.14*Math.sin(y*.8)+rand()*.12);colors.push(c.r,c.g,c.b);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;
 }
 function ringSector(a0,a1,inner,outer,height,shelf=false){
  const segments=28,layers=7,vertices=[],indices=[];
  for(let j=0;j<=layers;j++)for(let i=0;i<=segments;i++){
   const a=THREE.MathUtils.lerp(a0,a1,i/segments),t=j/layers,noise=Math.sin(a*13)*1.8+Math.sin(a*29+.7)*.7;
   const r=THREE.MathUtils.lerp(inner,outer,t)+noise*Math.sin(Math.PI*t);
   const profile=shelf?Math.sin(Math.PI*t)*height:Math.pow(Math.sin(Math.PI*t),.3)*(height+Math.sin(a*9)*4+Math.sin(a*19)*2);
   vertices.push(...polar(a,r,-2+profile));
   if(j<layers&&i<segments){const b=j*(segments+1)+i;indices.push(b,b+1,b+segments+1,b+1,b+segments+2,b+segments+1);}
  }
  return mesh(coloredGeometry(vertices,indices),rockMat,terrain);
 }
 for(let q=0;q<4;q++){
  const start=q*Math.PI/2+.19,end=(q+1)*Math.PI/2-.19;
  ringSector(start,end,L.innerRadius,L.outerRadius,34+q*2);
  ringSector(start+.06,end-.06,55,L.innerRadius+6,6,true);
 }
 // Each cave is a hollow, thick barrel vault with open water at both ends.
 for(const gate of JUNGLE_GATES){
  const group=new THREE.Group();group.name=gate.name;group.position.set(gate.x*L.caveRadius,0,gate.z*L.caveRadius);group.rotation.y=Math.atan2(gate.x,gate.z);roofs.add(group);
  const vertices=[],indices=[],arcs=20,depths=8,row=arcs+1,plane=(depths+1)*row;
  for(let side=0;side<2;side++)for(let d=0;d<=depths;d++)for(let a=0;a<=arcs;a++){
   const theta=a/arcs*Math.PI,z=(d/depths-.5)*L.caveDepth,w=side?22:L.caveHalfWidth,h=side?34:L.caveHeight;
   const rough=side?Math.sin(theta*9+d*.8)*.7:Math.sin(theta*7+d*.6)*.28;
   vertices.push(Math.cos(theta)*(w+rough),-2+Math.sin(theta)*(h+rough),z);
  }
  for(let side=0;side<2;side++)for(let d=0;d<depths;d++)for(let a=0;a<arcs;a++){
   const k=side*plane+d*row+a,quad=[k,k+row,k+1,k+1,k+row,k+row+1];
   if(side===0)for(let i=0;i<quad.length;i+=3)[quad[i+1],quad[i+2]]=[quad[i+2],quad[i+1]];
   indices.push(...quad);
  }
  for(const d of [0,depths])for(let a=0;a<arcs;a++){
   const k=d*row+a,quad=[k,k+1,k+plane,k+1,k+plane+1,k+plane];
   if(d===0)for(let i=0;i<quad.length;i+=3)[quad[i+1],quad[i+2]]=[quad[i+2],quad[i+1]];
   indices.push(...quad);
  }
  const arch=mesh(coloredGeometry(vertices,indices),rockMat,group);arch.material=rockMat.clone();arch.material.side=THREE.DoubleSide;arch.material.onBeforeCompile=rockMat.onBeforeCompile;arch.material.customProgramCacheKey=rockMat.customProgramCacheKey;
 }
 const skull=await createBeastSkull();skull.root.rotation.y=-Math.PI/2;skull.root.position.z=12;root.add(skull.root);

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
 }
 // Vegetated cave roofs join the forest canopy across each gateway.
 for(const gate of JUNGLE_GATES)for(let i=0;i<15;i++){
  const across=(rand()-.5)*31,along=(rand()-.5)*34,r=L.caveRadius+along;
  const x=gate.x*r+gate.z*across,z=gate.z*r-gate.x*across,y=-3+34*Math.sqrt(1-(across/22)**2);
  tree(x,y,z,5+rand()*8,i%6===0);
 }
 for(let q=0;q<4;q++){
  // Dense crowns at the perimeter; low inner shore keeps the central sightline open.
  for(let i=0;i<25;i++){
   const a=q*Math.PI/2+.28+rand()*(Math.PI/2-.56),r=72+rand()*18;
   const t=(r-L.innerRadius)/(L.outerRadius-L.innerRadius),y=-2+Math.pow(Math.sin(Math.PI*t),.3)*(34+q*2+Math.sin(a*9)*4+Math.sin(a*19)*2);
   tree(Math.cos(a)*r,y,Math.sin(a)*r,7+rand()*10,i%5===0);
  }
  for(let i=0;i<17;i++){
   const a=q*Math.PI/2+.3+rand()*(Math.PI/2-.6),r=59+rand()*5;
   const y=-2+Math.sin(Math.PI*(r-55)/(L.innerRadius+6-55))*6;
   if(i%4===0)tree(Math.cos(a)*r,y,Math.sin(a)*r,7+rand()*5,true);
   for(let k=0;k<9;k++)leafInstances.push({matrix:matrix(Math.cos(a)*r,y+.15,Math.sin(a)*r,2.1+rand(),2.1,2.1,k*.7),color:k%2?0x5f9150:0x427f51});
  }
 }
 // Hanging lianas at the cave lips, kept off the central sailing opening.
 for(const gate of JUNGLE_GATES)for(const side of [-1,1])for(let i=0;i<4;i++){
  const tangent=new THREE.Vector3(gate.z,0,-gate.x),p=new THREE.Vector3(gate.x*66,0,gate.z*66).addScaledVector(tangent,side*(10+i*1.3));
  branch([[p.x,25,p.z],[p.x+.8,18,p.z+.6],[p.x+.3,9+i,p.z+1]],.1);
  for(let j=0;j<6;j++)leafInstances.push({matrix:matrix(p.x+.5,23-j*1.8,p.z+.6,1.4,1.4,1.4,j*2.5),color:0x46824c});
 }
 if(trunkParts.length){const merged=mergeGeometries(trunkParts);mesh(merged,barkMat,forest);trunkParts.forEach(g=>g.dispose());}
 function instances(geometry,material,list,parent){
  const m=new THREE.InstancedMesh(geometry,material,list.length);list.forEach((v,i)=>{m.setMatrixAt(i,v.matrix);m.setColorAt(i,new THREE.Color(v.color));});m.castShadow=m.receiveShadow=true;m.computeBoundingSphere();parent.add(m);return m;
 }
 instances(new THREE.IcosahedronGeometry(1,1),canopyMat,crownInstances,forest);
 instances(leafGeometry,leafMat,leafInstances,forest);
 for(let q=0;q<4;q++)for(let i=0;i<30;i++){
  const a=q*Math.PI/2+.27+rand()*(Math.PI/2-.54),r=56+rand()*7;
  boulderInstances.push({matrix:matrix(Math.cos(a)*r,rand()*1.5,Math.sin(a)*r,1+rand()*2,1+rand()*2,1+rand()*2,rand()*6),color:i%3?0x839584:0xa4ad8a});
 }
 for(const gate of JUNGLE_GATES)for(const end of [-1,1])for(const side of [-1,1])for(let k=0;k<3;k++){
  const r=L.caveRadius+end*21,across=side*(17+k*.8);
  boulderInstances.push({matrix:matrix(gate.x*r+gate.z*across,2+k*5,gate.z*r-gate.x*across,3.2,4,3.8,rand()*6),color:k%2?0x677e6c:0x728c75});
 }
 instances(new THREE.DodecahedronGeometry(1,0),canopyMat,boulderInstances,details);
 // Modest, broken stone terrace on the eastern shore, subordinate to the skull.
 for(let i=0;i<5;i++){const block=mesh(new THREE.BoxGeometry(7-i*.8,.6,5-i*.4),stone,details);block.position.set(43+i*.5,.2+i*.6,-33);block.rotation.y=.4;}
 for(const z of [-37,-29]){const pillar=mesh(new THREE.CylinderGeometry(.7,.9,4,7),stone,details);pillar.position.set(46,4,z);pillar.rotation.z=.12;}
 const waterfallTime={value:0};
 const fallMat=new THREE.ShaderMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false,uniforms:{time:waterfallTime},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float time;varying vec2 v;void main(){float streak=pow(.5+.5*sin(v.x*91.+sin(v.x*23.)*3.+time*.8),5.);float pulse=.5+.5*sin(v.y*65.+time*8.+v.x*12.);float edge=smoothstep(0.,.15,v.x)*smoothstep(0.,.15,1.-v.x);gl_FragColor=vec4(mix(vec3(.18,.63,.62),vec3(.83,.96,.83),streak*.6+pulse*.2),edge*.8);}'});
 for(const [a,h,w] of [[3.9,25,5.5],[5.4,30,4]]){
  const center=new THREE.Vector3(...polar(a,65,h/2)),fall=mesh(new THREE.PlaneGeometry(w,h,3,8),fallMat,details);fall.position.copy(center);fall.rotation.y=-a+Math.PI/2;
  const pool=mesh(new THREE.RingGeometry(w*.35,w*.85,40),new THREE.MeshBasicMaterial({color:0xc3e2cc,transparent:true,opacity:.38,side:THREE.DoubleSide,depthWrite:false}),details);pool.rotation.x=-Math.PI/2;pool.position.set(center.x,.1,center.z);
 }
 root.updateMatrixWorld(true);
 return {root,terrain,roofs,forest,details,skull,gates:JUNGLE_GATES,layout:L,update(time){waterfallTime.value=time;}};
}
