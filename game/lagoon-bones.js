import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {applyBeastSkullWeathering} from './beast-skull-materials.js';

// Three marked pockets between the central land and the connecting stone arches.
export const LAGOON_BONE_SITES=Object.freeze([
 {name:'東南水灣 · 高肋骨',x:31,z:35,angle:-.7,heights:[16,11.5,8.5]},
 {name:'東北岩壁水灣 · 殘肋骨',x:32,z:-35,angle:.8,heights:[12,17,10]},
 {name:'西側水灣 · 傾斜肋骨',x:-30,z:-8,angle:.4,heights:[15,11,8]},
]);

export function createLagoonBones(referenceMaterial){
 const root=new THREE.Group();root.name='Three submerged rib clusters';
 const bone=new THREE.MeshStandardMaterial({color:referenceMaterial.color.clone(),roughness:.94,vertexColors:true,bumpMap:referenceMaterial.bumpMap,bumpScale:referenceMaterial.bumpScale});
 applyBeastSkullWeathering(bone,bone,{value:.35});
 function rib(base,height,bend,phase,broken){
  const curve=new THREE.CatmullRomCurve3([
   new THREE.Vector3(base,-7,0),new THREE.Vector3(base-.4,-1,.3),
   new THREE.Vector3(base+bend*.15,height*.38,.5),
   new THREE.Vector3(base+bend*.6,height*.8,.1),
   new THREE.Vector3(base+bend,height,-.65),
  ]);
  const segments=26,sides=12,frames=curve.computeFrenetFrames(segments,false),p=[],colors=[],uv=[],idx=[];
  const c=new THREE.Color();
  for(let j=0;j<=segments;j++){
   const t=j/segments,center=curve.getPointAt(t);
   const radius=(1.55*(1-t)**.62+.19)*(1+.09*Math.sin(t*21+phase))*(1+.32*Math.exp(-(((t-.13)/.13)**2)));
   for(let k=0;k<sides;k++){
    const a=k/sides*Math.PI*2,r=radius*(1+.055*Math.sin(a*3+t*17+phase));
    const v=center.clone().addScaledVector(frames.normals[j],Math.cos(a)*r).addScaledVector(frames.binormals[j],Math.sin(a)*r*.64);
    if(broken&&j===segments)v.y+=Math.sin(k*4.7)*.2;
    p.push(...v.toArray());uv.push(k/sides,t);
    c.setHex(v.y<.5?0x718276:0xffffff);c.lerp(new THREE.Color(0xa8ad83),Math.max(0,1-v.y/2.5)*.35);c.multiplyScalar(.92+.06*Math.sin(a*3+t*12));colors.push(c.r,c.g,c.b);
    if(j<segments){const a0=j*sides+k,b0=j*sides+(k+1)%sides;idx.push(a0,b0,a0+sides,b0,b0+sides,a0+sides);}
   }
  }
  // Recessed, darker broken tip; no open-ended tube geometry.
  for(const j of [0,segments]){
   const center=curve.getPointAt(j/segments);if(j===segments)center.addScaledVector(curve.getTangentAt(1),broken?-.26:.04);
   const n=p.length/3;p.push(...center.toArray());uv.push(.5,.5);const tint=j===segments&&broken?.43:.85;colors.push(tint,tint*.95,tint*.8);
   for(let k=0;k<sides;k++){const a=j*sides+k,b=j*sides+(k+1)%sides;if(j===0)idx.push(n,b,a);else idx.push(n,a,b);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
 }
 for(const [i,site] of LAGOON_BONE_SITES.entries()){
  const group=new THREE.Group();group.name=site.name;group.position.set(site.x,0,site.z);group.rotation.y=site.angle;
  const parts=site.heights.map((height,k)=>rib((k-1)*3.3,height,(k-1)*1.3+4.8,i*2+k,k===2));
  const mesh=new THREE.Mesh(mergeGeometries(parts),bone);mesh.name=site.name+' · 三根';mesh.castShadow=mesh.receiveShadow=true;parts.forEach(g=>g.dispose());
  group.add(mesh);group.userData.ribs=3;root.add(group);
 }
 return root;
}
