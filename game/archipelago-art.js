import * as THREE from 'three';
import {REGIONS,TERRAIN,WHIRLPOOLS} from './archipelago-data.js';
const palette=new Map();
const material=color=>{if(!palette.has(color))palette.set(color,new THREE.MeshStandardMaterial({color,roughness:.87,flatShading:true}));return palette.get(color);};
const boxGeo=new THREE.BoxGeometry(1,1,1),stoneGeo=new THREE.CylinderGeometry(.80,1,1,9,1),roofGeo=new THREE.BufferGeometry(),leafGeo=new THREE.IcosahedronGeometry(1,0);
roofGeo.setAttribute('position',new THREE.Float32BufferAttribute([-1,0,-1,1,0,-1,0,1,-1,-1,0,1,1,0,1,0,1,1],3));roofGeo.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,2,5,4,2,4,1,0,1,4,0,4,3]);roofGeo.computeVertexNormals();
const sp=stoneGeo.attributes.position;
for(let i=0;i<sp.count;i++){const a=Math.atan2(sp.getZ(i),sp.getX(i)),factor=1+.08*Math.sin(a*3+.4)+.04*Math.cos(a*5);sp.setX(i,sp.getX(i)*factor*.93);sp.setZ(i,sp.getZ(i)*factor*.93);}stoneGeo.computeVertexNormals();
const trunkGeo=new THREE.CylinderGeometry(.52,.72,1,7),coneGeo=new THREE.ConeGeometry(1,1,8),roundGeo=new THREE.CylinderGeometry(1,1,1,10);
const shared=new Set([boxGeo,stoneGeo,roofGeo,leafGeo,trunkGeo,coneGeo,roundGeo]);
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
 const roofColor=slot%7===0?shade(r.roof,.69):slot%4===0?shade(r.roof,1.21):r.roof;
 const skin=[0xe9d6b2,0xc8bc9f,0xe7c6a0,0xd8d1bc][slot%4],timber=slot%3===0?0x704d35:0x916847;
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
 return type;
}
function sideOffset(i,w){return (i-1.5)*w*.23;}
export function villageSlots(r,rows=3){
 const u={x:Math.cos(r.angle),z:Math.sin(r.angle)},v={x:-u.z,z:u.x},offset=REGIONS.indexOf(r);
 const slots=[];
 for(let row=0;row<rows;row++)for(let j=-3;j<=3;j++){
  const slot=row*7+j+3,seed=slot*12.9898+offset*78.233;
  const radius=153+row*6+Math.sin(seed)*.65;
  const tangent=j*5.55+Math.cos(seed*1.37)*.8;
  slots.push({slot,x:u.x*radius+v.x*tangent,z:u.z*radius+v.z*tangent,y:5.25,heading:-r.angle+Math.PI/2+Math.sin(seed*.71)*.21});
 }
 return slots;
}
function tree(g,x,y,z,seed,r,central=false){
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
function addTerrace(g,t,r,i){
 const a=t.seed*2.41+i*2.31,outer=i===0?.20:.34;
 const cx=t.x+Math.cos(a)*t.rx*outer,cz=t.z+Math.sin(a)*t.rz*outer;
 const rx=t.rx*(i===0?.50:.29),rz=t.rz*(i===0?.48:.31),rise=Math.min(8,t.h*(i===0?.24:.16))+(r.id==='redrock'?2:0);
 const n=18,rings=[[t.h-.22,1.12],[t.h+rise*.34,1.05],[t.h+rise*.68,.94],[t.h+rise,.84]],pos=[],idx=[],outline=[];
 for(let k=0;k<rings.length;k++)for(let j=0;j<n;j++){
  const angle=j/n*Math.PI*2,noise=1+.09*Math.sin(angle*5+a)+.045*Math.cos(angle*8-a*.7),rad=rings[k][1]*noise;
  const x=Math.cos(angle)*rx*rad,z=Math.sin(angle)*rz*rad;pos.push(x,rings[k][0],z);
  if(k===rings.length-1)outline.push(new THREE.Vector2(x,-z));
 }
 for(let k=0;k<rings.length-1;k++)for(let j=0;j<n;j++){const p=k*n+j,q=k*n+(j+1)%n;idx.push(p,q,p+n,q,q+n,p+n);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
 const rock=new THREE.Mesh(geo,material(shade(r.rock,i===0?.91:1.05)));rock.position.set(cx,0,cz);rock.castShadow=rock.receiveShadow=true;g.add(rock);
 const cap=new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(outline)),material(i%2?shade(r.grass,1.13):r.grass));cap.rotation.x=-Math.PI/2;cap.position.set(cx,t.h+rise+.035,cz);cap.castShadow=cap.receiveShadow=true;g.add(cap);
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
export function createTerrainBase(t){
 const g=new THREE.Group(),r=REGIONS.find(r=>r.id===t.region);g.name=`${r.name} cliff ${t.seed}`;
 // A single shared contour through every stratum prevents the offset, rotated-column look.
 const n=24,phase=t.seed*1.73,rings=[[-1.25,1.10],[.15,1.015],[t.h*.20,.99],[t.h*.40,.91],[t.h*.61,.94],[t.h*.82,.855],[t.h-.15,.79],[t.h,.77]];
 const positions=[],colors=[],indices=[],coast=[];
 const rockColor=new THREE.Color(r.rock),sandColor=new THREE.Color(r.id==='reef'?0xe2d6aa:0xd5c39e);
 for(let k=0;k<rings.length;k++)for(let j=0;j<n;j++){
  const a=j/n*Math.PI*2,rough=t.h>8?1.7:1,ir=1+rough*(.055*Math.sin(a*3+phase)+.037*Math.cos(a*5-phase*.7)+.023*Math.sin(a*9+phase*.4));
  const radius=rings[k][1]*ir*(1+.012*Math.sin(k*3+a*4+phase));
  const x=Math.cos(a)*t.rx*radius,z=Math.sin(a)*t.rz*radius,y=rings[k][0]+(k>1&&k<rings.length-2?.16*Math.sin(a*7+phase+k):0);
  positions.push(x,y,z);
  const c=(k<2?sandColor:rockColor).clone().multiplyScalar(k<2?1:.80+((k+1)%3)*.075+.07*Math.sin(a*6+phase));colors.push(c.r,c.g,c.b);
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
 addRegionalLandmark(g,t,r);
 return g;
}
export function createVillageBase(r){
 const g=new THREE.Group();g.name=r.village;const homes=new THREE.Group();g.add(homes);g.userData.homes=homes;const u={x:Math.cos(r.angle),z:Math.sin(r.angle)},v={x:-u.z,z:u.x};
 for(const s of villageSlots(r,2)){const h=new THREE.Group();house(h,r,0,s.y,0,s.slot,false);h.position.set(s.x,0,s.z);h.rotation.y=s.heading;homes.add(h);}
 const dock=box(g,0xb38b58,u.x*140,1.1,u.z*140,5,.5,18);dock.rotation.y=-r.angle+Math.PI/2;
 for(let k=0;k<5;k++)for(const s of [-1,1])box(g,0x70533d,u.x*(133+k*3)+v.x*s*2.1,.25,u.z*(133+k*3)+v.z*s*2.1,.3,2.5,.3);
 for(let k=0;k<13;k++){const r0=143+k*.83,stair=box(g,0xc8aa7c,u.x*r0,1.3+k*.34,u.z*r0,4,.45,.9);stair.rotation.y=-r.angle+Math.PI/2;}
 consolidateChunk(homes);instanceKit(g);return g;
}
export function* detailsForRegion(r){
 const u={x:Math.cos(r.angle),z:Math.sin(r.angle)},v={x:-u.z,z:u.x};
 for(const s of villageSlots(r)){
  const g=new THREE.Group();house(g,r,0,s.y,0,s.slot,true);g.position.set(s.x,0,s.z);g.rotation.y=s.heading;instanceKit(g);yield g;
 }
 for(const t of TERRAIN.filter(t=>t.region===r.id)){
  for(let i=0;i<(t.seed>=51?22:8);i++){
   const g=new THREE.Group(),central=t.seed>=51,a=central?i*2.399+t.seed:i*2.4+t.seed,rad=central?.14+(i%7)*.067:.3+(i%3)*.12;
   tree(g,t.x+Math.cos(a)*t.rx*rad,t.h+.6,t.z+Math.sin(a)*t.rz*rad,i,r,central);
   // Vertical flank facets and low shoreline boulders, never protruding into the collision corridor.
   for(let k=0;k<4;k++){const b=add(g,stoneGeo,k%2?r.rock:new THREE.Color(r.rock).multiplyScalar(.84).getHex(),t.x+Math.cos(a)*t.rx*(.73-k*.05),t.h*(.12+k*.21),t.z+Math.sin(a)*t.rz*(.73-k*.05),(t.seed>=51?Math.min(t.rx,t.rz)*.21:t.rx*.28),t.h*.19,(t.seed>=51?Math.min(t.rx,t.rz)*.21:t.rz*.24));b.rotation.y=t.seed>=51?0:a+k*.11;}
   const shore=add(g,leafGeo,r.rock,t.x+Math.cos(a)*t.rx*.92,.15,t.z+Math.sin(a)*t.rz*.92,1.6,1.0,1.2);shore.rotation.y=a;
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
  }
  if(r.id==='reef')for(let i=0;i<8;i++){
   const a=i*2.399+t.seed,rad=.83;
   const x=t.x+Math.cos(a)*t.rx*rad,z=t.z+Math.sin(a)*t.rz*rad;
   for(let j=0;j<3;j++){const branch=add(scatter,stoneGeo,j%2?0xe1987c:0xf0bd91,x+(j-1)*.25,.55+j*.10,z,.09,1.15+j*.21,.10);branch.rotation.z=(j-1)*.28;}
  }
  instanceKit(scatter);yield scatter;
 }
 // Two tiny inhabited shore hamlets accompany each region's central repair village.
 for(const side of [-1,1])for(let j=0;j<4;j++){
  const g=new THREE.Group(),a=r.angle+side*.29,p={x:Math.cos(a)*(162+j*.8),z:Math.sin(a)*(162+j*.8)};
  house(g,r,0,3.5+j*.35,0,100+(side+1)*4+j,true);g.position.set(p.x+Math.sin(a)*j*4,0,p.z-Math.cos(a)*j*4);g.rotation.y=-a+Math.PI/2+Math.sin(j*3.1+side)*.16;instanceKit(g);yield g;
 }
}
export function createArches(scene){

 for(const [x,z,width,y,rot] of [[0,0,22,18,0],[-151,-65,22,19,Math.PI/2],[83,123,20,17,Math.PI/2]]){
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
