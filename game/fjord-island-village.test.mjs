import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILDING_TERRACES,MAIN_WALKWAY_ROUTES,createFjordIslandStudy} from './fjord-island-study.js';
import {createFjordIslandVillage} from './fjord-island-village.js';

const qAt=(plot,x,z)=>Math.pow(((x-plot.x)/plot.rx)**4+((z-plot.z)/plot.rz)**4,.25);

test('every reserved house plot has varied Greek hillside homes with terrain-bearing stone bases',()=>{
 const terrain=createFjordIslandStudy(),village=createFjordIslandVillage(terrain.land,terrain.sideIsland);
 assert.equal(village.root.userData.plotCount,10);
 assert.equal(village.root.userData.houseCount,29);
 assert.equal(village.root.userData.greekCount,29);
 assert.equal(village.root.userData.mainCount,20);
 assert.equal(village.root.userData.sideCount,9);
 for(const plot of BUILDING_TERRACES.filter(p=>p.name!=='主堡用地')){
  const homes=village.homes.filter(h=>h.userData.plot===plot.name);
  assert.ok(homes.length>=2&&homes.length<=3,`${plot.name} has an occupied building tier`);
  const yaw=homes[0].rotation.y;
  assert.ok(Math.min(Math.abs(Math.sin(yaw)),Math.abs(Math.cos(yaw)))<1e-8,`${plot.name} must follow its level terrace grid`);
  assert.ok(plot.name==='入口西側'?Math.cos(yaw)<-.99:plot.island==='side'||plot.x>0?Math.sin(yaw)<-.99:Math.sin(yaw)>.99,
   `${plot.name} homes must face the adjacent harbor or channel`);
  assert.ok(homes.every(home=>Math.abs(home.rotation.y-yaw)<1e-8),`${plot.name} houses must share one street orientation`);
  assert.ok(Math.max(...homes.map(h=>h.userData.tier))-Math.min(...homes.map(h=>h.userData.tier))>=.9,
   `${plot.name} must have more than one housing level`);
  assert.ok(homes.some(h=>h.userData.entrySteps>=5),`${plot.name} upper home needs a short stair`);
  for(const home of homes){
   const house=home.children.find(child=>child.name==='希臘白灰石牆・海藍門窗平房');
   assert.ok(house,`${home.name} uses the detailed Greek house model`);
   assert.ok(4.8*house.scale.x>=3.7,`${home.name} should be at least as broad as a neighboring region's cottage`);
   assert.ok(2.9*house.scale.y>=3,`${home.name} should have a full-size residential wall height`);
   assert.ok(home.userData.houseTriangleCount<5000,`${home.name} exceeds the per-house model budget`);
   assert.ok(home.userData.foundationBottom<=plot.y-.19,`${home.name} must bear into the hill`);
   assert.ok(home.children.some(child=>child.name==='嵌入原生岩坡的石砌房基'));
   for(const u of[-3.225,3.225])for(const w of[-2.955,3.895]){
    const x=home.position.x+Math.cos(home.rotation.y)*u*home.userData.scale+Math.sin(home.rotation.y)*w*home.userData.scale;
    const z=home.position.z-Math.sin(home.rotation.y)*u*home.userData.scale+Math.cos(home.rotation.y)*w*home.userData.scale;
    assert.ok(qAt(plot,x,z)<=1.01,`${home.name} does not fit its graded pad`);
   }
  }
  const c=Math.cos(homes[0].rotation.y),s=Math.sin(homes[0].rotation.y);
  const footprints=homes.map(home=>{
   const dx=home.position.x-plot.x,dz=home.position.z-plot.z;
   const u=c*dx-s*dz,v=s*dx+c*dz,size=home.userData.scale;
   return {x0:u-3*size,x1:u+3*size,z0:v-2.75*size,z1:v+4*size};
  });
  for(let i=0;i<footprints.length;i++)for(let j=i+1;j<footprints.length;j++){
   const a=footprints[i],b=footprints[j];
   const xOverlap=Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0);
   const zOverlap=Math.min(a.z1,b.z1)-Math.max(a.z0,b.z0);
   assert.ok(xOverlap<=0||zOverlap<=0,`${plot.name} homes ${i+1} and ${j+1} overlap`);
  }
 }
});

test('new hillside houses leave the existing public switchback stairs open',()=>{
 const terrain=createFjordIslandStudy(),{homes,sites}=createFjordIslandVillage(terrain.land,terrain.sideIsland);
 for(const home of homes.filter(h=>h.userData.island==='main')){
  const {scale}=home.userData,c=Math.cos(home.rotation.y),s=Math.sin(home.rotation.y);
  for(const route of MAIN_WALKWAY_ROUTES)for(let i=1;i<route.points.length;i++){
   const a=route.points[i-1],b=route.points[i];
   for(let j=0;j<=60;j++){
    const t=j/60,dx=a[0]+(b[0]-a[0])*t-home.position.x,dz=a[1]+(b[1]-a[1])*t-home.position.z;
    const u=c*dx-s*dz,v=s*dx+c*dz;
    const outsideX=Math.max(Math.abs(u)-3.225*scale,0);
    const outsideZ=Math.max(-2.955*scale-v,v-3.895*scale,0);
    assert.ok(Math.hypot(outsideX,outsideZ)>=1.55,`${home.name} clips ${route.name}`);
   }
  }
 }
 assert.ok(sites.filter(site=>site.userData.edgeSegments>0).length>=8,'most plots gain a founded masonry slope edge');
 for(const wall of sites.filter(site=>site.userData.island==='main').flatMap(site=>site.children.filter(child=>child.name==='隨山坡起伏的聚落石砌護坡'))){
  const c=Math.cos(wall.rotation.y),s=Math.sin(wall.rotation.y);
  for(const route of MAIN_WALKWAY_ROUTES)for(let i=1;i<route.points.length;i++){
   const a=route.points[i-1],b=route.points[i];
   for(let j=0;j<=60;j++){
    const t=j/60,dx=a[0]+(b[0]-a[0])*t-wall.position.x,dz=a[1]+(b[1]-a[1])*t-wall.position.z;
    const u=c*dx-s*dz,v=s*dx+c*dz;
    assert.ok(Math.hypot(Math.max(Math.abs(u)-1.24,0),Math.max(Math.abs(v)-.31,0))>=1.55,
     `${wall.name} blocks ${route.name}`);
   }
  }
 }
});
