import * as THREE from 'three';
import {REGIONS,TERRAIN,WHIRLPOOLS,REDROCK_SHOALS,REDROCK_GRAND_ARCH,REEF_CLUSTER_BEDS} from './archipelago-data.js';
const palette=new Map();
const material=color=>{if(!palette.has(color))palette.set(color,new THREE.MeshStandardMaterial({color,roughness:.87,flatShading:true}));return palette.get(color);};
const boxGeo=new THREE.BoxGeometry(1,1,1),stoneGeo=new THREE.CylinderGeometry(.80,1,1,9,1),roofGeo=new THREE.BufferGeometry(),leafGeo=new THREE.IcosahedronGeometry(1,0);
roofGeo.setAttribute('position',new THREE.Float32BufferAttribute([-1,0,-1,1,0,-1,0,1,-1,-1,0,1,1,0,1,0,1,1],3));roofGeo.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,2,5,4,2,4,1,0,1,4,0,4,3]);roofGeo.computeVertexNormals();
const sp=stoneGeo.attributes.position;
for(let i=0;i<sp.count;i++){const a=Math.atan2(sp.getZ(i),sp.getX(i)),factor=1+.08*Math.sin(a*3+.4)+.04*Math.cos(a*5);sp.setX(i,sp.getX(i)*factor*.93);sp.setZ(i,sp.getZ(i)*factor*.93);}stoneGeo.computeVertexNormals();
const trunkGeo=new THREE.CylinderGeometry(.52,.72,1,7),coneGeo=new THREE.ConeGeometry(1,1,8),roundGeo=new THREE.CylinderGeometry(1,1,1,10);
function coastalCragGeometry(){
 const n=11,rings=[[-1,.78],[-.25,1],[.27,.83],[1,.42]],vertices=[],indices=[];
 for(let k=0;k<rings.length;k++)for(let j=0;j<n;j++){
  const a=j/n*Math.PI*2,noise=1+.17*Math.sin(a*3+.4)+.10*Math.cos(a*5-.8)+.065*Math.sin(a*8+1.2);
  const radius=rings[k][1]*noise*(1+.055*Math.sin(k*2.8+j*.7));
  vertices.push(Math.cos(a)*radius+(k>1?.12:0),rings[k][0]+.065*Math.sin(j*2.6+k),Math.sin(a)*radius);
 }
 for(let k=0;k<rings.length-1;k++)for(let j=0;j<n;j++){const a=k*n+j,b=k*n+(j+1)%n;indices.push(a,a+n,b,b,a+n,b+n);}
 vertices.push(.1,1.15,0);const top=rings.length*n;for(let j=0;j<n;j++)indices.push(top,(rings.length-1)*n+(j+1)%n,(rings.length-1)*n+j);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
const cragGeo=coastalCragGeometry();
const shared=new Set([boxGeo,stoneGeo,roofGeo,leafGeo,trunkGeo,coneGeo,roundGeo,cragGeo]);
function add(g,geo,color,x,y,z,sx=1,sy=1,sz=1){const m=new THREE.Mesh(geo,material(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
const box=(g,c,x,y,z,sx,sy,sz)=>add(g,boxGeo,c,x,y,z,sx,sy,sz);
export function releaseDetail(group){group.removeFromParent();const geos=new Set();group.traverse(o=>{if(o.geometry&&!shared.has(o.geometry))geos.add(o.geometry);});geos.forEach(g=>g.dispose());group.clear();}
// Material/geometries are a bounded global kit; per-chunk instance buffers are disposed.
export function instanceKit(group){
 group.updateMatrixWorld(true);const buckets=new Map();
 for(const m of [...group.children]){if(!m.isMesh||!shared.has(m.geometry))continue;const k=m.geometry.uuid+m.material.uuid;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(m);}
 for(const items of buckets.values()){if(items.length<2)continue;const im=new THREE.InstancedMesh(items[0].geometry,items[0].material,items.length);for(let i=0;i<items.length;i++){items[i].updateMatrix();im.setMatrixAt(i,items[i].matrix);group.remove(items[i]);}im.castShadow=im.receiveShadow=true;im.computeBoundingSphere();group.add(im);}
}
export function consolidateChunk(group){
 const meshes=[];group.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh)meshes.push(o);});
 // Expand temporary small instances into matrices only, then batch across the region.
 const buckets=new Map();group.updateMatrixWorld(true);const inv=group.matrixWorld.clone().invert();
 group.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+o.material.uuid;if(!buckets.has(key))buckets.set(key,{geometry:o.geometry,material:o.material,matrices:[]});const b=buckets.get(key),base=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);if(o.isInstancedMesh){for(let i=0;i<o.count;i++){const m=new THREE.Matrix4();o.getMatrixAt(i,m);b.matrices.push(base.clone().multiply(m));}}else b.matrices.push(base);});
 group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});group.clear();
 for(const b of buckets.values()){const mesh=new THREE.InstancedMesh(b.geometry,b.material,b.matrices.length);b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}
}
export function releaseChunk(group){group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});releaseDetail(group);}
export const BUILDING_TYPES=Object.freeze([
 {id:'cottage',name:'漁夫小屋',w:3.3,d:2.9,h:3.0,roof:'gable'},
 {id:'stilt',name:'水上高腳屋',w:3.2,d:3.2,h:3.0,roof:'hip'},
 {id:'inn',name:'雙層旅店',w:4.7,d:3.6,h:5.1,roof:'gable'},
 {id:'warehouse',name:'港口倉庫',w:5.3,d:3.8,h:3.5,roof:'shed'},
 {id:'watchtower',name:'瞭望塔',w:2.7,d:2.6,h:7.1,roof:'spire'},
 {id:'forge',name:'鑄砲工坊',w:4.2,d:3.4,h:3.9,roof:'gable'},
 {id:'boathouse',name:'船匠棚屋',w:4.4,d:5.4,h:3.3,roof:'gable'},
 {id:'market',name:'帆布市集',w:4.9,d:3.5,h:2.8,roof:'awning'},
 {id:'lighthouse',name:'港灣燈塔',w:2.9,d:2.9,h:8.3,roof:'spire'},
 {id:'cliffhouse',name:'峭壁疊樓',w:3.4,d:3,h:4.7,roof:'hip'},
]);
export function buildingTypeFor(regionId,slot){
 const offset=REGIONS.findIndex(r=>r.id===regionId);
 return BUILDING_TYPES[((slot*7+offset*3)%10+10)%10];
}
const shade=(color,multiplier)=>new THREE.Color(color).multiplyScalar(multiplier).getHex();
function house(g,r,x,y,z,slot,detail){
 const type=buildingTypeFor(r.id,slot),{w,d,h}=type,raised=type.id==='stilt'?1.8:type.id==='cliffhouse'?1.15:0;
 const roofColor=r.id==='harbor'?[0xbf613f,0x537d77,0xd48151,0x8a514b,0x718c83,0xb97449,0x68545a][((slot%7)+7)%7]:r.id==='redrock'?[0x386b70,0xb55e42,0xc98951,0x596c5a,0x8f493f,0x456d6d,0xd09b62][((slot%7)+7)%7]:slot%7===0?shade(r.roof,.69):slot%4===0?shade(r.roof,1.21):r.roof;
 const skin=r.id==='harbor'?[0xe9d6b2,0xe6c5a0,0xc6b6a1,0xe8d6ba,0x9eb5ac][((slot%5)+5)%5]:r.id==='redrock'?[0xe5bb86,0xd89e6c,0xc78358,0xe7c39b,0xb36e4d][((slot%5)+5)%5]:[0xe9d6b2,0xc8bc9f,0xe7c6a0,0xd8d1bc][slot%4],timber=r.id==='redrock'?0x5e4034:slot%3===0?0x704d35:0x916847;
 const baseY=y+raised,top=baseY+h+.5,halfD=d/2,halfW=w/2;
 // Silhouette and roof survive as low-detail village landmarks.
 if(type.id==='lighthouse'){
  add(g,roundGeo,0xaab4ac,x,baseY+h/2,z,w*.46,h,d*.46);
  add(g,roundGeo,0xd4bb87,x,top+.12,z,w*.62,.35,d*.62);
  add(g,coneGeo,roofColor,x,top+1.1,z,w*.62,2,d*.62);
  if(detail){add(g,roundGeo,0xe6bb68,x,top+.9,z,w*.36,1,d*.36);for(const side of [-1,1])box(g,timber,x+side*halfW*.7,top+.15,z,.1,1.1,.1);}
 }else{
  box(g,0xc1a17a,x,y+.20,z,w+.65,.4,d+.65);
  if(type.id==='market'){
   for(const side of [-1,1])for(const depth of [-1,1])box(g,timber,x+side*(halfW-.18),baseY+h/2,z+depth*(halfD-.15),.19,h,.19);
   box(g,0xdecba7,x,baseY+.60,z,w*.78,1.05,d*.65);
  }else box(g,skin,x,baseY+h/2+.45,z,w,h,d);
  if(type.id==='cliffhouse')box(g,shade(skin,.92),x+.60,baseY+h*.74,z-.28,w*.82,h*.54,d*.90);
  if(type.roof==='gable'){
   add(g,roofGeo,roofColor,x,top+.27,z,w*.61,1.45,d*.67);
   if(detail){box(g,timber,x,top+1.7,z,.1,.12,d*1.35);for(const side of [-1,1])for(let stripe=1;stripe<4;stripe++)box(g,shade(roofColor,.78),x+side*halfW*.61*stripe/4,top+1.45*(1-stripe/4),z,.065,.07,d*1.31);}
  }else if(type.roof==='hip'||type.roof==='spire'){
   add(g,coneGeo,roofColor,x,top+(type.roof==='spire'?1.45:.8),z,w*.68,type.roof==='spire'?2.9:1.65,d*.68);
  }else if(type.roof==='awning'){
   const roof=box(g,roofColor,x,top+.28,z,w*1.22,.18,d*1.35);roof.rotation.z=-.10;
   if(detail)for(let stripe=-2;stripe<=2;stripe++)box(g,stripe%2?0xf2dfb3:roofColor,x+stripe*w*.22,top+.39,z,.16,.09,d*1.37);
  }else{const roof=box(g,roofColor,x,top+.37,z,w*1.2,.22,d*1.28);roof.rotation.z=.17;}
 }
 if(type.id==='stilt'||type.id==='cliffhouse')for(const side of [-1,1])for(const depth of [-1,1])box(g,timber,x+side*(halfW-.25),y+raised/2,z+depth*(halfD-.25),.18,raised+.3,.18);
 if(!detail)return type;
 // Each archetype adds different functional details, while sharing bounded geometry/materials.
 if(type.id!=='lighthouse'){
  for(const side of [-1,1]){
   box(g,timber,x+side*(halfW-.15),baseY+h/2+.45,z+halfD+.10,.13,h,.12);
   box(g,timber,x,baseY+h+.4,z+side*halfD+.08,w,.13,.12);
   const wx=x+side*Math.min(w*.25,.95);
   box(g,0x754f36,wx,baseY+h*.61,z+halfD+.11,.70,.85,.1);
   box(g,0x53a7b0,wx,baseY+h*.61,z+halfD+.18,.54,.68,.08);
   box(g,timber,wx,baseY+h*.61,z+halfD+.24,.06,.77,.08);
   box(g,0x447b83,x+side*halfW+.09,baseY+h*.55,z,.10,.75,.58);
  }
  box(g,0x67503d,x,baseY+1.05,z+halfD+.15,.75,1.42,.12);
  box(g,0xcaa16b,x,baseY+.49,z+halfD+.8,w+.25,.15,1.35);
  for(const side of [-1,1])box(g,timber,x+side*halfW,baseY+.95,z+halfD+1.3,.11,1.45,.11);
 }
 switch(type.id){
  case 'cottage':
   box(g,0x9a7751,x-halfW*.55,top+1.0,z-.4,.48,1.35,.48);
   break;
  case 'stilt':
   for(const side of [-1,1])box(g,timber,x+side*halfW*.85,y+.34,z,.12,1.2,d*.95);
   box(g,0xb09065,x,baseY-.12,z+halfD+1.55,w*.92,.14,1.8);
   break;
  case 'inn':
   box(g,0xb08459,x,baseY+h*.55,z+halfD+1.15,w*1.05,.20,1.85);
   for(let i=-2;i<=2;i++)box(g,timber,x+i*w*.18,baseY+h*.75,z+halfD+1.92,.10,h*.40,.10);
   box(g,0xefcb74,x,baseY+h*.38,z+halfD+1.33,.82,.64,.12);
   break;
  case 'warehouse':
   box(g,0x6b533d,x,baseY+1.42,z+halfD+.13,2.15,2.35,.16);
   for(let i=0;i<3;i++)box(g,0xae8254,x-halfW+.60+i*.70,baseY+.45,z+halfD+1.15,.55,.82,.55);
   break;
  case 'watchtower':
   box(g,0xb98758,x,top-.38,z,w*1.48,.20,d*1.48);
   for(const side of [-1,1])for(const depth of [-1,1])box(g,timber,x+side*halfW*.68,top+.45,z+depth*halfD*.70,.12,1.4,.12);
   break;
  case 'forge':
   box(g,0x6c5746,x+halfW*.58,top+.75,z-.25,.85,2.65,.88);
   box(g,0xe59b55,x-halfW*.55,baseY+1.07,z+halfD+.17,.75,.68,.10);
   break;
  case 'boathouse':
   for(let i=0;i<4;i++)box(g,timber,x+sideOffset(i,w),baseY+1.25,z+halfD+1.4,.13,2.5,.13);
   box(g,0x705340,x,baseY+.34,z+halfD+2.2,w*.8,.19,2.1);
   break;
  case 'market':
   for(let i=-2;i<=2;i++)box(g,0xa37a4a,x+i*w*.17,baseY+.84,z+halfD+1.0,.49,.68,.55);
   break;
  case 'lighthouse':
   for(const side of [-1,1])box(g,0x325969,x+side*w*.42,baseY+h*.43,z,.13,.65,.72);
   break;
  case 'cliffhouse':
   box(g,0xb18b61,x+.55,baseY+h*.63,z+halfD+1.25,w*1.14,.17,1.8);
   for(let i=-2;i<=2;i++)box(g,timber,x+i*w*.21+.55,baseY+h*.84,z+halfD+2.02,.10,h*.43,.10);
   break;
 }
 if(r.id==='harbor'&&type.id!=='lighthouse'){
  // Canvas shade, shutters and flower boxes keep the seaside facade readable
  // even when the small houses are viewed from a ship rather than overhead.
  const awning=box(g,slot%2?0x6c9b91:0xcf8265,x,baseY+2.18,z+halfD+1.12,w*.74,.12,1.55);awning.rotation.x=-.12;
  for(const side of [-1,1]){
   box(g,slot%2?0x5c857b:0xb86f55,x+side*.95,baseY+h*.61,z+halfD+.28,.16,.96,.10);
   box(g,0x947049,x+side*.92,baseY+h*.33,z+halfD+.31,.72,.18,.36);
   for(let k=0;k<3;k++)add(g,leafGeo,k%2?0x6b985f:0x8bb276,x+side*.92+(k-1)*.20,baseY+h*.38,z+halfD+.36,.24,.32,.25);
  }
 }
 if(r.id==='redrock'&&type.id!=='lighthouse'){
  const trim=slot%2?0x477576:0xbd784f;
  for(const side of [-1,1]){
   box(g,trim,x+side*Math.min(w*.25,.95),baseY+h*.61,z+halfD+.29,.16,.97,.12);
   box(g,0x76513b,x+side*Math.min(w*.25,.95),baseY+h*.32,z+halfD+.33,.85,.18,.43);
   for(let i=0;i<3;i++)add(g,leafGeo,i===1?0xd9a15c:0x708a56,x+side*Math.min(w*.25,.95)+(i-1)*.22,baseY+h*.38,z+halfD+.40,.21,.21,.22);
  }
  const canopy=box(g,slot%3===0?0xc3794b:0x6b8d84,x,baseY+2.26,z+halfD+1.11,w*.78,.14,1.32);canopy.rotation.x=-.13;
  box(g,0xd5aa72,x,baseY+.25,z+halfD+1.45,w*.82,.12,1.24);
  if(type.id==='forge'||type.id==='warehouse'){
   box(g,0x654b3c,x+halfW*.62,top+.92,z-.42,.85,2.1,.83);
   box(g,0xe9a65b,x-halfW*.42,baseY+.85,z+halfD+.25,.82,.7,.18);
  }
 }
 return type;
}
function sideOffset(i,w){return (i-1.5)*w*.23;}
function reefCottage(g,x,y,z,slot,detail){
 const type=slot%4,raised=type===0?.85:.35,w=type===2?4.45:3.65,d=type===1?4.25:3.25;
 const wall=[0xf2dfbc,0xe8e5ca,0xe1c7aa,0xf2d7b1][slot%4],roof=[0xd87a61,0x3e9799,0xe2a16a,0x6dafa0][slot%4],timber=0x876c52;
 box(g,0xc9a37a,x,y+raised*.5,z,w+1,raised+.22,d+1);
 for(const sx of [-1,1])for(const sz of [-1,1])box(g,timber,x+sx*w*.43,y+raised*.5,z+sz*d*.42,.22,raised+.3,.22);
 box(g,wall,x,y+raised+1.65,z,w,3.3,d);
 const roofMesh=add(g,roofGeo,roof,x,y+raised+3.95,z,w*.64,1.35,d*.70);roofMesh.rotation.y=type===3?Math.PI/2:0;
 box(g,0xf7e5c0,x,y+raised+.35,z+d*.77,w+1.6,.18,2.15);
 for(const side of [-1,1]){
  box(g,timber,x+side*(w*.5+.38),y+raised+1.15,z+d*.74,.14,1.65,.14);
  box(g,0x4e9dad,x+side*w*.25,y+raised+2.15,z+d*.52,.70,.85,.08);
  box(g,0xf8e4b7,x+side*w*.25,y+raised+2.15,z+d*.59,.49,.57,.05);
 }
 box(g,0x765846,x,y+raised+1.18,z+d*.53,.82,1.85,.10);
 if(!detail)return;
 for(const side of [-1,1]){
  for(const depth of [-.25,.28]){
   const wx=x+side*(w*.5+.07),wz=z+depth*d;
   box(g,0xf9e8c8,wx,y+raised+2.05,wz,.16,1.25,.96);
   box(g,0x438f98,wx+side*.10,y+raised+2.08,wz,.08,.96,.68);
   box(g,0xe2b979,wx+side*.16,y+raised+2.08,wz-.40,.10,1.02,.12);
   box(g,0xe2b979,wx+side*.16,y+raised+2.08,wz+.40,.10,1.02,.12);
  }
  box(g,timber,x+side*w*.49,y+raised+1.9,z-d*.48,.12,3.56,.12);
 }
 box(g,0xf7e8cd,x,y+raised+3.45,z-d*.52,w+.45,.20,.16);
 box(g,timber,x,y+raised+3.96,z,w*.12,.14,d*1.44);
 for(let i=0;i<6;i++)box(g,i%2?0xf5e0bb:roof,x+(i-2.5)*((w+1.3)/6),y+raised+3.92,z+d*.82,.16,.11,2.18);
 for(const side of [-1,1]){
  box(g,timber,x+side*(w*.5+.36),y+raised+.94,z+d*1.33,.10,1.15,.10);
  box(g,0xd9bd91,x+side*w*.24,y+raised+.71,z+d*1.26,.86,.16,.67);
  add(g,leafGeo,side>0?0x709b6f:0x88b483,x+side*(w*.5+.45),y+raised+.82,z+d*.20,.54,.63,.54);
  box(g,timber,x+side*w*.50,y+raised+.68,z+d*.55,.12,.34,d*1.65);
 }
 box(g,timber,x,y+raised+1.35,z+d*1.50,w+1.55,.10,.10);
 for(let i=0;i<3;i++)box(g,0xe5c797,x,y+raised-.05-i*.16,z+d*1.70+i*.38,w*.75-i*.16,.14,.38);
}
function createReefChapel(t){
 const g=new THREE.Group();g.name='翡翠環礁 · 主島海濱大教堂';g.position.set(t.x,t.h,t.z);
 const plaster=0xf0dfbc,trim=0xffedc9,stone=0xc9ba91,teal=0x427e83,roof=0x4a9b9d;
 box(g,stone,0,.26,0,13,.52,17);
 box(g,plaster,0,4.65,0,10.6,8.6,13.7);
 for(const side of [-1,1]){
  box(g,trim,side*5.47,4.7,0,.36,8.75,14.1);
  for(const zz of [-4.25,0,4.25]){
   box(g,teal,side*5.69,5.35,zz,.12,3.45,1.75);
   add(g,roundGeo,0xb4dcce,side*5.76,7.10,zz,.13,.83,.9);
   box(g,trim,side*5.77,5.35,zz,.15,.16,2.1);
   box(g,trim,side*5.77,3.83,zz,.15,.16,2.1);
  }
 }
 const naveRoof=add(g,roofGeo,roof,0,10.65,0,6.55,3.15,7.5);naveRoof.rotation.y=Math.PI/2;
 for(const side of [-1,1])for(let i=0;i<5;i++)box(g,side<0?0xd2bd91:trim,side*5.72,9.25,-5.5+i*2.7,.24,.25,.30);
 box(g,stone,0,1.0,8.25,6.1,2.0,6.0);
 box(g,plaster,0,7.0,8.25,5.0,12.2,5.0);
 for(let level=0;level<3;level++){
  const yy=2.8+level*3.6;
  for(const side of [-1,1])for(const axis of [-1,1])box(g,trim,side*2.24,yy,8.25+axis*2.20,.23,3.35,.24);
  box(g,stone,0,yy+1.67,8.25,5.45,.24,5.45);
 }
 box(g,0x315c62,0,10.95,10.87,1.72,2.80,.18);
 add(g,roundGeo,0xeac885,0,11.08,10.99,.70,.82,.30);
 box(g,trim,0,13.42,8.25,6.0,.48,6.0);
 add(g,coneGeo,roof,0,15.35,8.25,3.6,3.6,3.6);
 box(g,0xd6b878,0,18.20,8.25,.30,2.2,.32);
 box(g,0xd6b878,0,18.60,8.25,1.25,.29,.32);
 box(g,teal,0,3.17,7.18,2.35,4.7,.20);
 add(g,roundGeo,0x93c9c2,0,5.54,7.28,1.17,1.04,.16);
 for(let i=0;i<7;i++)box(g,i%2?0xe8d0a0:trim,0,.18+i*.17,11.3+i*.48,4.1-i*.14,.18,.48);
 for(let i=0;i<5;i++)box(g,i%2?0xd8c69a:0xf4e3ba,0,.10,14.8+i*.77,3.8-i*.26,.13,.68);
 for(const side of [-1,1]){
  add(g,roundGeo,0xbba883,side*3.9,.36,12.4,.93,.36,.93);
  add(g,leafGeo,side<0?0x73a876:0x88b37e,side*3.9,.92,12.4,1.05,.65,.95);
  box(g,0x8f7758,side*4.75,1.25,10.6,.17,2.0,.17);
  add(g,roundGeo,0xf6d6a0,side*4.75,2.32,10.6,.35,.42,.35);
 }
 instanceKit(g);return g;
}
function createReefPier(r){
 const g=new THREE.Group();g.name='翡翠環礁 · 木棧碼頭';
 const u={x:Math.cos(r.angle),z:Math.sin(r.angle)},v={x:-u.z,z:u.x};
 for(let i=0;i<32;i++){
  const radius=126+i*.98,x=u.x*radius,z=u.z*radius;
  const plank=box(g,i%5===0?0xcda77a:0xe0bf8a,x,.88,z,5.0,.18,.83);plank.rotation.y=-r.angle+Math.PI/2;
  if(i%4===0)for(const side of [-1,1]){
   const px=x+v.x*side*2.65,pz=z+v.z*side*2.65;
   box(g,0x8b7258,px,.16,pz,.25,2.2,.25);
   add(g,roundGeo,0xf0deaf,px,1.32,pz,.23,.15,.23);
  }
 }
 for(const side of [-1,1]){
  const x=u.x*143+v.x*side*4.6,z=u.z*143+v.z*side*4.6;
  const landing=box(g,0xd7b98a,x,.92,z,3.2,.22,4.8);landing.rotation.y=-r.angle+Math.PI/2;
 }
 instanceKit(g);return g;
}
function reefVillageSlots(){
 const slots=[];
 for(const t of TERRAIN.filter(t=>t.region==='reef')){
  const main=t.seed===32,count=main?2:t.rx>=11?2+(t.seed%3===0?1:0):t.rx>=8&&t.seed%3===0?2:1;
  for(let i=0;i<count;i++){
   const angle=t.seed*1.31+i*Math.PI*2/count,rad=main?13:count===1?0:Math.min(t.rx,t.rz)*.36;
   slots.push({slot:t.seed*3+i,islandSeed:t.seed,x:t.x+Math.cos(angle)*rad,z:t.z+Math.sin(angle)*rad,y:t.h,heading:angle+Math.PI/2});
  }
 }
 return slots;
}
export function villageSlots(r,rows=3){
 if(r.id==='reef')return reefVillageSlots();
 const u={x:Math.cos(r.angle),z:Math.sin(r.angle)},v={x:-u.z,z:u.x},offset=REGIONS.indexOf(r);
 const slots=[];
 for(let row=0;row<rows;row++)for(let j=-3;j<=3;j++){
  const slot=row*7+j+3,seed=slot*12.9898+offset*78.233;
  const harbor=r.id==='harbor';
  const radius=harbor?152+row*5.15+Math.sin(seed*.81)*1.45:153+row*6+Math.sin(seed)*.65;
  const tangent=harbor?j*5.15+Math.cos(seed*1.37)*1.15+(row%2?2.1:-.8):j*5.55+Math.cos(seed*1.37)*.8;
  slots.push({slot,x:u.x*radius+v.x*tangent,z:u.z*radius+v.z*tangent,y:5.25,heading:-r.angle+(harbor?-Math.PI/2:Math.PI/2)+Math.sin(seed*.71)*(harbor?.38:.21)+(harbor&&slot%6===0?.28:0)});
 }
 return slots;
}
function tree(g,x,y,z,seed,r,central=false){
 if(r.id==='harbor'){harborPlant(g,x,y,z,seed,central);return;}
 if(r.id==='redrock'){redrockPlant(g,x,y,z,seed,central);return;}
 const tall=central?6+(seed%4)*.75:3.7+(seed%3)*.7;
 const trunk=add(g,trunkGeo,0x76543b,x,y+tall*.5,z,central?.52:.32,tall,central?.52:.32);
 trunk.rotation.z=(seed%3-1)*.045;
 if(central){
  // Solid, upright canopy masses so the summit reads as woodland from above.
  add(g,leafGeo,r.grass,x,y+tall+.45,z,2.65,2.35,2.45);
  for(let k=0;k<3;k++){const angle=k*2.094+seed*.4;add(g,leafGeo,k%2?0x537f5b:0x71a16c,x+Math.cos(angle)*1.45,y+tall-.05,z+Math.sin(angle)*1.4,1.55,1.35,1.5);}
 }else if(r.id==='fjord'){
  for(let k=0;k<3;k++)add(g,coneGeo,k%2?0x466d62:r.grass,x,y+tall*.55+k*.70,z,1.15-k*.16,1.95,1.15-k*.16);
 }else if(r.id==='mist'){
  for(let k=0;k<3;k++)add(g,leafGeo,r.grass,x+Math.sin(k*2)*.52,y+tall+.3+k*.42,z+Math.cos(k*2)*.52,1.55-k*.2,1.3,1.45);
 }else{
  add(g,leafGeo,0x6aa261,x,y+tall+.28,z,.72,.6,.72);
  for(let k=0;k<6;k++){const angle=k*Math.PI/3+seed*.13;const leaf=add(g,leafGeo,r.grass,x+Math.cos(angle)*1.05,y+tall+.1+Math.sin(k*2)*.16,z+Math.sin(angle)*1.05,1.55,.32,.58);leaf.rotation.y=-angle;leaf.rotation.z=Math.cos(angle)*.18;}
 }
}
function redrockPlant(g,x,y,z,seed,central=false){
 const kind=((seed*7+(central?2:0))%5+5)%5,deep=0x416e58,olive=0x668d58,lime=0x9dad63;
 if(kind===0){ // Flat, wind-shaped acacia crown.
  const h=central?6.6:4.8+(seed%3)*.45;
  const trunk=add(g,trunkGeo,0x74543d,x,y+h*.48,z,.23,h,.23);trunk.rotation.z=.10;
  for(let i=0;i<4;i++){
   const a=i*2.399+seed*.43,reach=1.25+(i%2)*.5;
   const limb=add(g,trunkGeo,0x76563e,x+Math.cos(a)*reach*.35,y+h*.87,z+Math.sin(a)*reach*.35,.10,reach*1.0,.10);limb.rotation.z=Math.cos(a)*.61;limb.rotation.x=-Math.sin(a)*.61;
   const crown=add(g,leafGeo,i%2?deep:olive,x+Math.cos(a)*reach,y+h+.25+(i%2)*.18,z+Math.sin(a)*reach,1.5,.48,1.35);crown.rotation.y=a;
  }
 }else if(kind===1){ // Fan palm at the lower, wetter shelves.
  const h=central?6.0:4.3;
  const trunk=add(g,trunkGeo,0x856543,x,y+h*.5,z,.23,h,.23);trunk.rotation.z=-.10;
  for(let i=0;i<7;i++){
   const a=i*Math.PI*2/7+seed*.2;
   const frond=add(g,leafGeo,i%3===0?lime:olive,x+Math.cos(a)*1.32,y+h+.08-(i%2)*.15,z+Math.sin(a)*1.32,1.52,.17,.43);
   frond.rotation.y=-a;frond.rotation.z=-.16;
  }
 }else if(kind===2){ // Blue-green agave, separate curved blades and flowering stalk.
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4+seed*.19;
   const blade=add(g,coneGeo,i%2?0x5b8a75:0x83a18a,x+Math.cos(a)*.37,y+.66,z+Math.sin(a)*.37,.31,1.35,.31);
   blade.rotation.z=Math.cos(a)*.49;blade.rotation.x=-Math.sin(a)*.49;
  }
  add(g,trunkGeo,0x77865d,x,y+1.22,z,.07,2.1,.07);
  for(let i=0;i<3;i++)add(g,leafGeo,0xe7b06e,x+Math.cos(i*2.1)*.21,y+2.20,z+Math.sin(i*2.1)*.21,.19,.2,.19);
 }else if(kind===3){ // Multi-stem red-rock juniper.
  const h=central?5.1:3.8;
  for(let i=0;i<3;i++){
   const a=i*2.1+seed*.12;
   const stem=add(g,trunkGeo,0x755440,x+Math.cos(a)*.24,y+h*.43,z+Math.sin(a)*.24,.17,h*.86,.17);stem.rotation.z=Math.cos(a)*.17;
   add(g,leafGeo,i%2?0x3e6b59:0x597d5e,x+Math.cos(a)*.66,y+h+(i%2)*.23,z+Math.sin(a)*.66,1.07,1.12,.96);
  }
 }else{ // Orange desert flower on low, irregular sage shrubs.
  for(let i=0;i<5;i++){
   const a=i*2.399+seed*.27;
   add(g,leafGeo,i%2?olive:deep,x+Math.cos(a)*.52,y+.45+(i%2)*.2,z+Math.sin(a)*.48,.62,.38,.55);
   if(i%2===0)add(g,leafGeo,i===0?0xe9ad66:0xc66d4f,x+Math.cos(a)*.65,y+.86+(i%2)*.2,z+Math.sin(a)*.55,.16,.18,.16);
  }
 }
}
function harborPlant(g,x,y,z,seed,central=false){
 const kind=central?seed%3:seed%5,tint=[0x4b8264,0x6fa967,0x85ae64,0x456f5a][seed%4];
 if(kind===0){ // Wind-bent palms with individually splayed fronds and coconuts.
  const height=central?7.6:5.3+(seed%3)*.52;
  for(let i=0;i<3;i++){const trunk=add(g,trunkGeo,0x856447,x+i*.13,y+(i+.5)*height/3,z-i*.08,.25-i*.025,height/3+.15,.25-i*.025);trunk.rotation.z=-.09;}
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4+seed*.31,reach=central?3.35:2.6,dx=Math.cos(a),dz=Math.sin(a);
   const leaf=add(g,leafGeo,i%3===0?0x91bc6a:tint,x+dx*reach*.52,y+height+.05+Math.sin(i*2.2)*.16,z+dz*reach*.52,reach*.55,.15,reach*.22);
   leaf.rotation.y=-a;leaf.rotation.z=-.20+Math.sin(i*1.6)*.08;
   add(g,leafGeo,shade(tint,.76),x+dx*reach*.89,y+height-.32,z+dz*reach*.89,.42,.12,.42);
  }
  for(let i=0;i<3;i++)add(g,leafGeo,0x76683c,x+Math.cos(i*2.1)*.33,y+height-.25,z+Math.sin(i*2.1)*.33,.24,.25,.24);
 }else if(kind===1){ // Rounded tropical broadleaf trees, with uneven canopy volumes.
  const height=central?7.5:4.5+(seed%3)*.55;
  add(g,trunkGeo,0x715342,x,y+height*.5,z,.33,height,.33);
  for(let i=0;i<5;i++){const a=i*2.399+seed*.27,spread=central?2.1:1.35;
   add(g,leafGeo,i%2?shade(tint,.83):tint,x+Math.cos(a)*spread,y+height+(i%2)*.40,z+Math.sin(a)*spread,central?2.1:1.35,central?1.65:1.12,central?1.9:1.25);
  }
 }else if(kind===2){ // Low mangrove with raised roots and a wide crown.
  const height=central?5.6:3.6;
  for(let i=0;i<4;i++){const a=i*Math.PI*.5+seed*.2,root=add(g,trunkGeo,0x70513d,x+Math.cos(a)*.42,y+.75,z+Math.sin(a)*.42,.12,1.6,.12);root.rotation.z=Math.cos(a)*.38;}
  add(g,trunkGeo,0x775740,x,y+height*.5,z,.39,height,.39);
  for(let i=0;i<5;i++){const a=i*2.399+seed*.18;add(g,leafGeo,i%2?0x3f7655:0x609560,x+Math.cos(a)*1.6,y+height+.1+(i%2)*.28,z+Math.sin(a)*1.45,1.7,.72,1.55);}
 }else if(kind===3){ // Fan-leaf banana plants.
  const height=3.1+(seed%2)*.5;
  add(g,trunkGeo,0x66854a,x,y+height*.45,z,.22,height*.9,.22);
  for(let i=0;i<6;i++){const a=i*Math.PI/3+seed*.39,dx=Math.cos(a),dz=Math.sin(a);const leaf=add(g,leafGeo,i%2?0x73a765:0xa0bc6b,x+dx*1.1,y+height+.18,z+dz*1.1,1.5,.22,.5);leaf.rotation.y=-a;leaf.rotation.z=.26;}
 }else{ // Spiky coastal agave with small warm flowers.
  for(let i=0;i<7;i++){const a=i*2.399+seed*.21,leaf=add(g,coneGeo,i%2?0x638f70:0x9ebc74,x+Math.cos(a)*.48,y+.70,z+Math.sin(a)*.48,.33,1.5,.33);leaf.rotation.z=Math.cos(a)*.47;}
  for(let i=0;i<3;i++)add(g,leafGeo,i%2?0xe2ad70:0xda8d83,x+Math.cos(i*2.1)*.35,y+1.42,z+Math.sin(i*2.1)*.35,.22,.18,.22);
 }
}
function addTerrace(g,t,r,i){
 const a=t.seed*2.41+i*2.31,outer=i===0?.20:.34;
 const cx=t.x+Math.cos(a)*t.rx*outer,cz=t.z+Math.sin(a)*t.rz*outer;
 const rx=t.rx*(i===0?.50:.29),rz=t.rz*(i===0?.48:.31),rise=Math.min(8,t.h*(i===0?.24:.16))+(r.id==='redrock'?2:0);
 const n=r.id==='redrock'?23:18,rings=r.id==='redrock'?[[t.h-.22,1.17],[t.h+rise*.20,1.11],[t.h+rise*.38,.98],[t.h+rise*.67,.98],[t.h+rise*.78,.86],[t.h+rise,.85]]:[[t.h-.22,1.12],[t.h+rise*.34,1.05],[t.h+rise*.68,.94],[t.h+rise,.84]],pos=[],idx=[],outline=[];
 for(let k=0;k<rings.length;k++)for(let j=0;j<n;j++){
  const angle=j/n*Math.PI*2,noise=1+.09*Math.sin(angle*5+a)+.045*Math.cos(angle*8-a*.7)+(r.id==='redrock'?.045*Math.sin(angle*11+a*.31):0),rad=rings[k][1]*noise;
  const x=Math.cos(angle)*rx*rad,z=Math.sin(angle)*rz*rad;pos.push(x,rings[k][0],z);
  if(k===rings.length-1)outline.push(new THREE.Vector2(x,-z));
 }
 // The rocky shelf is seen from outside. Keep its triangles outward-facing;
 // inward winding made the wall vanish under FrontSide culling, leaving trees
 // and the upper grassy cap looking suspended from a low camera angle.
 for(let k=0;k<rings.length-1;k++)for(let j=0;j<n;j++){const p=k*n+j,q=k*n+(j+1)%n;idx.push(p,p+n,q,q,p+n,q+n);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
 const rock=new THREE.Mesh(geo,material(r.id==='redrock'?(i===0?0xa85d3f:0xc48053):shade(r.rock,i===0?.91:1.05)));rock.position.set(cx,0,cz);rock.castShadow=rock.receiveShadow=true;g.add(rock);
 const cap=new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(outline)),material(r.id==='redrock'?(i%2?0xc99769:0xd1a270):i%2?shade(r.grass,1.13):r.grass));cap.rotation.x=-Math.PI/2;cap.position.set(cx,t.h+rise+.035,cz);cap.castShadow=cap.receiveShadow=true;g.add(cap);
}
function addRedrockShallowShelf(g,t,shelf){
 const radial=[.72,.82,.92,1.02,1.10,1.16,1.19],advance=[0,0,0,.10,.36,.70,1],height=[t.h*.64,t.h*.46,t.h*.29,Math.max(6,t.h*.16),3.7,1.15,-.52];
 const across=12,rows=radial.length,vertices=[],colors=[],indices=[];
 const tones=[0x9a5139,0xb66946,0xc88156,0xda9b68,0xe2b887,0xe6c99b,0xd9d3ab];
 for(let layer=0;layer<2;layer++)for(let k=0;k<rows;k++)for(let j=0;j<=across;j++){
  const side=j/across*2-1,angle=shelf.angle+side*shelf.arc;
  const taper=1-.29*side*side,rough=.35*Math.sin(j*3.1+k*2.4+t.seed);
  const extension=shelf.reach*advance[k]*taper;
  const x=t.x+Math.cos(angle)*(t.rx*radial[k]+extension+rough),z=t.z+Math.sin(angle)*(t.rz*radial[k]+extension+rough);
  const y=layer===0?height[k]*(1-.10*side*side)+.13*Math.sin(j*2.6+k*.9+t.seed):-1.8;
  vertices.push(x,y,z);
  const tint=new THREE.Color(layer?0x8d6451:tones[k]).multiplyScalar(.94+.065*Math.sin(j*1.9+k*2.3+t.seed));colors.push(tint.r,tint.g,tint.b);
 }
 const stride=across+1,bottom=rows*stride;
 for(let k=0;k<rows-1;k++)for(let j=0;j<across;j++){
  const a=k*stride+j,b=a+stride;indices.push(a,b,a+1,a+1,b,b+1);
 }
 for(let j=0;j<across;j++){
  const a=(rows-1)*stride+j,b=a+bottom;indices.push(a,b,a+1,a+1,b,b+1);
 }
 for(let k=0;k<rows-1;k++)for(const j of [0,across]){
  const a=k*stride+j,b=a+stride;indices.push(a,a+bottom,b,b,a+bottom,b+bottom);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.96,flatShading:true,side:THREE.DoubleSide}));mesh.name=`赤岩淺灘 ${shelf.seed}`;mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);
 for(let i=0;i<10;i++){
  const side=(i%5-2)/2.6,angle=shelf.angle+side*shelf.arc*.85,k=i%3+3;
  const extension=shelf.reach*advance[k]*(1-.29*side*side);
  const x=t.x+Math.cos(angle)*(t.rx*radial[k]+extension),z=t.z+Math.sin(angle)*(t.rz*radial[k]+extension),y=height[k];
  const stone=add(g,cragGeo,i%3===0?0x9e5940:i%2?0xd99f70:0xc17b53,x,y+.36,z,.72+(i%3)*.48,.42+(i%2)*.28,.74+(i%2)*.32);stone.rotation.y=angle+i*.22;
  if(i%3===0&&y>2)redrockPlant(g,x+Math.sin(angle)*.8,y+.55,z-Math.cos(angle)*.8,i+31,false);
 }
 for(let i=0;i<8;i++){
  const side=(i-3.5)/4,angle=shelf.angle+side*shelf.arc*.9,x=t.x+Math.cos(angle)*(t.rx*1.19+shelf.reach*(1-.29*side*side)),z=t.z+Math.sin(angle)*(t.rz*1.19+shelf.reach*(1-.29*side*side));
  const foam=add(g,leafGeo,i%3===0?0xd5f2df:0x9fd5cd,x,.10,z,.46+(i%3)*.17,.08,.27+(i%2)*.11);foam.rotation.y=angle;
 }
}
function createRedrockTerrain(t){
 const g=new THREE.Group();g.name=`赤岩群柱 · 手繪石島 ${t.seed}`;
 const village=t.seed===12,n=village?40:32,phase=t.seed*1.73;
 const rings=village?[[-1.45,1.10],[-.12,1.04],[.78,.99],[1.55,.97],[2.55,.91],[3.6,.94],[4.35,.87],[t.h-.16,.88],[t.h,.88]]:[[-1.7,1.16],[-.22,1.09],[t.h*.12,1.01],[t.h*.24,.97],[t.h*.32,1.005],[t.h*.40,.94],[t.h*.48,.88],[t.h*.57,.91],[t.h*.64,.84],[t.h*.73,.82],[t.h*.79,.86],[t.h*.86,.79],[t.h*.92,.76],[t.h-.16,.78],[t.h,.78]];
 const pos=[],col=[],idx=[],outline=[];
 const tones=[0xa74d37,0xca6744,0xe08a52,0xeeae72,0x994331,0xc6744d,0xd98e58],deep=new THREE.Color(0x804335);
 for(let k=0;k<rings.length;k++)for(let j=0;j<n;j++){
  const a=j/n*Math.PI*2;
  // One continuous crooked contour runs through every coloured stratum. A
  // repeated perfect cylinder would erase the illustrated cliff silhouette.
  const scallop=1+.082*Math.sin(a*3+phase)+.051*Math.cos(a*5-phase*.57)+.031*Math.sin(a*9+phase*.31)+.018*Math.cos(a*13-phase);
  const local=scallop*(1+.018*Math.sin(k*2.7+a*4.1+phase));
  const x=Math.cos(a)*t.rx*rings[k][1]*local,z=Math.sin(a)*t.rz*rings[k][1]*local;
  pos.push(x,rings[k][0]+(village?0:.22*Math.sin(a*7+k*.7+phase)),z);
  const band=k<2?deep:new THREE.Color(tones[(Math.floor(k/2)+Math.floor(j/5)+t.seed)%tones.length]);
  const color=band.clone().multiplyScalar(.88+.075*Math.sin(a*4+phase)+.035*(k%2));
  col.push(color.r,color.g,color.b);
  if(k===rings.length-1)outline.push(new THREE.Vector2(x,-z));
 }
 for(let k=0;k<rings.length-1;k++)for(let j=0;j<n;j++){
  const a=k*n+j,b=k*n+(j+1)%n;idx.push(a,b,a+n,b,b+n,a+n);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.setIndex(idx);geo.computeVertexNormals();
 const wall=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.96,flatShading:true,side:THREE.DoubleSide}));wall.position.set(t.x,0,t.z);wall.castShadow=wall.receiveShadow=true;g.add(wall);
 const cap=new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(outline)),material(village?0xd2b17e:t.seed%2?0xd1a371:0xc59364));cap.rotation.x=-Math.PI/2;cap.position.set(t.x,t.h+.05,t.z);cap.castShadow=cap.receiveShadow=true;g.add(cap);
 if(!village)for(let i=0;i<2;i++)addTerrace(g,t,REGIONS[1],i);
 for(let i=0;i<(village?23:16);i++){
  const a=i*2.399+phase*.38,rad=.17+(i%5)*.11;
  const px=t.x+Math.cos(a)*t.rx*rad,pz=t.z+Math.sin(a)*t.rz*rad;
  const patch=add(g,leafGeo,i%4===0?0x759066:i%3===0?0x9ba36b:0x877f59,px,t.h+.12,pz,1.0+(i%3)*.4,.10,1.2+(i%2)*.39);patch.rotation.y=a;
  if(i%3===0)add(g,cragGeo,i%2?0xdda16a:0xa76042,px+Math.sin(a)*1.15,t.h+.28,pz-Math.cos(a)*1.15,.7,.31,.58);
 }
 // Angular shelves, eroded ribs and detached shoal rocks are composed per
 // island. All stay within the existing physics footprint and leave channels.
 for(let i=0;i<(village?14:18);i++){
  const a=i*2.399+phase,rad=.67+(i%4)*.055;
  const x=t.x+Math.cos(a)*t.rx*rad,z=t.z+Math.sin(a)*t.rz*rad;
  const h=village?1.5+(i%3)*.85:t.h*(.18+(i%4)*.13);
  const rib=add(g,cragGeo,i%5===0?0xe0a36d:i%2?0x9a523c:0xc47b50,x,h,z,1.25+(i%3)*.38,village?.9:t.h*.085,1.0+(i%2)*.33);
  rib.rotation.y=a*.62;rib.rotation.z=(i%3-1)*.065;
  if(i%2===0){
   const ledge=add(g,cragGeo,i%4===0?0xda9a66:0xb66a47,x+Math.cos(a)*.45,h+1.0,z+Math.sin(a)*.45,1.65+(i%3)*.40,.35,1.23+(i%2)*.26);ledge.rotation.y=a;
  }
  const shore=add(g,cragGeo,i%3===0?0xe1af79:0xa86144,t.x+Math.cos(a)*t.rx*(.86+(i%2)*.045),.15,t.z+Math.sin(a)*t.rz*(.86+(i%2)*.045),1.14+(i%3)*.32,.78+(i%2)*.22,.84+(i%2)*.25);shore.rotation.y=a;
 }
 for(let i=0;i<6;i++){
  const a=i*2.399+phase*.63,rad=1.02+(i%3)*.035;
  const reef=add(g,cragGeo,i%2?0xd39865:0x9b573d,t.x+Math.cos(a)*t.rx*rad,.05,t.z+Math.sin(a)*t.rz*rad,.80+(i%3)*.23,.55+(i%2)*.17,.70+(i%2)*.22);
  reef.rotation.y=a;reef.rotation.z=(i%3-1)*.12;
 }
 for(const shelf of REDROCK_SHOALS)if(shelf.seed===t.seed)addRedrockShallowShelf(g,t,shelf);
 if(!village){
  // The crest is intentionally different on each tower island.
  const spires=t.seed===11?4:t.seed===13?2:3;
  for(let i=0;i<spires;i++){
   const a=i*2.399+t.seed*.31,rad=i===0?.12:.34,high=8+(i%3)*3.8+(t.seed%3)*1.8;
   const x=t.x+Math.cos(a)*t.rx*rad,z=t.z+Math.sin(a)*t.rz*rad;
   for(let k=0;k<3;k++){
    const part=add(g,cragGeo,k===1?0xa85a3f:k===2?0xe0a16e:0xbf754d,x+(k%2)*.22,t.h+high*(k+.5)/3,z-(k%2)*.14,2.15-k*.17,high/6+.13,1.75-k*.12);part.rotation.y=a+k*.23;
   }
   const crown=add(g,cragGeo,i%2?0xe4a46d:0xc37a4d,x+(i%2)*.21,t.h+high+.48,z,1.35,1.4,1.17);crown.rotation.z=(i%2?1:-1)*.13;
  }
  for(let i=0;i<4;i++){
   const a=i*2.399+phase*.43,rad=.43+(i%2)*.11;
   const fin=add(g,cragGeo,i%2?0xa7553e:0xce8255,t.x+Math.cos(a)*t.rx*rad,t.h*.79,t.z+Math.sin(a)*t.rz*rad,2.5+(i%2)*.6,t.h*.18,2.0+(i%2)*.45);
   fin.rotation.z=(i%2?1:-1)*.14;fin.rotation.y=a;
  }
 }
 if(t.seed===11){
  // A narrow turquoise fall breaks the warm cliff mass without a costly
  // simulation. Its pale foam makes the landing point readable from sea.
  const a=REGIONS[1].angle+Math.PI,edge=.76,fx=t.x+Math.cos(a)*t.rx*edge,fz=t.z+Math.sin(a)*t.rz*edge;
  const fallMat=new THREE.MeshStandardMaterial({color:0x9fe0d6,roughness:.28,transparent:true,opacity:.73,depthWrite:false,side:THREE.DoubleSide});
  for(let i=-1;i<=1;i++){
   const m=new THREE.Mesh(boxGeo,fallMat);m.position.set(fx+Math.cos(a+Math.PI/2)*i*.66,t.h*.43,fz+Math.sin(a+Math.PI/2)*i*.66);m.scale.set(.57,t.h*.72,.20);m.rotation.y=-a;m.renderOrder=5;g.add(m);
  }
  for(let i=0;i<6;i++){const aa=i*2.399,foam=add(g,leafGeo,i%2?0xdaf4df:0x87c9c8,fx+Math.cos(aa)*1.5,.45,fz+Math.sin(aa)*1.25,.85,.33,.65);foam.rotation.y=aa;}
 }
 instanceKit(g);return g;
}
function addRegionalLandmark(g,t,r){
 if(t.seed>=50||t.seed%10!==1)return;
 const x=t.x-t.rx*.19,z=t.z+t.rz*.12,y=t.h;
 if(r.id==='harbor'){
  for(const s of [-1,1]){
   add(g,stoneGeo,0xc7b396,x+s*3.1,y+2.8,z,1.05,5.6,1.05);
   add(g,leafGeo,0xe0c7a0,x+s*3.1,y+5.5,z,1.3,.55,1.3);
  }
  box(g,0xc4aa81,x,y+5.55,z,7.8,.68,1.4);
  add(g,leafGeo,0x6f9b68,x,y+.5,z+3,2.1,.75,1.4);
 }else if(r.id==='redrock'){
  for(let i=0;i<3;i++){
   const px=x+(i-1)*4.2,pz=z+(i%2)*2.8,height=7+i*2.2;
   for(let k=0;k<4;k++)add(g,stoneGeo,k%2?shade(r.rock,.75):shade(r.rock,1.13),px+(k%2)*.17,y+height*(k+.5)/4,pz,1.65-k*.13,height/4*1.04,1.55-k*.13);
   add(g,leafGeo,0xb8845e,px,y+height+.15,pz,1.8,.3,1.7);
  }
 }else if(r.id==='fjord'){
  for(const s of [-1,1]){
   box(g,0x637987,x+s*3.2,y+4.3,z,1.5,8.6,1.55);
   box(g,0xa0aca6,x+s*3.2,y+8.7,z,2.1,.46,2.1);
  }
  box(g,0x8299a2,x,y+8.9,z,8.5,.7,1.8);
  for(let i=0;i<5;i++)box(g,0x526e72,x+(i-2)*1.45,y+6.7,z+.88,.17,3.7,.2);
 }else if(r.id==='reef'){
  for(let i=0;i<9;i++){
   const a=i*2.399,px=x+Math.cos(a)*5.4,pz=z+Math.sin(a)*4.5,high=1.9+(i%3)*.75;
   const stem=add(g,stoneGeo,i%2?0xe79e8e:0xb7cba5,px,y+high/2,pz,.18,high,.18);stem.rotation.z=Math.sin(a)*.15;
   for(let k=0;k<3;k++)add(g,leafGeo,k%2?0xf1bc9e:0xd27f89,px+Math.cos(a+k*2.1)*.42,y+high*(.65+k*.12),pz+Math.sin(a+k*2.1)*.42,.52,.24,.47);
  }
 }else{
  for(let i=0;i<4;i++){
   const px=x+(i-1.5)*2.7,height=6+(i%2)*3;
   box(g,i%2?0x657e82:0x9badab,px,y+height/2,z+(i%2)*1.1,1.4,height,1.6);
   add(g,leafGeo,0x527e70,px,y+height+.28,z+(i%2)*1.1,1.45,.5,1.3);
  }
  box(g,0x516a70,x,y+7.7,z,12,.62,1.8);
 }
}
function createReefTerrain(t){
 const g=new THREE.Group();g.name=`翡翠環礁 · 手塑淺灘島 ${t.seed}`;
 const n=t.seed===32?48:28,phase=t.seed*1.37;
 const rings=[[-1.62,1.54],[-.78,1.43],[-.19,1.29],[.23,1.17],[.76,1.08],[Math.max(1.15,t.h*.58),.97],[t.h-.09,.83],[t.h,.82]];
 const pos=[],col=[],idx=[],outline=[];
 const tones=[0x8ec7b2,0xb8d7ae,0xe2d6a3,0xf0ddb1,0xe9d5a3,0xd6c494,0xb4bd89,0xe8d4a5];
 for(let k=0;k<rings.length;k++)for(let j=0;j<n;j++){
  const a=j/n*Math.PI*2;
  const irregular=1+.105*Math.sin(a*3+phase)+.066*Math.cos(a*5-phase*.47)+.035*Math.sin(a*8+phase*.8)+.018*Math.cos(a*13-phase);
  const bite=1-.12*Math.exp(-Math.pow(Math.sin(a*2+phase*.3)*3,2));
  const radius=rings[k][1]*irregular*bite*(1+.018*Math.sin(k*1.8+a*7+phase));
  const x=Math.cos(a)*t.rx*radius,z=Math.sin(a)*t.rz*radius;
  const y=rings[k][0]+(k>1&&k<6?.09*Math.sin(a*9+k+phase):0);
  pos.push(x,y,z);
  const tint=new THREE.Color(tones[k]).multiplyScalar(.94+.05*Math.sin(a*6+phase+k*.7));col.push(tint.r,tint.g,tint.b);
  if(k===rings.length-1)outline.push(new THREE.Vector2(x,-z));
 }
 for(let k=0;k<rings.length-1;k++)for(let j=0;j<n;j++){
  const a=k*n+j,b=k*n+(j+1)%n;idx.push(a,b,a+n,b,b+n,a+n);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.setIndex(idx);geo.computeVertexNormals();
 const shoal=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.96,flatShading:true,side:THREE.DoubleSide}));shoal.name=`環礁水下沙坡 ${t.seed}`;shoal.position.set(t.x,0,t.z);shoal.castShadow=shoal.receiveShadow=true;g.add(shoal);
 const cap=new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(outline)),material(t.seed%3===0?0xe8d7aa:0xedddb7));cap.rotation.x=-Math.PI/2;cap.position.set(t.x,t.h+.025,t.z);cap.castShadow=cap.receiveShadow=true;g.add(cap);
 // Sand remains visible around a broken, grass-covered center, so every
 // island reads as a beach rather than a copied green cylinder.
 for(let i=0;i<(t.seed===32?34:5);i++){
  const a=i*2.399+phase,rad=.18+(i%4)*.115;
  const x=t.x+Math.cos(a)*t.rx*rad,z=t.z+Math.sin(a)*t.rz*rad;
  const patch=add(g,leafGeo,i%3===0?0x8faa68:i%2?0x6f9e70:0xa5b979,x,t.h+.11,z,t.seed===32?3.35:1.15,.14,t.seed===32?2.75:1.0);patch.rotation.y=a;
 }
 // Partly submerged sand tongues and coral heads make the turquoise lagoon
 // legible through the transparent water without closing the sailing gaps.
 for(let i=0;i<7;i++){
  const a=i*2.399+phase*.47,reach=1.13+(i%3)*.13;
  const x=t.x+Math.cos(a)*t.rx*reach,z=t.z+Math.sin(a)*t.rz*reach;
  const tongue=add(g,leafGeo,i%2?0xe8d8a7:0xcbd2a3,x,-.79+(i%3)*.26,z,1.8+(i%3)*.45,.22,1.45+(i%2)*.35);tongue.rotation.y=a;
  for(let j=0;j<3;j++){
   const ca=a+j*2.1,cx=x+Math.cos(ca)*(.42+j*.24),cz=z+Math.sin(ca)*(.38+j*.23);
   const stem=add(g,stoneGeo,(i+j)%3===0?0xeea692:(i+j)%3===1?0x93c8b4:0xe0c08d,cx,-.68,cz,.14,.63+(j%2)*.25,.14);stem.rotation.z=Math.cos(ca)*.23;
   add(g,leafGeo,j%2?0xf2b9a0:0xa7d3b6,cx,-.27,cz,.32,.15,.28);
   add(g,leafGeo,(i+j)%2?0xe2a88e:0x87bda9,cx+Math.cos(ca)*.38,-.56,cz+Math.sin(ca)*.33,.57,.34,.49);
   if(j===1||j===2){const coral=add(g,cragGeo,j===1?0xed8d79:0x81b9aa,cx+Math.cos(ca)*.68,-.70,cz+Math.sin(ca)*.59,.82,.42,.68);coral.rotation.y=ca;}
  }
 }
 for(let i=0;i<6;i++){
  const a=i*2.399+phase*.23,reach=1.38+(i%2)*.10;
  const x=t.x+Math.cos(a)*t.rx*reach,z=t.z+Math.sin(a)*t.rz*reach;
  const garden=add(g,leafGeo,i%3===0?0xd9877d:i%3===1?0x91c4ab:0xe6b692,x,-1.62,z,1.75+(i%3)*.45,.31,1.55+(i%2)*.50);garden.rotation.y=a;
  for(let k=0;k<3;k++)add(g,leafGeo,k%2?0xf0a894:0xa2d1b3,x+Math.cos(a+k*2.1)*.80,-1.29,z+Math.sin(a+k*2.1)*.68,.39,.31,.36);
 }
 for(let i=0;i<6;i++){
  const a=i*2.399+phase*.8,x=t.x+Math.cos(a)*t.rx*.73,z=t.z+Math.sin(a)*t.rz*.73;
  const pebble=add(g,cragGeo,i%2?0xd9c89a:0xb6b98c,x,t.h+.12,z,.46+(i%3)*.16,.27,.40+(i%2)*.13);pebble.rotation.y=a;
 }
 instanceKit(g);return g;
}
// Build one continuous, submerged shelf for each annotated resort cluster.
// A network of wide shoal corridors joins the island skirts under water; it
// never becomes a surface bridge or a new collision obstacle for ships.
export function createReefClusterBeds(){
 const group=new THREE.Group();group.name='翡翠環礁 · 共用水下礁台';
 const main=TERRAIN.find(t=>t.seed===32),step=2;
 const smoothstep=t=>{const v=THREE.MathUtils.clamp(t,0,1);return v*v*(3-2*v);};
 for(const cluster of REEF_CLUSTER_BEDS){
  const islands=cluster.seeds.map(seed=>TERRAIN.find(t=>t.seed===seed));
  if(islands.some(t=>!t))throw new Error(`Missing reef island in ${cluster.id} cluster`);
  // A short minimum-spanning network keeps every underwater bank connected
  // without filling the entire lagoon or swallowing the church's main island.
  const reached=new Set([islands[0]]),links=[];
  while(reached.size<islands.length){
   let nearest=null;
   for(const a of reached)for(const b of islands){
    if(reached.has(b))continue;
    const distance=Math.hypot(a.x-b.x,a.z-b.z);
    if(!nearest||distance<nearest.distance)nearest={a,b,distance};
   }
   links.push(nearest);reached.add(nearest.b);
  }
  const field=(x,z)=>{
   let d=Infinity;
   for(const t of islands){
    const rx=t.rx*1.75+2,rz=t.rz*1.75+2;
    d=Math.min(d,(Math.hypot((x-t.x)/rx,(z-t.z)/rz)-1)*Math.min(rx,rz));
   }
   for(const {a,b,distance} of links){
    const dx=b.x-a.x,dz=b.z-a.z,u=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(distance*distance),0,1);
    const width=11.5+2.5*Math.sin(u*Math.PI);
    d=Math.min(d,Math.hypot(x-a.x-dx*u,z-a.z-dz*u)-width);
   }
   // Softly broken shoreline, rather than a copied oval around every islet.
   d+=.85*Math.sin(x*.24+z*.11)*Math.sin(z*.19-x*.07)+.38*Math.sin(x*.47-z*.31);
   // Keep the shared foundations out of the main church island's footprint.
   const outsideMain=Math.hypot((x-main.x)/(main.rx*1.28),(z-main.z)/(main.rz*1.28))-1;
   return Math.max(d,-outsideMain*15);
  };
  const margin=27,minX=Math.floor((Math.min(...islands.map(t=>t.x-t.rx*1.75))-margin)/step)*step;
  const maxX=Math.ceil((Math.max(...islands.map(t=>t.x+t.rx*1.75))+margin)/step)*step;
  const minZ=Math.floor((Math.min(...islands.map(t=>t.z-t.rz*1.75))-margin)/step)*step;
  const maxZ=Math.ceil((Math.max(...islands.map(t=>t.z+t.rz*1.75))+margin)/step)*step;
  const width=Math.round((maxX-minX)/step),depth=Math.round((maxZ-minZ)/step);
  const samples=[];
  for(let j=0;j<=depth;j++)for(let i=0;i<=width;i++){
   const x=minX+i*step,z=minZ+j*step;samples.push({x,z,d:field(x,z)});
  }
  const positions=[],colors=[];
  const pushVertex=point=>{
   const shelf=smoothstep(-point.d/6.5);
   const ripple=.055*Math.sin(point.x*.39+point.z*.16)+.035*Math.cos(point.z*.44-point.x*.10);
   const y=-2.075+1.36*shelf+ripple*shelf;
   positions.push(point.x,y,point.z);
   const color=new THREE.Color(0x70afa2).lerp(new THREE.Color(0xe7d8aa),shelf*.92);
   color.multiplyScalar(.92+.08*Math.sin(point.x*.32)*Math.cos(point.z*.27));
   colors.push(color.r,color.g,color.b);
  };
  const emitTriangle=(a,b,c)=>{
   let polygon=[a,b,c],clipped=[];
   for(let k=0;k<polygon.length;k++){
    const p=polygon[k],q=polygon[(k+1)%polygon.length],inside=p.d<=0,nextInside=q.d<=0;
    if(inside)clipped.push(p);
    if(inside!==nextInside){const u=p.d/(p.d-q.d);clipped.push({x:p.x+(q.x-p.x)*u,z:p.z+(q.z-p.z)*u,d:0});}
   }
   for(let k=1;k<clipped.length-1;k++){pushVertex(clipped[0]);pushVertex(clipped[k]);pushVertex(clipped[k+1]);}
  };
  for(let j=0;j<depth;j++)for(let i=0;i<width;i++){
   const p=j*(width+1)+i,a=samples[p],b=samples[p+1],c=samples[p+width+1],d=samples[p+width+2];
   // Winding faces upward so the shallow sand catches sunlight through water.
   emitTriangle(a,d,b);emitTriangle(a,c,d);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.computeVertexNormals();
  const bed=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,flatShading:true,side:THREE.DoubleSide}));
  bed.name=`翡翠環礁 · ${cluster.name}共用水下礁台`;
  bed.userData.memberSeeds=[...cluster.seeds];bed.userData.links=links.map(({a,b})=>[a.seed,b.seed]);
  bed.receiveShadow=true;group.add(bed);
 }
 return group;
}
export function createTerrainBase(t){
 const g=new THREE.Group(),r=REGIONS.find(r=>r.id===t.region);g.name=`${r.name} cliff ${t.seed}`;
 if(r.id==='redrock')return createRedrockTerrain(t);
 if(r.id==='reef')return createReefTerrain(t);
 // A single shared contour through every stratum prevents the offset, rotated-column look.
 const harbor=r.id==='harbor',n=harbor?48:24,phase=t.seed*1.73;
 const rings=harbor?[[-1.35,1.06],[-.28,1.015],[.18,.97],[t.h*.14,.95],[t.h*.28,.90],[t.h*.43,.88],[t.h*.55,.90],[t.h*.70,.84],[t.h*.84,.83],[t.h-.18,.79],[t.h,.785]]:[[-1.25,1.10],[.15,1.015],[t.h*.20,.99],[t.h*.40,.91],[t.h*.61,.94],[t.h*.82,.855],[t.h-.15,.79],[t.h,.77]];
 const positions=[],colors=[],indices=[],coast=[];
 const rockColor=new THREE.Color(r.rock),sandColor=new THREE.Color(r.id==='reef'?0xe2d6aa:0xd5c39e),harborOchre=new THREE.Color(0xc9ad84);
 for(let k=0;k<rings.length;k++)for(let j=0;j<n;j++){
  const a=j/n*Math.PI*2,rough=t.h>8?1.7:1;
  const ir=harbor?.92+.068*Math.sin(a*3+phase)+.037*Math.cos(a*5-phase*.7)+.023*Math.sin(a*9+phase*.4)+.013*Math.cos(a*13-phase*.9):1+rough*(.055*Math.sin(a*3+phase)+.037*Math.cos(a*5-phase*.7)+.023*Math.sin(a*9+phase*.4));
  const radius=rings[k][1]*ir*(1+(harbor?.034:.012)*Math.sin(k*3+a*4+phase));
  const x=Math.cos(a)*t.rx*radius,z=Math.sin(a)*t.rz*radius,y=rings[k][0]+(k>1&&k<rings.length-2?(harbor?.28:.16)*Math.sin(a*7+phase+k):0);
  positions.push(x,y,z);
  const source=harbor&&k>1&&k<5?harborOchre:k<2?sandColor:rockColor;
  const c=source.clone().multiplyScalar(k<2?1:harbor?.79+((k+1)%4)*.056+.07*Math.sin(a*5+phase):.80+((k+1)%3)*.075+.07*Math.sin(a*6+phase));colors.push(c.r,c.g,c.b);
  if(k===rings.length-1)coast.push(new THREE.Vector2(x,-z));
 }
 for(let k=0;k<rings.length-1;k++)for(let j=0;j<n;j++){const a=k*n+j,b=k*n+(j+1)%n;indices.push(a,b,a+n,b,b+n,a+n);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
 const sideMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.91,flatShading:true,side:THREE.DoubleSide});
 const cliff=new THREE.Mesh(geo,sideMat);cliff.position.set(t.x,0,t.z);cliff.castShadow=cliff.receiveShadow=true;g.add(cliff);
 const capGeo=new THREE.ShapeGeometry(new THREE.Shape(coast));const cap=new THREE.Mesh(capGeo,material(r.grass));cap.rotation.x=-Math.PI/2;cap.position.set(t.x,t.h+.025,t.z);cap.castShadow=cap.receiveShadow=true;g.add(cap);
 // Overlapping asymmetric upper terraces interrupt the single flat plateau.
 if(t.h>11)for(let i=0;i<(r.id==='reef'?1:2);i++)addTerrace(g,t,r,i);
 for(let i=0;i<5;i++){
  const a=i*2.399+phase,rad=.88+.07*Math.sin(i*5+phase);
  const x=t.x+Math.cos(a)*t.rx*rad,z=t.z+Math.sin(a)*t.rz*rad;
  const b=add(g,leafGeo,i%3===0?shade(r.rock,.76):shade(r.rock,1.08),x,.45,z,1.2+(i%3)*.7,.7+(i%2)*.25,1.1+(i%2)*.6);b.rotation.y=a;
 }
 // Fine relief is kept even when a region's detailed vegetation is streamed out.
 for(let i=0;i<11;i++){
  const a=i*2.399+phase*.55,rad=.22+(i%5)*.105;
  const x=t.x+Math.cos(a)*t.rx*rad,z=t.z+Math.sin(a)*t.rz*rad;
  const patch=add(g,leafGeo,i%3===0?shade(r.grass,1.12):shade(r.grass,.83),x,t.h+.10,z,1.1+(i%3)*.47,.12,1.05+(i%4)*.32);patch.rotation.y=a;
 }
 if(t.h>8)for(let i=0;i<10;i++){
  const a=i*2.399+phase,edge=.82+.045*Math.sin(a*4);
  const x=t.x+Math.cos(a)*t.rx*edge,z=t.z+Math.sin(a)*t.rz*edge;
  if(r.id==='fjord'||r.id==='mist'){
   const shard=add(g,stoneGeo,i%3?shade(r.rock,.77):shade(r.rock,1.12),x,t.h*(.34+.07*(i%3)),z,.68+(i%3)*.28,t.h*(.38+.07*(i%3)),.78+(i%2)*.38);shard.rotation.y=a*.5;
  }else if(r.id==='redrock'){
   for(let k=0;k<2;k++){const ledge=add(g,stoneGeo,k?shade(r.rock,1.14):shade(r.rock,.73),x,t.h*(.27+k*.22),z,1.65+(i%3)*.48,.55,1.4+(i%2)*.3);ledge.rotation.y=a*.38;}
  }else{
   const b=add(g,leafGeo,i%3?shade(r.rock,1.16):0xd8c89b,x,t.h*.22,z,1.4+(i%3)*.45,.76+(i%2)*.25,1.1+(i%2)*.4);b.rotation.y=a;
  }
 }
 if(harbor){
  // Jagged sandstone shoulders and detached shelf stones remain inside the
  // existing island collider, so the more intricate coast stays navigable.
  for(let i=0;i<(t.seed===51?16:12);i++){
   const a=i*2.399+phase,rad=.68+(i%4)*.054,mid=i%3===0;
   const x=t.x+Math.cos(a)*t.rx*rad,z=t.z+Math.sin(a)*t.rz*rad;
   const size=(t.seed===51?1.4:1.0)*(1+(i%4)*.22);
   const rock=add(g,cragGeo,i%4===0?0xdac399:i%3===0?0x967b61:0xb69b78,x,mid?t.h*.39:.42,z,size*1.05,mid?Math.max(1.4,t.h*.20):.85+(i%3)*.28,size*.82);
   rock.rotation.y=a*.56;rock.rotation.z=(i%3-1)*.08;
  }
  if(t.h>12)for(let i=0;i<5;i++){
   const a=i*2.399+phase*.31,rad=.30+(i%2)*.13;
   const rock=add(g,cragGeo,i%2?0xb19979:0xc8b18c,t.x+Math.cos(a)*t.rx*rad,t.h+2.0+(i%3)*.65,t.z+Math.sin(a)*t.rz*rad,2.7+(i%2)*.5,3.9+(i%3)*1.2,1.9+(i%2)*.5);
   rock.rotation.y=a;
  }
 }
 addRegionalLandmark(g,t,r);
 return g;
}
function createHarborPort(r){
 const port=new THREE.Group();port.name='Warm Sand Harbor waterfront';
 port.position.set(r.dock.x,0,r.dock.z);port.rotation.y=Math.PI/2-r.angle;
 const wood=0x9b7049,edge=0x674c38;
 // A cross quay, two working slips and uneven board planks give the harbor a
 // real shoreline footprint instead of a single bare rectangle.
 box(port,wood,0,1.18,5,4.7,.27,22);
 for(let i=0;i<25;i++)box(port,i%4===0?0xbe9060:0xa67b50,0,1.35,-5.5+i*.82,4.42,.07,.68);
 box(port,wood,0,1.28,6,31,.25,4.25);
 for(let i=0;i<35;i++)box(port,i%5===0?0xc19560:0xa77c50,-14.8+i*.87,1.46,6,.70,.06,4.08);
 for(const side of [-1,1]){
  box(port,wood,side*12,1.22,4,3.2,.24,14);
  for(let i=0;i<16;i++)box(port,i%3===0?0xb88959:0x987048,side*12,1.39,-2.5+i*.85,3.02,.055,.69);
  box(port,0xb38b5e,side*12,1.53,9,8,.22,7);
  for(let i=0;i<4;i++)for(const s of [-1,1])box(port,edge,side*12+s*3.5,.1,5+i*2, .24,2.5,.24);
 }
 for(let i=-4;i<=4;i++)for(const s of [-1,1]){
  box(port,edge,s*2.16,.08,i*2.35+4,.25,2.5,.25);
  if(i%2===0){box(port,0x775640,s*2.16,2.0,i*2.35+4,.12,1.8,.12);add(port,leafGeo,0xefc77c,s*2.16,2.85,i*2.35+4,.27,.38,.27);}
 }
 // Different roof silhouettes and low stilt construction frame the dock.
 for(const [x,z,slot] of [[-12,9,6],[12,9,3],[-18,10,1]]){
  const building=new THREE.Group();house(building,r,0,1.65,0,slot,true);building.position.set(x,0,z);building.rotation.y=Math.PI+(x<0?-.10:.14);port.add(building);
 }
 // Tavern banner, hanging signs, fishing gear and warm cargo colours.
 box(port,0x5d4036,-11.7,6.55,4.9,3.4,.92,.16);
 box(port,0xe0ba72,-11.7,6.55,4.79,2.9,.59,.08);
 for(const s of [-1,1]){add(port,roundGeo,0xe4be75,-11.7+s*.85,6.55,4.68,.27,.1,.27);box(port,edge,-11.7+s*1.78,6.55,4.9,.12,1.1,.13);}
 for(let i=0;i<16;i++){
  const x=(i%2?1:-1)*(4+(i%4)*1.25),z=3+(i%5)*1.5;
  if(i%3===0)add(port,stoneGeo,0xb48256,x,1.94,z,.42,.78,.42);
  else box(port,i%4===0?0x637d78:0xa47952,x,1.80,z,.72,.64,.72);
 }
 for(let i=0;i<15;i++){
  const stair=box(port,i%3===0?0xd7b58b:0xc7a67c,4.8,1.68+i*.27,5.7+i*.55,3.2,.36,.64);
  stair.rotation.y=Math.sin(i*.58)*.045;
  if(i%4===0)add(port,cragGeo,0xa78d6b,7.35,2+i*.27,5.7+i*.55,.62,.5,.54);
 }
 for(let i=0;i<4;i++){const x=i%2?-15:16,z=10+(i>>1)*2;
  add(port,stoneGeo,0xb78358,x,1.89,z,.56,.72,.56);
  harborPlant(port,x,2.27,z,3+i,false);
 }
 // A small moored workboat makes the quay legible from the sailing camera.
 const skiff=add(port,leafGeo,0x5e4033,17,.20,-4,2.5,.38,1.05);skiff.rotation.y=-.24;
 box(port,0xc59664,17,.52,-4,1.12,.12,.65);
 box(port,edge,17,1.9,-4,.10,2.9,.10);
 const sail=add(port,roofGeo,0xe4d8ad,17.5,2.45,-4,1.1,1.4,.08);sail.rotation.y=-.22;
 consolidateChunk(port);
 return port;
}
function createHarborSkyhouse(mainlandSeed,isletSeed){
 const mainland=TERRAIN.find(t=>t.region==='harbor'&&t.seed===mainlandSeed),islet=TERRAIN.find(t=>t.region==='harbor'&&t.seed===isletSeed);
 const dx=islet.x-mainland.x,dz=islet.z-mainland.z,span=Math.hypot(dx,dz);
 const g=new THREE.Group();g.name=`暖沙港 · ${isletSeed===0?'西側':'東側'}空中橋屋`;
 g.position.set((mainland.x+islet.x)/2,0,(mainland.z+islet.z)/2);
 g.rotation.y=-Math.atan2(dz,dx);
 const dark=0x6c4b36,wood=0x9b704a,light=0xc59a63,plaster=0xe6c9a5,teal=0x4e8e8c,coral=0xc97d58,roofColor=isletSeed===0?0xb86649:0x557c76;
 const beam=(color,a,b,width=.12,depth=width)=>{
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),middle=from.clone().add(to).multiplyScalar(.5);
  const m=box(g,color,middle.x,middle.y,middle.z,width,from.distanceTo(to),depth);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.sub(from).normalize());return m;
 };
 // The deck spans the actual water gap. Only the outer ends are braced into
 // rock; nothing reaches sea level in the channel beneath the house.
 const deckLength=span-12;
 box(g,dark,0,19.15,0,deckLength,.42,5.5);
 for(let i=0;i<Math.floor(deckLength/.7);i++){
  const x=-deckLength/2+.42+i*.7;
  box(g,i%5===0?light:wood,x,19.40,0,.56,.10,5.38);
 }
 for(const side of [-1,1]){
  box(g,dark,0,18.84,side*2.57,deckLength,.24,.22);
  for(let x=-deckLength/2+.65;x<deckLength/2;x+=2.3){
   box(g,dark,x,20.23,side*2.51,.13,1.65,.13);
   if(Math.abs(x)>7.8)box(g,light,x,20.77,side*2.52,.24,.16,.25);
  }
  box(g,light,0,21.01,side*2.52,deckLength,.13,.14);
  box(g,wood,0,20.23,side*2.52,deckLength,.07,.10);
 }
 for(const side of [-1,1]){
  const end=side*deckLength/2;
  box(g,dark,end,18.25,0,.40,2.9,5.7);
  for(const z of [-2.3,2.3]){
   const shoreHeight=(side>0?islet.h:mainland.h)+.15;
   beam(dark,[end-side*6.8,18.93,z],[end,shoreHeight,z],.29,.29);
   beam(light,[end-side*4.4,19.0,z],[end,shoreHeight+.25,z],.12,.12);
  }
 }
 // A hand-built bridge house: layered roof, sea-facing shutters, balconies,
 // carved timber framing, awnings, warm windows and hanging lamps.
 box(g,dark,0,19.66,0,13.5,.35,6.1);
 box(g,plaster,0,21.60,0,11.7,3.65,5.9);
 for(const x of [-5.8,5.8])for(const z of [-2.93,2.93])box(g,dark,x,21.62,z,.19,3.88,.19);
 for(const side of [-1,1]){
  box(g,dark,0,23.50,side*3.02,12.1,.17,.18);
  box(g,light,0,19.86,side*3.04,12.3,.16,.18);
  for(const x of [-3.65,0,3.65]){
   box(g,dark,x,21.83,side*3.05,1.53,1.52,.15);
   box(g,0x75adb1,x,21.83,side*3.16,1.18,1.17,.10);
   box(g,light,x,21.83,side*3.23,.10,1.26,.12);
   box(g,light,x,21.83,side*3.23,1.27,.10,.12);
   for(const s of [-1,1])box(g,teal,x+s*.88,21.83,side*3.19,.22,1.5,.12);
   box(g,wood,x,21.02,side*3.28,1.63,.16,.43);
   for(let k=-1;k<=1;k++)add(g,leafGeo,k===0?0xda9b77:0x6d9b68,x+k*.43,21.20,side*3.33,.30,.28,.31);
  }
  const awning=box(g,side>0?coral:teal,0,23.35,side*3.71,10.2,.15,1.75);awning.rotation.x=side*.13;
  for(let k=-4;k<=4;k++)box(g,k%2?0xe9d0a5:side>0?0xa85f4c:0x3a7777,k*1.12,23.41,side*3.76,.16,.07,1.75);
  for(const x of [-5.2,5.2]){
   beam(dark,[x,22.9,side*3.0],[x,23.4,side*4.45],.10,.10);
   box(g,0xeac679,x,22.56,side*4.25,.42,.54,.42);
  }
 }
 for(const end of [-1,1]){
  box(g,dark,end*5.97,21.36,0,.15,2.35,1.22);
  box(g,teal,end*6.08,21.36,0,.11,2.08,.96);
  for(const z of [-2.35,2.35])beam(light,[end*6.1,19.6,z],[end*8.1,21.0,z],.12,.12);
 }
 const roof=add(g,roofGeo,roofColor,0,24.25,0,3.95,1.85,7.4);roof.rotation.y=Math.PI/2;
 box(g,0xe4ac71,0,26.08,0,14.8,.15,.18);
 for(let i=0;i<10;i++){
  const x=-6.3+i*1.4;
  for(const side of [-1,1]){
   const rib=box(g,i%2?shade(roofColor,.80):shade(roofColor,1.12),x,24.58,side*2.10,.08,.07,3.0);
   rib.rotation.x=side*.46;
  }
 }
 for(const side of [-1,1])for(const x of [-3.25,3.25]){
  box(g,plaster,x,25.08,side*2.15,1.50,1.20,.82);
  box(g,dark,x,25.06,side*2.61,.97,.83,.13);
  box(g,0x86b8b9,x,25.06,side*2.71,.72,.60,.08);
  box(g,light,x,25.06,side*2.77,.09,.70,.09);
  const dormer=add(g,roofGeo,shade(roofColor,.85),x,25.83,side*2.15,.95,.66,.70);dormer.rotation.y=Math.PI/2;
 }
 box(g,0xc19b75,4.85,26.30,-.9,.70,2.15,.70);
 box(g,dark,4.85,27.44,-.9,.96,.18,.94);
 box(g,dark,0,21.83,-4.55,3.35,1.18,.16);
 box(g,0xf0d6a1,0,21.83,-4.64,2.96,.85,.08);
 for(const x of [-1.04,0,1.04])add(g,leafGeo,0x648b77,x,21.84,-4.72,.20,.28,.11);
 consolidateChunk(g);
 return g;
}
function createRedrockPort(r){
 const port=new THREE.Group();port.name='赤岩鑄砲村 · 層岩港口';
 port.position.set(r.dock.x,0,r.dock.z);port.rotation.y=Math.PI/2-r.angle;
 const sandstone=0xb97950,light=0xd7a473,dark=0x80513e,plank=0x98704a,iron=0x38494b,bronze=0xb78552;
 // Three staggered stone quays make a compact harbour inside the navigation
 // corridor. Their approach is open to the sea, not blocked by a breakwater.
 for(let i=0;i<3;i++){
  const z=3+i*5.9,width=24+i*5;
  box(port,i%2?0xb26c47:sandstone,0,.82,z,width,1.60,5.2);
  box(port,light,0,1.68,z,width+.2,.18,5.35);
  for(let j=0;j<Math.floor(width/1.2);j++){
   const x=-width/2+.7+j*1.2;
   box(port,j%5===0?0xe0b383:0xb98255,x,1.79,z,1.04,.07,5.09);
  }
  for(const side of [-1,1])for(let j=0;j<3;j++){
   const x=side*(width/2-.45),zz=z+(j-1)*1.65;
   const bollard=add(port,stoneGeo,j%2?0xd6a06e:dark,x,2.12,zz,.32,.75,.32);bollard.rotation.y=j*.23;
  }
 }
 for(const side of [-1,1]){
  const x=side*11.6;
  box(port,dark,x,.92,-7.0,3.3,.30,17.5);
  for(let i=0;i<20;i++)box(port,i%4===0?0xc89561:plank,x,1.12,-15+i*.83,3.17,.08,.68);
  for(let i=0;i<6;i++){
   box(port,dark,x+side*1.42,.15,-14+i*2.7,.32,2.4,.32);
   box(port,iron,x+side*1.42,1.70,-14+i*2.7,.43,.12,.43);
  }
  // Raised side workshops are visibly anchored by piles and diagonal braces.
  const terraceX=side*12.1;
  box(port,0x9a6044,terraceX,2.52,12.3,11.5,1.1,8.8);
  box(port,0xd9aa78,terraceX,3.14,12.3,11.8,.18,9.0);
  for(const sx of [-1,1])for(const zz of [8.8,15.8]){
   box(port,dark,terraceX+sx*4.75,1.1,zz,.45,2.2,.45);
   const brace=box(port,plank,terraceX+sx*3.2,1.25,zz,.20,2.9,.20);brace.rotation.z=sx*.62;
  }
  const workshop=new THREE.Group();house(workshop,r,0,3.2,0,side<0?5:6,true);workshop.position.set(terraceX,0,12.3);workshop.rotation.y=Math.PI+(side<0?-.23:.20);workshop.scale.setScalar(1.14);port.add(workshop);
  for(let i=0;i<4;i++){
   const xx=terraceX+(i-1.5)*2.2;
   add(port,stoneGeo,i%2?0x5c5d50:0x6a6658,xx,3.50,8.0,.43,.67,.43);
   box(port,iron,xx,3.9,8.0,.58,.12,.58);
  }
 }
 const chandlery=new THREE.Group();house(chandlery,r,0,5.35,0,18,true);chandlery.position.set(2.8,0,23.2);chandlery.rotation.y=Math.PI+.09;chandlery.scale.setScalar(1.2);port.add(chandlery);
 for(let i=0;i<8;i++){
  const x=-6.2+i*1.8,z=19+(i%2)*1.5;
  box(port,i%3===0?0xb76046:0x6d8e86,x,6.26,z,.92,.12,1.20);
  box(port,dark,x,5.68,z,.12,1.08,.12);
 }
 // A high, hand-built forge balcony with glowing mouth and red sandstone
 // retaining wall. The village still uses the existing dock trigger.
 for(let i=0;i<10;i++){
  const x=-15+i*3.3;
  add(port,cragGeo,i%3===0?0xd29865:i%2?0x9e5a3f:0xbd7952,x,2.45,24.2,1.35,2.4,1.35);
  box(port,dark,x,5.05,24.0,.25,.19,2.25);
 }
 box(port,0x86533d,0,5.17,24.3,32.5,.25,4.6);
 for(let i=-9;i<=9;i++)box(port,i%4===0?0xc89565:plank,i*1.7,5.35,24.3,1.46,.08,4.46);
 for(const side of [-1,1]){
  box(port,dark,side*15.9,6.0,24.3,.16,1.3,4.8);
  for(let i=0;i<5;i++)box(port,bronze,side*15.9,6.79,22.1+i*1.1,.25,.22,.25);
 }
 // Uneven ramp, grain-by-grain steps and scattered dock cargo.
 for(let i=0;i<13;i++){
  const z=25.8+i*.93,y=2.0+i*.28;
  box(port,i%3===0?light:0xbe8159,0,y,z,4.8,.38,.94);
  if(i%3===0)add(port,cragGeo,0xa15f43,3.1,y-.22,z,.56,.5,.53);
 }
 for(let i=0;i<18;i++){
  const side=i%2?1:-1,x=side*(2.5+(i%4)*1.2),z=-1+(i%8)*2.6;
  if(i%3===0)add(port,stoneGeo,0xa46f49,x,2.2,z,.45,.85,.45);
  else box(port,i%4===0?iron:0xac8154,x,2.12,z,.75,.69,.8);
  if(i%5===0)box(port,bronze,x,2.56,z,.78,.08,.82);
 }
 // Yard crane: its chain and hanging ore bucket give the harbour a strong
 // industrial silhouette without animated joints or per-frame allocations.
 box(port,dark,-8.4,6.1,20.4,.75,9.3,.75);
 box(port,plank,-4.1,10.0,20.4,10.0,.38,.55);
 const diagonal=box(port,dark,-6.25,7.65,20.4,.23,5.2,.23);diagonal.rotation.z=-.72;
 box(port,iron,.20,7.85,20.4,.10,4.1,.10);
 add(port,stoneGeo,0x575651,.20,5.55,20.4,.70,.85,.72);
 for(let i=0;i<4;i++)add(port,leafGeo,i%2?0xdb9b58:0x765d44,-8.2+i*.44,10.35,20.4,.18,.22,.20);
 // Varied vegetation grows in pockets between rock and timber, not in rows.
 for(let i=0;i<14;i++){
  const a=i*2.399,side=i%2?1:-1;
  redrockPlant(port,side*(14+(i%3)*2.3),i%3===0?5.35:1.7,8+(i%6)*4.1,14+i,false);
  if(i%3===0)add(port,cragGeo,i%2?0xc68455:0x95563e,side*(12+(i%4)*2.4),2.0,7+(i%6)*4,1.1,.9,.9);
 }
 consolidateChunk(port);return port;
}
export function createVillageBase(r){
 const g=new THREE.Group();g.name=r.village;const homes=new THREE.Group();g.add(homes);g.userData.homes=homes;const u={x:Math.cos(r.angle),z:Math.sin(r.angle)},v={x:-u.z,z:u.x};
 for(const s of villageSlots(r,2)){const h=new THREE.Group();if(r.id==='reef')reefCottage(h,0,s.y,0,s.slot,false);else house(h,r,0,s.y,0,s.slot,false);h.position.set(s.x,0,s.z);h.rotation.y=s.heading;homes.add(h);}
 if(r.id==='harbor')g.add(createHarborPort(r),createHarborSkyhouse(1,0),createHarborSkyhouse(3,4));
 else if(r.id==='redrock')g.add(createRedrockPort(r));
 else if(r.id==='reef'){
  g.add(createReefChapel(TERRAIN.find(t=>t.seed===32)),createReefPier(r));
 }
 else{
  const dock=box(g,0xb38b58,u.x*140,1.1,u.z*140,5,.5,18);dock.rotation.y=-r.angle+Math.PI/2;
  for(let k=0;k<5;k++)for(const s of [-1,1])box(g,0x70533d,u.x*(133+k*3)+v.x*s*2.1,.25,u.z*(133+k*3)+v.z*s*2.1,.3,2.5,.3);
 }
 if(r.id!=='reef')for(let k=0;k<13;k++){const r0=143+k*.83,stair=box(g,0xc8aa7c,u.x*r0,1.3+k*.34,u.z*r0,4,.45,.9);stair.rotation.y=-r.angle+Math.PI/2;}
 consolidateChunk(homes);instanceKit(g);return g;
}
export function* detailsForRegion(r){
 const u={x:Math.cos(r.angle),z:Math.sin(r.angle)},v={x:-u.z,z:u.x};
 if(r.id==='reef'){
  for(const s of villageSlots(r)){
   const home=new THREE.Group();reefCottage(home,0,s.y,0,s.slot,true);home.position.set(s.x,0,s.z);home.rotation.y=s.heading;instanceKit(home);yield home;
  }
  for(const t of TERRAIN.filter(t=>t.region==='reef')){
   const garden=new THREE.Group(),count=t.seed===32?29:5+(t.seed%3);
   for(let i=0;i<count;i++){
    const a=i*2.399+t.seed*.87,rad=.53+(i%3)*.105;
    const x=t.x+Math.cos(a)*t.rx*rad,z=t.z+Math.sin(a)*t.rz*rad;
    if(i%4===0){
     add(garden,leafGeo,i%2?0x4e8a72:0x78a765,x,t.h+.35,z,.95,.60,.82);
     for(let k=0;k<4;k++)add(garden,leafGeo,k%2?0xe8a890:0xffd5a3,x+Math.sin(k*1.57)*.68,t.h+.76,z+Math.cos(k*1.57)*.67,.16,.15,.16);
    }else if(i%5===2){
     add(garden,coneGeo,0x4f8463,x,t.h+.90,z,.42,1.65,.42);
     for(let k=0;k<6;k++){
      const angle=k*1.047+i*.17,leaf=add(garden,leafGeo,k%2?0x71a969:0x91b878,x+Math.cos(angle)*.87,t.h+1.86+(k%2)*.12,z+Math.sin(angle)*.84,1.30,.29,.47);leaf.rotation.y=-angle;leaf.rotation.z=Math.cos(angle)*.15;
     }
    }else if(i%5===3){
     for(let k=0;k<5;k++){
      const angle=k*1.257+i*.35;
      add(garden,leafGeo,k%2?0x4d8d6c:0x7bae77,x+Math.cos(angle)*.46,t.h+.54,z+Math.sin(angle)*.45,.72,.52,.65);
      add(garden,leafGeo,k%2?0xf3b297:0xffdbad,x+Math.cos(angle)*.56,t.h+.98,z+Math.sin(angle)*.54,.16,.15,.16);
     }
    }else tree(garden,x,t.h+.13,z,i+t.seed*3,r,false);
   }
   for(let i=0;i<7;i++){
    const a=i*2.399+t.seed*.54,reach=1.05+(i%3)*.19;
    const x=t.x+Math.cos(a)*t.rx*reach,z=t.z+Math.sin(a)*t.rz*reach;
    for(let j=0;j<4;j++){
     const angle=a+j*1.57,xx=x+Math.cos(angle)*j*.19,zz=z+Math.sin(angle)*j*.19;
     const branch=add(garden,stoneGeo,j%3===0?0xeea28e:j%3===1?0x8cc5b4:0xf0c49c,xx,-.62,zz,.11,.55+j*.18,.11);branch.rotation.z=Math.cos(angle)*.25;
     add(garden,leafGeo,j%2?0xe9b1a0:0xc4d9ae,xx,-.18+j*.10,zz,.27,.13,.25);
    }
   }
   for(let k=0;k<(t.seed===32?6:t.seed%3===0?1:0);k++){
    const a=t.seed*.67+k*2.399,rad=t.seed===32?.69:.55;
    const x=t.x+Math.cos(a)*t.rx*rad,z=t.z+Math.sin(a)*t.rz*rad;
    box(garden,0xa67a53,x,t.h+.95,z,.16,1.9,.16);
    add(garden,coneGeo,k%2?0xeb8974:0xf3c47b,x,t.h+2.05,z,1.55,.38,1.55);
    for(const side of [-1,1])add(garden,leafGeo,0xd7bd93,x+side*.65,t.h+.21,z+.45,.66,.14,.40);
   }
   instanceKit(garden);yield garden;
  }
  return;
 }
 for(const s of villageSlots(r)){
  const g=new THREE.Group();house(g,r,0,s.y,0,s.slot,true);g.position.set(s.x,0,s.z);g.rotation.y=s.heading;instanceKit(g);yield g;
 }
 for(const t of TERRAIN.filter(t=>t.region===r.id)){
  for(let i=0;i<(t.seed>=51?22:r.id==='harbor'?t.seed===0?14:12:r.id==='redrock'?14:8);i++){
   const g=new THREE.Group(),central=t.seed>=51,a=central?i*2.399+t.seed:i*2.4+t.seed;
   const rad=central?.14+(i%7)*.067:r.id==='harbor'?(t.seed===0?.57+(i%3)*.065:.24+(i%4)*.115):.3+(i%3)*.12;
   tree(g,t.x+Math.cos(a)*t.rx*rad,t.h+.6,t.z+Math.sin(a)*t.rz*rad,i,r,central);
   // Vertical flank facets and low shoreline boulders, never protruding into the collision corridor.
   if(r.id==='redrock'){
    for(let k=0;k<3;k++){
     const rib=add(g,cragGeo,k===1?0xdf9c67:k===2?0xa45b3f:0xbf7850,t.x+Math.cos(a)*t.rx*(.72-k*.045),t.h*(.21+k*.24),t.z+Math.sin(a)*t.rz*(.72-k*.045),1.28+(i%3)*.34,t.h*.065,1.1+(i%2)*.29);
     rib.rotation.y=a+k*.26;rib.rotation.z=(i%3-1)*.07;
    }
    if(t.h>10&&i%2===0){
     const lx=t.x+Math.cos(a)*t.rx*.77,lz=t.z+Math.sin(a)*t.rz*.77,ly=t.h*(.31+(i%3)*.14);
     const shelf=add(g,cragGeo,i%3?0xc48255:0xe0a16e,lx,ly,lz,1.65,.48,1.4);shelf.rotation.y=a;
     redrockPlant(g,lx,ly+.63,lz,i+22,false);
    }
   }else{
    for(let k=0;k<4;k++){const b=add(g,stoneGeo,k%2?r.rock:new THREE.Color(r.rock).multiplyScalar(.84).getHex(),t.x+Math.cos(a)*t.rx*(.73-k*.05),t.h*(.12+k*.21),t.z+Math.sin(a)*t.rz*(.73-k*.05),(t.seed>=51?Math.min(t.rx,t.rz)*.21:t.rx*.28),t.h*.19,(t.seed>=51?Math.min(t.rx,t.rz)*.21:t.rz*.24));b.rotation.y=t.seed>=51?0:a+k*.11;}
   }
   const shore=add(g,leafGeo,r.id==='redrock'?(i%2?0xd99c6b:0x98563f):r.rock,t.x+Math.cos(a)*t.rx*.92,.15,t.z+Math.sin(a)*t.rz*.92,1.6,1.0,1.2);shore.rotation.y=a;
   if(r.id==='harbor'&&t.h>10&&i%3===0){
    const ledgeY=t.h*(.43+(i%2)*.14),lx=t.x+Math.cos(a)*t.rx*.82,lz=t.z+Math.sin(a)*t.rz*.82;
    const ledge=add(g,cragGeo,i%2?0xa78d6d:0xc9b38e,lx,ledgeY,lz,2.2,1.35,1.8);ledge.rotation.y=a;
    harborPlant(g,lx,ledgeY+1.50,lz,i+14,false);
    for(let leaf=0;leaf<3;leaf++)add(g,leafGeo,leaf%2?0x5c8b5f:0x7aa166,lx+Math.cos(a+leaf*1.3)*1.3,ledgeY+1.43,lz+Math.sin(a+leaf*1.3)*1.3,.72,.33,.62);
   }
   if(r.id==='reef')for(let branch=0;branch<4;branch++){const xx=t.x+Math.cos(a)*t.rx*.98+branch*.4,zz=t.z+Math.sin(a)*t.rz*.98;const coral=add(g,stoneGeo,branch%2?0xdf987f:0x92c0ac,xx,.35,zz,.12,.9+branch*.15,.12);coral.rotation.z=(branch-1.5)*.25;add(g,leafGeo,0xe9c8a0,xx,.9,zz,.3,.16,.3);}
   instanceKit(g);yield g;
  }
  if(t.h>11)for(let terrace=0;terrace<(r.id==='reef'?1:2);terrace++){
   const g=new THREE.Group(),a=t.seed*2.41+terrace*2.31,outer=terrace===0?.20:.34;
   const cx=t.x+Math.cos(a)*t.rx*outer,cz=t.z+Math.sin(a)*t.rz*outer;
   const rx=t.rx*(terrace===0?.50:.29),rz=t.rz*(terrace===0?.48:.31);
   const rise=Math.min(8,t.h*(terrace===0?.24:.16))+(r.id==='redrock'?2:0);
   for(let j=0;j<(r.id==='redrock'?3:5);j++){
    const angle=j*2.399+t.seed*.8,rad=.17+(j%3)*.17;
    tree(g,cx+Math.cos(angle)*rx*rad,t.h+rise+.06,cz+Math.sin(angle)*rz*rad,terrace*11+j+t.seed,r,t.seed>=51);
   }
   instanceKit(g);yield g;
  }
  const scatter=new THREE.Group();
  for(let i=0;i<12;i++){
   const a=i*2.399+t.seed*.74,rad=.24+(i%5)*.10;
   const x=t.x+Math.cos(a)*t.rx*rad,z=t.z+Math.sin(a)*t.rz*rad;
   const green=i%3===0?shade(r.grass,.68):i%3===1?shade(r.grass,1.13):r.grass;
   if(r.id==='redrock'){
    const shrub=add(scatter,leafGeo,green,x,t.h+.35,z,.72,.43,.62);shrub.rotation.y=a;
   }else{
    for(let k=0;k<3;k++)add(scatter,leafGeo,green,x+Math.sin(a+k*2.1)*.48,t.h+.32,z+Math.cos(a+k*2.1)*.48,.66+(k%2)*.2,.42,.59);
   }
   if(i%3===0){const b=add(scatter,leafGeo,shade(r.rock,1.2),x+Math.sin(a)*1.15,t.h+.29,z-Math.cos(a)*1.15,.62,.42,.78);b.rotation.y=a;}
   if(r.id==='harbor'&&i%2===0){
    for(let k=0;k<4;k++){const da=a+k*1.57;
     const blade=add(scatter,coneGeo,k%2?0x4c855d:0xa2bd73,x+Math.cos(da)*.45,t.h+.58,z+Math.sin(da)*.45,.23,1.05,.23);blade.rotation.z=Math.cos(da)*.36;
    }
    for(let k=0;k<3;k++)add(scatter,leafGeo,k%2?0xe6b673:0xd98272,x+Math.sin(a+k*2)*.44,t.h+.87,z+Math.cos(a+k*2)*.44,.16,.15,.16);
   }
  }
  if(r.id==='reef')for(let i=0;i<8;i++){
   const a=i*2.399+t.seed,rad=.83;
   const x=t.x+Math.cos(a)*t.rx*rad,z=t.z+Math.sin(a)*t.rz*rad;
   for(let j=0;j<3;j++){const branch=add(scatter,stoneGeo,j%2?0xe1987c:0xf0bd91,x+(j-1)*.25,.55+j*.10,z,.09,1.15+j*.21,.10);branch.rotation.z=(j-1)*.28;}
  }
  instanceKit(scatter);yield scatter;
  if(r.id==='redrock'&&t.seed===12){
   const foundry=new THREE.Group(),u={x:Math.cos(r.angle),z:Math.sin(r.angle)},v={x:-u.z,z:u.x};
   for(const [side,slot] of [[-1,6],[1,3]]){
    const x=t.x+u.x*10+v.x*side*8,z=t.z+u.z*10+v.z*side*8;
    const home=new THREE.Group();house(home,r,0,t.h+.14,0,slot,true);home.position.set(x,0,z);home.rotation.y=-r.angle+Math.PI/2+side*.15;foundry.add(home);
    add(foundry,cragGeo,side<0?0xc88554:0xa75d3f,x,t.h-.40,z,3.25,.54,2.8);
   }
   for(let i=0;i<13;i++){
    const a=i*2.399,x=t.x+u.x*(5+(i%3)*2)+v.x*Math.cos(a)*5,z=t.z+u.z*(5+(i%3)*2)+v.z*Math.cos(a)*5;
    add(foundry,stoneGeo,i%3===0?0xd8a16d:0xb16d47,x,t.h+.18,z,.43,.38,.43);
    if(i%3===0)redrockPlant(foundry,x+Math.sin(a)*.8,t.h+.10,z-Math.cos(a)*.8,i+31,false);
   }
   instanceKit(foundry);yield foundry;
  }
  if(r.id==='redrock'&&(t.seed===10||t.seed===14)){
   const perch=new THREE.Group(),a=t.seed*2.41,raise=Math.min(8,t.h*.24)+2;
   const cx=t.x+Math.cos(a)*t.rx*.20,cz=t.z+Math.sin(a)*t.rz*.20;
   for(let i=0;i<2;i++){
    const x=cx+(i?3.3:-3.3),z=cz+(i?1.1:-1.1),h=new THREE.Group();
    house(h,r,0,t.h+raise+.10,0,t.seed*2+i,true);h.position.set(x,0,z);h.rotation.y=-r.angle+Math.PI/2+(i?-.35:.22);h.scale.setScalar(.88);perch.add(h);
    add(perch,cragGeo,i?0xb06b49:0xd0925e,x,t.h+raise-.52,z,2.1,.65,1.75);
   }
   for(let i=0;i<7;i++){
    const x=cx-5+i*1.65;
    box(perch,0x714a38,x,t.h+raise+.58,cz+3.15,.13,1.08,.13);
    box(perch,0xb8895b,x,t.h+raise+.08,cz+3.15,1.35,.13,.15);
   }
   instanceKit(perch);yield perch;
  }
  if(r.id==='harbor'&&t.h>10){
   const ledges=new THREE.Group();
   for(let i=0;i<17;i++){
    const angle=i*2.399+t.seed*.47,height=t.h*(.20+(i%4)*.155),rad=.83+(i%3)*.016;
    const x=t.x+Math.cos(angle)*t.rx*rad,z=t.z+Math.sin(angle)*t.rz*rad;
    const rock=add(ledges,cragGeo,i%5===0?0xd8be94:i%2?0x967d62:0xb19a79,x,height,z,1.35+(i%3)*.42,.77+(i%3)*.22,1.25+(i%2)*.34);
    rock.rotation.y=angle*.61;
    for(let j=0;j<3;j++){
     const leaf=add(ledges,leafGeo,j%2?0x4d815b:0x79a369,x+Math.cos(angle+j*1.4)*.65,height+.78+(j%2)*.16,z+Math.sin(angle+j*1.4)*.65,.72+(j%2)*.28,.35,.71);
     leaf.rotation.y=angle+j*.4;
    }
    if(i%4===0){
     for(let vine=0;vine<3;vine++)add(ledges,leafGeo,vine%2?0x437856:0x729b60,x+Math.cos(angle)*.8,height-.25-vine*.48,z+Math.sin(angle)*.8,.35,.48,.28);
    }
   }
   instanceKit(ledges);yield ledges;
   if(t.seed!==51){
    // Wide seaward shelves are composed toward the sailing route. Each shelf
    // has rock beneath it, a thin planted cap and a different tree silhouette.
    const face=new THREE.Group(),front=r.angle+Math.PI;
    for(let i=0;i<7;i++){
     const a=front+(i-3)*.23+.045*Math.sin(i*2.9+t.seed),rad=.81+(i%2)*.025;
     const x=t.x+Math.cos(a)*t.rx*rad,z=t.z+Math.sin(a)*t.rz*rad;
     const y=t.h*(.29+(i%3)*.16),scale=2.7+(i%3)*.35;
     const shelf=add(face,cragGeo,i%3===0?0xb39a79:0x9d866c,x,y,z,scale,1.1+(i%2)*.22,scale*.83);shelf.rotation.y=a;
     const greenery=add(face,leafGeo,i%2?0x6f9b67:0x8cab70,x,y+1.37,z,scale*.98,.20,scale*.72);greenery.rotation.y=a;
     harborPlant(face,x,y+1.46,z,i%3===0?i+1:i+15,false);
     for(let k=0;k<3;k++)add(face,leafGeo,k%2?0x4f8259:0x88a968,x+Math.cos(a+k*1.4)*1.65,y+1.5,z+Math.sin(a+k*1.4)*1.35,.75,.5,.69);
    }
    instanceKit(face);yield face;
   }
  }
 }
 // Two tiny inhabited shore hamlets accompany each region's central repair village.
 for(const side of [-1,1])for(let j=0;j<4;j++){
  if(r.id==='harbor'||r.id==='redrock')continue; // Red-rock houses perch on real upper shelves.
  const g=new THREE.Group(),a=r.angle+side*.29,p={x:Math.cos(a)*(162+j*.8),z:Math.sin(a)*(162+j*.8)};
  house(g,r,0,3.5+j*.35,0,100+(side+1)*4+j,true);g.position.set(p.x+Math.sin(a)*j*4,0,p.z-Math.cos(a)*j*4);g.rotation.y=-a+Math.PI/2+Math.sin(j*3.1+side)*.16;instanceKit(g);yield g;
 }
}
function createRedrockGrandArch(){
 const {from,to,clearance}=REDROCK_GRAND_ARCH,span=Math.hypot(to.x-from.x,to.z-from.z),steps=24;
 const arch=new THREE.Group();arch.name='赤岩群柱 · 戰門海灣巨型石拱橋';
 arch.position.set((from.x+to.x)/2,0,(from.z+to.z)/2);arch.rotation.y=-Math.atan2(to.z-from.z,to.x-from.x);
 arch.userData={fromSeed:REDROCK_GRAND_ARCH.fromSeed,toSeed:REDROCK_GRAND_ARCH.toSeed,span,waterwayClearance:clearance};
 const positions=[],colors=[],indices=[];
 const strata=[0xe2a36d,0xc77b50,0xa95a3d,0x874936];
 for(let i=0;i<=steps;i++){
  const u=i/steps*2-1,edge=Math.abs(u),bend=(1-edge)*Math.sin(i*1.77)*.48;
  const x=u*span/2+bend,z=.70*Math.sin(i*.77)*(1-edge);
  const underneath=15+(clearance-15)*(1-u*u)+.53*Math.sin(i*2.21)*(1-edge);
  const crown=underneath+6.7+1.8*(1-edge)+.55*Math.sin(i*1.73);
  const halfDepth=(5.5+2.2*(1-edge)+.43*Math.cos(i*2.3))/2;
  const levels=[crown,crown-2.1-.42*Math.sin(i*.91),underneath+1.55+.35*Math.sin(i*1.27),underneath];
  for(let layer=0;layer<4;layer++)for(const face of [-1,1]){
   const bulge=layer===1?.72:layer===2?.38:-.12;
   positions.push(x+(layer===1?.26*Math.sin(i*1.31):layer===2?-.22*Math.cos(i*.89):0),levels[layer]+(face===1?.10:0),z+face*(halfDepth+bulge+.17*Math.sin(i*1.53+layer)));
   const c=new THREE.Color(strata[layer]).multiplyScalar((face===-1?.94:1.07)*(.94+.07*Math.sin(i*2.41+layer*.8)));
   colors.push(c.r,c.g,c.b);
  }
  if(i===steps)continue;
  const a=i*8,b=a+8;
  indices.push(a,b,a+1,a+1,b,b+1); // fractured sunlit crown
  indices.push(a+6,a+7,b+6,a+7,b+7,b+6); // eroded soffit
  for(let layer=0;layer<3;layer++){
   const c=a+layer*2,d=b+layer*2;
   indices.push(c,c+2,d,c+2,d+2,d);
   indices.push(c+1,d+1,c+3,c+3,d+1,d+3);
  }
 }
 for(const start of [0,steps*8])for(let layer=0;layer<3;layer++){
  const a=start+layer*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const bridge=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.96,flatShading:true,side:THREE.DoubleSide}));
 bridge.name='連續岩層拱身';bridge.castShadow=bridge.receiveShadow=true;arch.add(bridge);
 // The ends disappear into existing island cliffs. No new pier touches the
 // open-water channel, so the ship can pass under the central arch.
 for(const side of [-1,1]){
  const root=side*span/2;
  for(let i=0;i<3;i++){
   const shoulder=add(arch,cragGeo,i===1?0xb36643:i===2?0xd18d5c:0x9c533d,root+side*(i-1)*1.5,15.2+i*3.0,(i-1)*.95,3.0+i*.48,5.5-i*.75,2.65+i*.22);
   shoulder.rotation.z=side*(.10+i*.045);shoulder.rotation.y=i*.29;
  }
  for(let i=0;i<3;i++){
   const cap=add(arch,cragGeo,i%2?0xc68151:0xe1a36e,root-side*(2+i*1.25),22.5+i*.48,(-1+i)*2.4,1.8,.60,1.48);
   cap.rotation.y=i*.24;
  }
 }
 for(let i=0;i<18;i++){
  const u=(i+.5)/18*2-1,edge=Math.abs(u),x=u*span/2,z=(i%2?1:-1)*(1.3+(i%3)*.46);
  const y=15+(clearance-15)*(1-u*u)+6.4+1.8*(1-edge);
  const slab=add(arch,cragGeo,i%4===0?0xe6af76:i%2?0xb96b46:0xd4905e,x,y+.25,z,1.55+(i%3)*.46,.38+(i%2)*.14,1.22+(i%2)*.32);slab.rotation.y=i*.31;
  if(i%4===0){
   add(arch,leafGeo,i%8===0?0x657f58:0x879163,x,y+.75,z+.72,.82,.29,.69);
   const fin=add(arch,cragGeo,i%8===0?0xa95d40:0xc77e52,x,y+1.48,z-1.2,.56,1.05,.54);fin.rotation.z=(i%3-1)*.13;
  }
 }
 // Broken, thin sediment ledges interrupt the broad cliff faces without
 // dropping stone into the navigable opening below the arch.
 for(let i=2;i<steps-1;i+=2){
  const u=i/steps*2-1,edge=Math.abs(u),x=u*span/2;
  const base=15+(clearance-15)*(1-u*u),topY=base+6.7+1.8*(1-edge);
  for(const face of [-1,1]){
   const z=face*(3.55+1.1*(1-edge));
   const ledge=add(arch,cragGeo,i%4===0?0xdfa06a:0xb86b48,x+(i%3-1)*.46,base+(topY-base)*(.42+(i%3)*.10),z,1.6+(i%3)*.32,.25,1.0+(i%2)*.24);
   ledge.rotation.y=(i%3-1)*.11;
  }
 }
 instanceKit(arch);return arch;
}
export function createArches(scene){
 scene.add(createRedrockGrandArch());
 for(const [x,z,width,y,rot] of [[0,0,22,18,0],[-151,-65,22,19,Math.PI/2],[83,123,20,17,Math.PI/2]]){
  if(x<0){
   const gate=new THREE.Group();gate.name='赤岩群柱 · 天然海蝕拱';gate.position.set(x,0,z);gate.rotation.y=rot;
   // A fractured crown grows out of two eroded cliff feet. Unlike a torus,
   // there is a navigable open aperture and a layered, asymmetrical top.
   for(const side of [-1,1]){
    for(let k=0;k<5;k++){
     const px=side*(11.3-k*.28),height=2.1+k*4.0;
     const pillar=add(gate,cragGeo,[0x8f4938,0xab5d42,0xc1784d,0xa75d42,0xd39061][k],px,height,side*(k%2)*.22,3.5-k*.22,2.65,3.1-k*.15);
     pillar.rotation.y=k*.35+side*.12;
     if(k===2||k===4)add(gate,cragGeo,0xd69a68,px-side*.6,height+2.3,side*.4,3.45,.35,2.72);
    }
    const haunch=add(gate,cragGeo,0xb56d47,side*6.5,19.4,0,2.7,5.0,2.8);haunch.rotation.z=side*.58;
   }
   for(let i=0;i<5;i++){
    const crown=add(gate,cragGeo,i%2?0xc17a4d:0xdfa06d,(i-2)*3.25,24.4+(i%2)*.22,0,2.65,1.37,3.06+(i%3)*.22);
    crown.rotation.z=(i-2)*.065;crown.rotation.y=i*.31;
   }
   for(let i=0;i<4;i++){
    const x=(i-1.5)*5.2;
    add(gate,leafGeo,i%2?0x648658:0x9c9b65,x,26.26,1.45,.84,.24,.76);
   }
   instanceKit(gate);scene.add(gate);continue;
  }
  const color=x<0?0xb47756:x>0?0x819493:0xa7ae90;
  for(const side of [-1,1]){const px=x+Math.cos(rot)*side*width/2,pz=z-Math.sin(rot)*side*width/2;for(let k=0;k<5;k++)add(scene,stoneGeo,k%2?color:new THREE.Color(color).multiplyScalar(.9).getHex(),px,y/5*(k+.5),pz,4.5-k*.13,y/5*1.04,4.5-k*.13);}
  const mesh=new THREE.Mesh(new THREE.TorusGeometry(width/2,3.8,6,18,Math.PI),material(color));mesh.position.set(x,y,z);mesh.rotation.y=rot;mesh.castShadow=true;scene.add(mesh);
 }
}
export function createWhirlpoolVisuals(scene){
 const items=WHIRLPOOLS.map(w=>{
  const g=new THREE.Group();g.position.set(w.x,.22,w.z);scene.add(g);
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{time:{value:0}},vertexShader:'varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float time;void main(){float r=length(p);if(r>1.)discard;float a=atan(p.y,p.x);float stripe=pow(.5+.5*sin(a*5.+r*30.-time*3.),8.);float edge=smoothstep(1.,.8,r);vec3 c=mix(vec3(.015,.12,.17),vec3(.55,.9,.88),stripe*.65);float alpha=edge*(.25+stripe*.65+(.3*(1.-r)));gl_FragColor=vec4(c,alpha);}' });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w.radius*2,w.radius*2),m);mesh.rotation.x=-Math.PI/2;mesh.renderOrder=6;g.add(mesh);return {g,m};
 });
 return time=>items.forEach(({m})=>m.uniforms.time.value=time);
}
