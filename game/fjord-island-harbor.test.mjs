import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createFjordIslandHarbor,ISLAND_HARBOR_PLACEMENT,ISLAND_STATUE_POSITION} from './fjord-island-harbor.js';
import {createFjordIslandStudy,HARBOR_FOUNDATION_TOP,harborFoundationSignedDistance,islandHeight} from './fjord-island-study.js';

test('new island port facilities stand on the constructed shore rather than floating or clipping the edge',()=>{
 const port=createFjordIslandHarbor();port.updateMatrixWorld(true);
 const {land}=createFjordIslandStudy();land.updateMatrixWorld(true);
 const ray=new T.Raycaster();
 assert.equal(port.getObjectByName('西側港務倉庫與卸貨門'),undefined,'the house in front of the castle stairs is removed');
 for(const name of ['東側雙拱商舖','中央港務門廊・保留上坡通路','西側修船棚與木料架','東側港口信號塔與吊燈']){
  const object=port.getObjectByName(name);
  assert.ok(object,name+' exists');
  const bounds=new T.Box3().setFromObject(object);
  assert.ok(Math.abs(bounds.min.y-HARBOR_FOUNDATION_TOP)<.01,name+' rests on the quay');
  for(const x of[bounds.min.x,bounds.max.x])for(const z of[bounds.min.z,bounds.max.z]){
   assert.ok(harborFoundationSignedDistance(x,z)>=-.01,name+' fits within the stone foundation');
   ray.set(new T.Vector3(x,100,z),new T.Vector3(0,-1,0));
   const hit=ray.intersectObject(land)[0];
   assert.ok(hit&&hit.point.y<HARBOR_FOUNDATION_TOP-.05,name+' has mountain clearance at its rear and sides');
  }
 }
 assert.ok(port.getObjectByName('中央港務門廊・保留上坡通路').userData.openPassageWidth>=2.8);
});

test('all three berths have submerged supporting piles and moored boats remain at the waterline',()=>{
 const port=createFjordIslandHarbor();port.updateMatrixWorld(true);
 assert.deepEqual(port.userData.pierCenters,[-20,0,20]);
 assert.equal(port.userData.pileCount,18);
 for(let i=1;i<=3;i++){
  const plank=port.getObjectByName(`主碼頭 ${i}`).getObjectByName('不齊木棧板');
  const deck=new T.Box3().setFromObject(plank);
  assert.ok(deck.max.y>=1.1&&deck.max.y<=1.3,'wooden boarding level is near the boat gunwale');
 }
 const piles=port.getObjectByName('三座碼頭・延伸至海床的承重樁');
 for(const pile of piles.children){
  const bounds=new T.Box3().setFromObject(pile);
  assert.ok(bounds.min.y<-6.2&&bounds.max.y>-.5,'timber reaches the seabed and overlaps the upper pile');
 }
 assert.equal(port.userData.craftCount,3);
 for(const [name,pierX]of[['西碼頭系泊漁舟',-20],['內港歸航划艇',0],['東碼頭運貨小船',20]]){
  const object=port.getObjectByName(name),boat=new T.Box3().setFromObject(object);
  const position=object.getWorldPosition(new T.Vector3());
  assert.ok(boat.min.y<0&&boat.max.y>.65,name+' has a submerged keel and visible freeboard');
  assert.ok(Math.abs(Math.abs(position.x-pierX)-3.06)<.15,name+' lies alongside its berth');
  assert.ok(Math.abs(position.z-(ISLAND_HARBOR_PLACEMENT.z+ISLAND_HARBOR_PLACEMENT.pierAdvance-9*ISLAND_HARBOR_PLACEMENT.scale))<.5,name+' lines up with the outer pier');
 }
 for(const pier of port.userData.pierTips){
  assert.ok(harborFoundationSignedDistance(pier.x,pier.z)<0,'the outer pier projects into navigable water');
 }
});

test('outward statue position leaves clear water between the harbor berths and the sea gate',()=>{
 assert.deepEqual(ISLAND_STATUE_POSITION,{x:0,z:32});
 assert.ok(islandHeight(ISLAND_STATUE_POSITION.x,ISLAND_STATUE_POSITION.z)<0);
 const port=createFjordIslandHarbor();
 const nearestPierTip=Math.max(...port.userData.pierTips.map(p=>p.z));
 assert.ok(ISLAND_STATUE_POSITION.z-nearestPierTip>25,'statue keeps a wide turning area clear');
 for(const z of[32,42,52,61])assert.ok(islandHeight(0,z)<0,'approach to the gate remains water');
});
