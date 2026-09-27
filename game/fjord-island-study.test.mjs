import test from 'node:test';
import assert from 'node:assert/strict';
import {createFjordIslandStudy,islandHeight,islandSignedDistance,sideIslandHeight,sideIslandSignedDistance,BUILDING_TERRACES,HARBOR_FOUNDATION_TOP,harborFoundationSignedDistance,castleApproachAxis} from './fjord-island-study.js';

test('new fjord island is a connected seabed-to-mountain terrain within the 30K budget',()=>{
 const {group,land,sideIsland,harborFoundation}=createFjordIslandStudy();
 assert.equal(group.children.length,3,'main island, separate side island and built harbor base only');
 assert.ok(group.userData.terrainTriangles<=30000);
 assert.equal(group.userData.terrainTriangles,(land.geometry.index.count+sideIsland.geometry.index.count+harborFoundation.geometry.getAttribute('position').count)/3);
 for(const mesh of[land,sideIsland]){
  const p=mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getY(i)));
 }
 assert.ok(islandHeight(7,-80)>50,'rear mountain rises well above the sea gate');
 assert.ok(islandHeight(7,-45)>5&&islandHeight(7,-45)<islandHeight(7,-80)-5,'harbor-facing slope');
 assert.ok(islandHeight(7,-110)<islandHeight(7,-80)-20,'seaward backslope, not a vertical screen');
 assert.ok(islandHeight(0,-43)>12&&islandHeight(0,-43)<28,'future citadel shelf remains broad below the summits');
});

test('sea gate lands on two headlands while the harbor mouth and centre stay open water',()=>{
 for(const x of[-17.5,17.5])assert.ok(islandHeight(x,61)>.4,'each gate tower has native rock beneath it');
 for(const z of[77,61,45,24,6])assert.ok(islandHeight(0,z)<0,`open channel at z ${z}`);
 assert.ok(islandSignedDistance(-119,63)>0,'western detached reef');
 assert.ok(islandHeight(-130,63)<0,'western reef remains separated by water');
});

test('long eastern island and the main coast form an open, ship-wide sea trench',()=>{
 for(const z of[-50,-35,-20,0,20,35]){
  const mainOuter=Array.from({length:81},(_,i)=>60+i*.5).filter(x=>islandHeight(x,z)>.05).at(-1);
  const sideInner=Array.from({length:121},(_,i)=>78+i*.5).find(x=>sideIslandHeight(x,z)>.05);
  assert.ok(sideInner-mainOuter>=14&&sideInner-mainOuter<=40,`channel width at z=${z}: ${sideInner-mainOuter}`);
  assert.ok(islandHeight((mainOuter+sideInner)/2,z)<0);
  assert.ok(sideIslandHeight((mainOuter+sideInner)/2,z)<0);
 }
 assert.ok(sideIslandSignedDistance(114,-20)>0,'separate island ridge');
 assert.ok(sideIslandHeight(150,-20)>42,'outer wall has height and mass');
 assert.ok(sideIslandHeight(190,-20)<sideIslandHeight(150,-20)-30,'seaward backslope');
});

test('high ridges have a continuous outer mountain shoulder, foothill and seabed apron',()=>{
 const mainBack=[-130,-120,-110,-100,-90,-80].map(z=>islandHeight(7,z));
 assert.ok(mainBack[0]<2&&mainBack.at(-1)>54,'main back slope spans fifty units of land before the high ridge');
 for(let i=1;i<mainBack.length;i++){
  assert.ok(mainBack[i]>mainBack[i-1],`main backslope rises progressively at sample ${i}`);
  assert.ok(mainBack[i]-mainBack[i-1]<20,`main backslope has no sheer ten-unit step at sample ${i}`);
 }
 const sideBack=[150,160,170,180,190,200].map(x=>sideIslandHeight(x,-20));
 assert.ok(sideBack[0]>43&&sideBack.at(-1)<2,'side ridge also reaches a broad outer shoreline');
 for(let i=1;i<sideBack.length;i++){
  assert.ok(sideBack[i]<sideBack[i-1],`side back slope falls progressively at sample ${i}`);
  assert.ok(sideBack[i-1]-sideBack[i]<18,`side back slope has no sheer ten-unit step at sample ${i}`);
 }
 assert.equal(islandHeight(-12,61),0,'gate headland waterline remains fixed');
 assert.equal(sideIslandHeight(85,42),0,'side island waterline remains fixed');
 assert.equal(islandHeight(0,6),-6.3,'harbor seabed and navigation depth remain fixed');
});

test('house plots are level cores carved into rising native slopes, with shoreline and channel untouched',()=>{
 assert.equal(BUILDING_TERRACES.filter(p=>p.island==='main').length,8);
 assert.equal(BUILDING_TERRACES.filter(p=>p.island==='side').length,3);
 for(const plot of BUILDING_TERRACES){
  const height=plot.island==='main'?islandHeight:sideIslandHeight;
  assert.ok(plot.rx*2>=18&&plot.rz*2>=12,`${plot.name} holds a small house footprint`);
  for(const [u,v] of [[0,0],[.6,0],[-.6,0],[0,.6],[0,-.6],[.6,.6],[-.6,-.6]]){
   assert.ok(Math.abs(height(plot.x+u*plot.rx,plot.z+v*plot.rz)-plot.y)<.001,`${plot.name} has a true level core`);
  }
 }
 const level=name=>BUILDING_TERRACES.find(p=>p.name===name).y;
 assert.ok(level('入口西側')<level('西岸低地')&&level('西岸低地')<level('西坡下層'));
 assert.ok(level('西坡下層')<level('西坡中層')&&level('西坡中層')<level('西坡上層'));
 assert.ok(level('離島下層')<level('離島中層')&&level('離島中層')<level('離島上層'));
 assert.equal(islandHeight(-12,61),0);
 assert.equal(sideIslandHeight(85,42),0);
 assert.equal(islandHeight(0,6),-6.3);
});

test('mainland house plots grow 25 percent, the citadel footprint fits, and the side island stays unchanged',()=>{
 const castle=BUILDING_TERRACES.find(p=>p.name==='主堡用地');
 assert.ok(castle.rx*2>=39.1&&castle.rz*2>=22.3,'existing citadel footprint fits with margin');
 assert.ok(castle.rx*castle.rz/(castle.baseRx*castle.baseRz)>2,'citadel flat area more than doubles');
 for(const p of BUILDING_TERRACES){
  const areaRatio=p.rx*p.rz/(p.baseRx*p.baseRz);
  if(p.island==='main'&&p!==castle)assert.ok(areaRatio>=1.2&&areaRatio<=1.3,`${p.name} grows by 20–30 percent`);
  if(p.island==='side')assert.equal(areaRatio,1,`${p.name} on the side island is unchanged`);
 }
 for(const [u,v] of [[0,0],[.8,0],[-.8,0],[0,.8],[0,-.8],[.8,.8],[-.8,-.8]]){
  assert.ok(Math.abs(islandHeight(castle.x+u*castle.rx,castle.z+v*castle.rz)-castle.y)<.001,'entire citadel core remains level');
 }
});

test('constructed harbor apron has a flat top and retaining wall without filling the lagoon',()=>{
 const {harborFoundation}=createFjordIslandStudy();
 harborFoundation.geometry.computeBoundingBox();
 assert.ok(Math.abs(harborFoundation.geometry.boundingBox.max.y-HARBOR_FOUNDATION_TOP)<.001);
 assert.ok(harborFoundation.geometry.boundingBox.min.y<-.5,'retaining wall continues below sea level');
 assert.ok(harborFoundationSignedDistance(0,-24)>0,'the quay continues below the castle approach');
 assert.ok(islandHeight(0,-24)>HARBOR_FOUNDATION_TOP+6,'a real earth slope rises above the quay toward the gate');
 assert.ok(islandHeight(20,-24)<HARBOR_FOUNDATION_TOP,'the hill is cut below the buildings beside the approach');
 let previous=Infinity;
 for(const z of[-39,-34,-29,-24,-19,-14,-11.5]){
  const axis=castleApproachAxis(z),height=islandHeight(axis.x,z);
  assert.ok(Math.abs(height-axis.y)<.4,'approach grade follows the castle-to-quay line');
  assert.ok(height<previous,'approach descends continuously to the quay');
  previous=height;
 }
 assert.ok(harborFoundationSignedDistance(0,6)<0&&islandHeight(0,6)<0,'the statue water and turning lagoon stay open');
 for(const z of[45,61,77])assert.ok(islandHeight(0,z)<0,'sea gate approach remains open');
});
