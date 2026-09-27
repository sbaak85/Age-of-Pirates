import * as T from 'three';
import {FJORD,fjordToWorld,fjordSurfaceHeight} from './fjord-layout.js';
import {createHouse,createGate,createLighthouse} from './fjord-models.js';
import {createGrandGate} from './fjord-grand-gate.js';
import {createPoseidon6K} from './poseidon-form-6k.js';
import {createFjordCliffs} from './fjord-cliffs.js';
import {createFjordCitadel} from './fjord-citadel.js';
import {createFjordHarborProps} from './fjord-harbor-props.js';
import {createFjordStreets} from './fjord-streets.js';
import {batchStatic} from './optimization.js';
const materials=new Map();const mat=c=>{if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:c,roughness:.92,flatShading:true}));return materials.get(c);};
function mesh(g,name,geo,color,x=0,y=0,z=0){const m=new T.Mesh(geo,mat(color));m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
function box(g,name,x,y,z,w,h,d,color=0xc8bfa4){return mesh(g,name,new T.BoxGeometry(w,h,d),color,x,y,z);}
function place(root,model,x,y,z,yaw=0,scale=1,name=model.name){model.name=name;model.position.set(x,y,z);model.rotation.y=yaw;model.scale.setScalar(scale);root.add(model);return model;}
function foundationSamples(x,z,yaw,scale){const c=Math.cos(yaw),s=Math.sin(yaw),samples=[];
 for(const lateral of[-2.8,0,2.8])for(const forward of[-2.35,0,2.8]){const u=lateral*scale,v=forward*scale;samples.push(fjordSurfaceHeight(x+c*u+s*v,z-s*u+c*v));}
 return samples;
}
function settleHouse(terrain,buildings,slot,i){const [preferredX,preferredZ,yaw,smallScale]=slot,greek=i%2===0,scale=smallScale??(.78+(i%4)*.045);
 const offsets=smallScale?[0]:[0,-1.1,1.1,-2.2,2.2];
 let best=null;for(const dx of offsets)for(const dz of offsets){
  const x=preferredX+dx,z=preferredZ+dz,hs=foundationSamples(x,z,yaw,scale),lo=Math.min(...hs),hi=Math.max(...hs);
  const score=(hi-lo)*5+(lo<2?25:0)+Math.hypot(dx,dz)*.4;
  if(!best||score<best.score)best={x,z,lo,hi,score};
 }
 const {x,z,lo,hi}=best,ground=Math.max(hi,2.1)+.08;
 if(ground-lo>.35){const bottom=Math.max(0,lo-.25),height=ground-bottom;box(terrain,'民房貼岩地基 '+i,x,(ground+bottom)/2,z,6.3*scale,height,6.1*scale,0xaaa99a);}
 // The porch and its three short door steps project beyond the house slab.
 // Carry them down to the actual rock as well, including on a stepped shelf.
 const forward=3.9*scale,px=x+Math.sin(yaw)*forward,pz=z+Math.cos(yaw)*forward;
 const frontGround=fjordSurfaceHeight(px,pz);
 if(frontGround>1.9&&ground-frontGround>.18){
  const bottom=Math.max(0,frontGround-.1),height=ground-bottom;
  const support=box(terrain,'門階下承重石基 '+i,x+Math.sin(yaw)*3.05*scale,(ground+bottom)/2,z+Math.cos(yaw)*3.05*scale,2.25*scale,height,2.75*scale,0xaaa99a);
  support.rotation.y=yaw;
 }
 const house=place(buildings,createHouse(greek,Math.floor(i/2)%4),x,ground,z,yaw,scale,greek?'希臘白牆平房 '+i:'陶瓦港鎮平房 '+i);
 house.userData={style:greek?'greek':'tile',tier:ground,foundationSpread:hi-lo};return house;
}
export function createFjordTown(){const root=new T.Group();root.name='蒼壁峽灣 · 海神城堡港鎮';const w=fjordToWorld(0,0);root.position.set(w.x,0,w.z);root.rotation.y=FJORD.rotation;
 const terrain=new T.Group(),buildings=new T.Group(),details=new T.Group();terrain.name='城鎮岩岸與護岸';buildings.name='城堡海門與希臘街區';details.name='港口植栽與貨物';root.add(terrain,buildings,details);
 terrain.add(createFjordCliffs());
 const castle=place(buildings,createFjordCitadel(),0,10,-34,0,1,'蒼壁峽灣主城堡');
 box(terrain,'城堡正前方主港',0,1.05,-17,46,2.1,8,0x9b9e90);box(details,'主港石板廣場',0,2.12,-17,46,.14,8,0xd7cdb1);
 for(let i=0;i<24;i++)box(details,'城堡石階',0,2.1+(i+1)*7.9/24/2,-13.4-i*.42,5.6,(i+1)*7.9/24,.44,0xd4ccb2);
 // Continue the quay stair over the final metre into the citadel gateway.
 for(let i=0;i<4;i++){const rise=(i+1)*.27;box(details,'城門門檻接續石階',0,10+rise/2,-23.25-i*.33,5.3,rise,.4,0xd4ccb2);}
 const harbor=createFjordHarborProps();harbor.position.z=4;details.add(harbor);
 const gate=place(buildings,createGrandGate(),0,0,31,0,1,'蒼壁巨型海門');
 const sideGate=place(buildings,createGate(),38,0,9,Math.PI/2,1,'東側拱橋水道');
 const lighthouse=place(buildings,createLighthouse(),-43,fjordSurfaceHeight(-43,30),30,0,.78,'西側燈塔眺望堡');
 mesh(terrain,'海神礁台',new T.CylinderGeometry(5.1,5.1,2.3,16),0xa5aa9a,0,1.15,6);mesh(terrain,'海神圓台壓頂',new T.CylinderGeometry(4.8,5.1,.45,16),0xd8d1b6,0,2.52,6);
 const statue=place(buildings,createPoseidon6K(),0,2.75,6,0,1.25,'波賽頓雕像 · 5952面定稿');
 const west=[[-37,-25],[-43,-18],[-35,-13],[-44,-7],[-35,-2],[-42,3],[-36,9],[-42,15],[-33,20]];
 const east=[[35,-27],[43,-22],[35,-17],[43,-13],[35,-8],[42,-3],[36,0]];
 const rear=[[-31,-41],[-24,-39],[-31,-32],[-24,-29],[24,-40],[31,-39],[24,-30],[31,-31]];
 const mouth=[[25,29],[34,28],[29,21],[38,25]];
 const pocketHomes=[[-44,-27,Math.PI/2,.62],[-40,-3,Math.PI/2,.62],[30,34,-Math.PI/2,.62],[-40,-38,Math.PI/2,.62],[-32,15,Math.PI/2,.62],[26,-21,-Math.PI/2,.62]];
 const slots=[...west.map(([x,z])=>[x,z,Math.PI/2]),...east.map(([x,z])=>[x,z,-Math.PI/2]),...rear.map(([x,z])=>[x,z,0]),...mouth.map(([x,z],j)=>j===2?[-20,-16,Math.PI]:[x,z,-Math.PI/2]),[-36,-20,Math.PI/2],[20,-16,Math.PI],[-39,23,Math.PI/2],[-30,24,Math.PI/2],...pocketHomes];
 const homes=slots.map((slot,i)=>settleHouse(terrain,buildings,slot,i));
 details.add(createFjordStreets(fjordSurfaceHeight,homes));
 root.userData={design:'Stepped sea cliffs / hillside town / low-footed citadel / forward harbor / twin water entrances',houseCount:homes.length,greekCount:homes.filter(h=>h.userData.style==='greek').length,castleFoundation:10};
 // Keep component roots for local camera occlusion and inspection; batch only within each group.
 for(const g of[terrain,...buildings.children,details])batchStatic(g);
 root.updateMatrixWorld(true);return {root,terrain,buildings,details,castle,gate,sideGate,lighthouse,statue,homes};
}
