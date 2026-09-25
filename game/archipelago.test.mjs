import test from 'node:test';import assert from 'node:assert/strict';
import {REGIONS,ENCOUNTERS,LOOT,WHIRLPOOLS,START,MAP_RADIUS,CORALHAVEN,REDROCK_SHOALS,REDROCK_GRAND_ARCH,REEF_CLUSTER_BEDS,navigable,whirlpoolForce,upgradeOffer,specialtyOffer} from './archipelago-data.js';
import {createBoatState,stepBoat} from './physics.js';
import {createWorld} from './world.js';import * as THREE from 'three';
import {BUILDING_TYPES,buildingTypeFor,villageSlots,createTerrainBase,createReefClusterBeds,createVillageBase} from './archipelago-art.js';
import {TERRAIN} from './archipelago-data.js';
import {createShoreTexture} from './sea.js';
test('original handcrafted island is restored beside the first port without blocking pickups',()=>{
 const scene=new THREE.Scene(),world=createWorld(scene),island=world.far.getObjectByName('Coralhaven · original handmade island');
 assert.ok(island);assert.ok(Math.hypot(island.position.x-REGIONS[0].dock.x,island.position.z-REGIONS[0].dock.z)<30);
 assert.ok(world.far.getObjectByName('赤岩鑄砲村 · 層岩港口'),'Red Rock port is missing from the main playable world');
 for(const side of ['西側','東側'])assert.ok(world.far.getObjectByName(`暖沙港 · ${side}空中橋屋`),`${side} bridge is missing from the playable world`);
 assert.equal(navigable(CORALHAVEN.x,CORALHAVEN.z),false);
 for(const item of [...ENCOUNTERS,...LOOT]){const x=item.start?.[0]??item.x,z=item.start?.[1]??item.z;assert.ok(navigable(x,z,2),item.id);}
});
test('each port has ten distinct building silhouettes and a stable staggered layout',()=>{
 assert.equal(BUILDING_TYPES.length,10);
 for(const r of REGIONS.filter(r=>r.id!=='reef')){const slots=villageSlots(r),again=villageSlots(r);assert.deepEqual(slots,again);assert.equal(slots.length,21);assert.equal(new Set(slots.map(s=>buildingTypeFor(r.id,s.slot).id)).size,10);assert.ok(new Set(slots.map(s=>Math.round(s.heading*100))).size>4);}
});
test('central canyon cliffs keep their intended long axis',()=>{
 for(const t of TERRAIN.filter(t=>t.seed===51||t.seed===52)){const g=createTerrainBase(t),bounds=new THREE.Box3().setFromObject(g),size=bounds.getSize(new THREE.Vector3());assert.ok(size.z>size.x*1.5,`central cliff ${t.seed} turned sideways`);}
});
test('emerald reef has separate resort islets, one landmark chapel and a broad translucent lagoon',()=>{
 const region=REGIONS.find(r=>r.id==='reef'),islands=TERRAIN.filter(t=>t.region==='reef'),slots=villageSlots(region);
 assert.ok(islands.length>=20,'the resort must spread across many islets');
 for(const t of islands){const count=slots.filter(s=>s.islandSeed===t.seed).length;assert.ok(count>=1&&count<=3,`islet ${t.seed} needs one to three cottages`);}
 const village=createVillageBase(region);assert.ok(village.getObjectByName('翡翠環礁 · 主島海濱大教堂'));
 for(let seed=30;seed<34;seed++){
  const a=islands.find(t=>t.seed===seed),b=islands.find(t=>t.seed===seed+1);
  assert.ok(navigable((a.x+b.x)/2,(a.z+b.z)/2,5),`a ship cannot pass between resort islands ${seed} and ${seed+1}`);
 }
 for(const t of islands){
  const terrain=createTerrainBase(t),shoal=terrain.getObjectByName(`環礁水下沙坡 ${t.seed}`);assert.ok(shoal);
  const position=shoal.geometry.attributes.position;let lowest=Infinity,highest=-Infinity;
  for(let i=0;i<position.count;i++){lowest=Math.min(lowest,position.getY(i));highest=Math.max(highest,position.getY(i));}
  assert.ok(lowest<-.5&&highest>2,`islet ${t.seed} must slope below and above water`);
 }
 const texture=createShoreTexture(128),pixels=texture.image.data;
 const sample=(x,z)=>{const a=Math.round((x/512+.5)*127),b=Math.round((z/512+.5)*127);return pixels[(b*128+a)*4+1];};
 assert.ok(sample(region.x,region.z)>sample(0,0)+120,'lagoon shallows do not differ from deep water');texture.dispose();
});
test('red and blue resort groups each share one submerged, navigable reef shelf',()=>{
 const beds=createReefClusterBeds();assert.equal(beds.children.length,2);
 const covered=new Set();
 for(const cluster of REEF_CLUSTER_BEDS){
  const bed=beds.getObjectByName(`翡翠環礁 · ${cluster.name}共用水下礁台`);
  assert.ok(bed);assert.deepEqual(bed.userData.memberSeeds,[...cluster.seeds]);
  assert.equal(bed.userData.links.length,cluster.seeds.length-1);
  const positions=bed.geometry.attributes.position;
  assert.ok(positions.count>1000,`${cluster.name} shelf is too small`);
  for(let i=0;i<positions.count;i++)assert.ok(positions.getY(i)<-.5,`${cluster.name} shelf emerged above water`);
  const triangleCount=positions.count/3,parent=Array.from({length:triangleCount},(_,i)=>i),vertexOwner=new Map();
  const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  for(let i=0;i<positions.count;i++){
   const triangle=Math.floor(i/3),key=`${positions.getX(i).toFixed(3)}/${positions.getZ(i).toFixed(3)}`;
   if(vertexOwner.has(key))parent[root(triangle)]=root(vertexOwner.get(key));else vertexOwner.set(key,triangle);
  }
  assert.equal(new Set(parent.map((_,i)=>root(i))).size,1,`${cluster.name} shelf broke into separate pieces`);
  for(const [seedA,seedB] of bed.userData.links){
   covered.add(seedA);covered.add(seedB);
   const a=TERRAIN.find(t=>t.seed===seedA),b=TERRAIN.find(t=>t.seed===seedB),x=(a.x+b.x)/2,z=(a.z+b.z)/2;
   // Existing island cores may touch; the new submerged mesh itself adds no
   // obstacle, while open gaps must continue to admit a ship.
   if(Math.hypot(a.x-b.x,a.z-b.z)>Math.max(a.rx,a.rz)+Math.max(b.rx,b.rz)+10)
    assert.ok(navigable(x,z,0),`boats cannot cross the submerged ${cluster.name} shelf ${seedA}-${seedB}`);
   const ray=new THREE.Raycaster(new THREE.Vector3(x,2,z),new THREE.Vector3(0,-1,0),0,5);
   assert.ok(ray.intersectObject(bed).length,`${cluster.name} shelf is disconnected between ${seedA} and ${seedB}`);
  }
 }
 assert.ok(!covered.has(32),'the main church island must remain outside both groups');
 for(const seed of [35,36,37,39,53,54])assert.ok(!covered.has(seed),`inner lagoon island ${seed} was joined to the circled groups`);
});
test('every Red Rock island has an intact upper land surface and the forged harbor is in the playable world',()=>{
 const islands=TERRAIN.filter(t=>t.region==='redrock');assert.equal(islands.length,10);
 for(const t of islands){
  const terrain=createTerrainBase(t);terrain.updateMatrixWorld(true);
  const cap=terrain.children.find(o=>o.isMesh&&o.geometry.type==='ShapeGeometry'&&Math.abs(o.position.y-t.h)<.2);
  assert.ok(cap,`red rock island ${t.seed} has no top`);
  const ray=new THREE.Raycaster(new THREE.Vector3(t.x,t.h+2,t.z),new THREE.Vector3(0,-1,0),0,5);
  assert.equal(ray.intersectObject(cap).length,1,`red rock island ${t.seed} has a missing top face`);
 }
 const village=createVillageBase(REGIONS.find(r=>r.id==='redrock'));
 assert.ok(village.getObjectByName('赤岩鑄砲村 · 層岩港口'));
});
test('grand red-rock arch spans a ship-clear waterway and five cliff feet descend into shallow shelves',()=>{
 const scene=new THREE.Scene(),world=createWorld(scene),arch=world.far.getObjectByName('赤岩群柱 · 戰門海灣巨型石拱橋');
 assert.ok(arch,'the large illustrated arch is missing from the playable world');
 const span=Math.hypot(REDROCK_GRAND_ARCH.to.x-REDROCK_GRAND_ARCH.from.x,REDROCK_GRAND_ARCH.to.z-REDROCK_GRAND_ARCH.from.z);
 assert.ok(span>60,'the arch must connect the outer pillars and inner cliff across the bay');
 const body=arch.getObjectByName('連續岩層拱身');assert.ok(body);
 const vertices=body.geometry.attributes.position,center=Math.floor((vertices.count/8-1)/2)*8;
 assert.ok(vertices.getY(center+6)>25,'the central soffit must clear a tall ship');
 for(const u of [.3,.4,.5,.6,.7]){
  const x=REDROCK_GRAND_ARCH.from.x+(REDROCK_GRAND_ARCH.to.x-REDROCK_GRAND_ARCH.from.x)*u;
  const z=REDROCK_GRAND_ARCH.from.z+(REDROCK_GRAND_ARCH.to.z-REDROCK_GRAND_ARCH.from.z)*u;
  assert.ok(navigable(x,z,5),`ship cannot pass beneath the arch at ${u}`);
 }
 assert.equal(REDROCK_SHOALS.length,5);
 for(const shelf of REDROCK_SHOALS){
  const island=TERRAIN.find(t=>t.seed===shelf.seed),terrain=createTerrainBase(island);
  const mesh=terrain.getObjectByName(`赤岩淺灘 ${shelf.seed}`);assert.ok(mesh,`missing shoal ${shelf.seed}`);
  const p=mesh.geometry.attributes.position,stride=13,middle=6;
  const elevations=[0,2,4,6].map(row=>p.getY(row*stride+middle));
  assert.ok(elevations.every((height,i)=>i===0||height<elevations[i-1]),`shoal ${shelf.seed} does not slope down from the cliff`);
  assert.ok(elevations[0]>8&&elevations.at(-1)<0,`shoal ${shelf.seed} does not reach submerged shallows`);
 }
});
test('both Warm Sand channels stay navigable below skyhouses and upper cliff walls face outward',()=>{
 const village=createVillageBase(REGIONS[0]);
 for(const [mainSeed,isletSeed,label] of [[1,0,'西側'],[3,4,'東側']]){
  const islet=TERRAIN.find(t=>t.seed===isletSeed),mainland=TERRAIN.find(t=>t.seed===mainSeed);
  const dx=islet.x-mainland.x,dz=islet.z-mainland.z,length=Math.hypot(dx,dz);
  const midX=(islet.x+mainland.x)/2,midZ=(islet.z+mainland.z)/2;
  for(let offset=-30;offset<=30;offset+=2)assert.ok(navigable(midX-dz/length*offset,midZ+dx/length*offset,3),`${label} channel ${offset}`);
  const skyhouse=village.getObjectByName(`暖沙港 · ${label}空中橋屋`);
  assert.ok(skyhouse);assert.ok(new THREE.Box3().setFromObject(skyhouse).min.y>8,`${label} skyhouse must clear the player ship`);
 }
 for(const t of [TERRAIN[0],TERRAIN[1],TERRAIN[3],TERRAIN[4]]){
  const shelf=createTerrainBase(t).children.find(m=>m.isMesh&&m.geometry.attributes.position.count===72);
  assert.ok(shelf,`upper shelf ${t.seed}`);
  const positions=shelf.geometry.attributes.position,index=shelf.geometry.index;
  const a=new THREE.Vector3().fromBufferAttribute(positions,index.getX(0));
  const b=new THREE.Vector3().fromBufferAttribute(positions,index.getX(1));
  const c=new THREE.Vector3().fromBufferAttribute(positions,index.getX(2));
  const normal=b.sub(a).cross(c.sub(a));
  assert.ok(normal.dot(new THREE.Vector3(a.x,0,a.z))>0,`upper shelf ${t.seed} faces inward`);
 }
});
test('five ports, all encounters and loot spawn in accessible water',()=>{
 assert.equal(REGIONS.length,5);assert.equal(ENCOUNTERS.length,34);assert.equal(LOOT.length,40);
 for(const r of REGIONS)assert.ok(navigable(r.dock.x,r.dock.z,3),r.id);
 for(const e of ENCOUNTERS)assert.ok(navigable(...e.start,e.radius),e.id);
 for(const l of LOOT)assert.ok(navigable(l.x,l.z,2),l.id);
 // Complete circumnavigation at 111 U radius with ship clearance.
 for(let i=0;i<720;i++){const a=i*Math.PI/360;assert.ok(navigable(Math.cos(a)*111,Math.sin(a)*111,5));}
 assert.ok(Math.abs(MAP_RADIUS**2/94**2-5)<.02);
});
test('grid flood fill reaches every port and treasure from initial spawn',()=>{
 const step=4,min=-208,max=208,n=(max-min)/step+1,key=(x,z)=>x+z*n;
 const ix=x=>Math.round((x-min)/step);const queue=[[ix(START.x),ix(START.z)]],seen=new Set([key(...queue[0])]);
 for(let j=0;j<queue.length;j++){const [x,z]=queue[j];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,k=key(a,b);if(a<0||b<0||a>=n||b>=n||seen.has(k)||!navigable(min+a*step,min+b*step,2))continue;seen.add(k);queue.push([a,b]);}}
 for(const p of [...REGIONS.map(r=>r.dock),...LOOT])assert.ok(seen.has(key(ix(p.x),ix(p.z))),JSON.stringify(p));
});
test('whirlpool attracts and damages nearby idle ship but sustained full sail escapes',()=>{
 const v=WHIRLPOOLS[0],idle={x:v.x+5,z:v.z};const before=Math.hypot(idle.x-v.x,idle.z-v.z);assert.ok(whirlpoolForce(idle,v,.1)>0);assert.ok(Math.hypot(idle.x-v.x,idle.z-v.z)<before);
 const b=createBoatState(v.x+5,v.z,0);let damage=0;for(let i=0;i<600;i++){stepBoat(b,{throttle:1},1/60);damage+=whirlpoolForce(b,v,1/60);}assert.ok(Math.hypot(b.x-v.x,b.z-v.z)>v.radius);assert.ok(damage>0&&damage<40);
});
test('regional upgrade caps, escalating cost and parts gate are consistent',()=>{
 assert.equal(upgradeOffer({hull:3},REGIONS[0],'hull').available,false);assert.equal(upgradeOffer({hull:3},REGIONS[2],'hull').available,true);
 assert.ok(upgradeOffer({cannon:3},REGIONS[2],'cannon').cost>upgradeOffer({cannon:1},REGIONS[2],'cannon').cost);
 for(const r of REGIONS){assert.ok(specialtyOffer({},r).parts>0);assert.equal(specialtyOffer({armory:{[r.weapon]:3}},r).available,false);}
});
test('streamed region details load, release and revisit without duplicated scene roots',()=>{
 const scene=new THREE.Scene(),world=createWorld(scene);let t=0;
 for(let cycle=0;cycle<3;cycle++){
  for(const r of REGIONS){for(let i=0;i<160;i++)world.update(t+=.1,.1,r.dock);}
  assert.ok(world.stats().loaded<=3);assert.ok(scene.children.length<30);
 }
 assert.ok(world.stats().released>5);assert.ok(world.stats().built>5);
});
