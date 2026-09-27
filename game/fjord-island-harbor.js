import * as T from 'three';
import {createFjordHarborProps} from './fjord-harbor-props.js';
import {HARBOR_FOUNDATION_COAST,HARBOR_FOUNDATION_TOP} from './fjord-island-study.js';

// This is a preview-only placement on the new island. The approved harbor kit
// stays independent from the older playable town and retains its own geometry.
export const ISLAND_HARBOR_PLACEMENT={scale:1.25,z:5,pierAdvance:11,annexAdvance:8,sourceQuayTop:2.2};
export const ISLAND_STATUE_POSITION={x:0,z:32};
const STONE=new T.MeshStandardMaterial({color:0xb1b4aa,roughness:1,flatShading:true});
const LIGHT_STONE=new T.MeshStandardMaterial({color:0xd8d5c3,roughness:1,flatShading:true});
const WALL=new T.MeshStandardMaterial({color:0xdbd6bf,roughness:1,flatShading:true});
const ROOF=new T.MeshStandardMaterial({color:0xab6547,roughness:.94,flatShading:true});
const WOOD=new T.MeshStandardMaterial({color:0x775a3f,roughness:1,flatShading:true});
const PLANK=new T.MeshStandardMaterial({color:0xb08c61,roughness:1,flatShading:true});
const DARK=new T.MeshStandardMaterial({color:0x314852,roughness:1,flatShading:true});

function add(parent,name,geometry,material,x,y,z){
 const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);
 mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function box(parent,name,x,y,z,w,h,d,material){
 return add(parent,name,new T.BoxGeometry(w,h,d),material,x,y,z);
}
function cylinder(parent,name,x,y,z,r,h,material,n=8){
 return add(parent,name,new T.CylinderGeometry(r,r,h,n),material,x,y,z);
}
function spar(parent,name,from,to,r,material,n=6){
 const a=new T.Vector3(...from),b=new T.Vector3(...to),v=b.clone().sub(a);
 const mesh=add(parent,name,new T.CylinderGeometry(r,r,v.length(),n),material,...a.add(b).multiplyScalar(.5).toArray());
 mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return mesh;
}
function customsArcade(group){
 const building=new T.Group();building.name='中央港務門廊・保留上坡通路';group.add(building);
 const y=HARBOR_FOUNDATION_TOP,z=-26.9;
 box(building,'門廊基座',0,y+.2,z,6.8,.4,4.65,STONE);
 for(const side of[-1,1]){
  box(building,'門廊灰泥側翼',side*2.55,y+2.15,z,1.2,3.9,3.9,WALL);
  for(const dz of[-1.9,1.9])cylinder(building,'門廊前後石柱',side*1.95,y+1.95,z+dz,.22,3.9,LIGHT_STONE,8);
  box(building,'雙坡紅瓦屋面',side*1.85,y+4.74,z,3.94,.25,5.14,ROOF).rotation.z=side<0?.34:-.34;
  box(building,'海藍色側窗',side*3.18,y+2.43,z+.9,.07,.92,.86,DARK);
 }
 box(building,'門廊拱上橫梁',0,y+3.82,z+1.99,4.55,.45,.38,LIGHT_STONE);
 const arch=add(building,'港務通廊石拱',new T.TorusGeometry(1.73,.2,6,16,Math.PI),LIGHT_STONE,0,y+2.35,z+2.07);
 arch.rotation.z=0;
 box(building,'海港紋章基板',0,y+4.17,z+2.27,1.35,.55,.13,DARK);
 for(const x of[-1.55,1.55])box(building,'門廊後側石階',x,y+.1,z-2.45,1.55,.2,.45,LIGHT_STONE);
 building.userData={openPassageWidth:2.9,groundY:y,landwardZ:z-2.33};
 return building;
}
function shipwrightShed(group){
 const shed=new T.Group();shed.name='西側修船棚與木料架';group.add(shed);
 const x=-31,z=-28.4,y=HARBOR_FOUNDATION_TOP;
 box(shed,'修船棚石基',x,y+.15,z,5.7,.3,4.8,STONE);
 for(const dx of[-2.38,2.38])for(const dz of[-1.8,1.8]){
  cylinder(shed,'修船棚承重柱',x+dx,y+1.78,z+dz,.14,3.56,WOOD,6);
  box(shed,'木柱石腳',x+dx,y+.21,z+dz,.56,.42,.55,LIGHT_STONE);
 }
 for(const side of[-1,1])box(shed,'修船棚傾斜紅瓦',x+side*1.45,y+4.06,z,3.15,.23,5.23,ROOF).rotation.z=side<0?.4:-.4;
 spar(shed,'屋脊承重木梁',[x,y+4.55,z-2.2],[x,y+4.55,z+2.2],.12,WOOD);
 box(shed,'待修小舟龍骨',x,y+.56,z,1.0,.23,3.2,WOOD);
 for(const dz of[-1.05,-.4,.35,1.0]){
  add(shed,'待修小舟肋骨',new T.TorusGeometry(.73,.09,5,8,Math.PI),PLANK,x,y+.68,z+dz);
 }
 for(const dz of[-1.3,-.85,-.4,.05,.5,.95])box(shed,'備用長木料',x-2,y+.55,z+dz,.16,.16,3.6,PLANK);
 return shed;
}
function signalPost(group){
 const signal=new T.Group();signal.name='東側港口信號塔與吊燈';group.add(signal);
 const x=26,z=-28,y=HARBOR_FOUNDATION_TOP;
 cylinder(signal,'信號塔石座',x,y+.55,z,1.65,1.1,STONE,12);
 cylinder(signal,'信號塔石身',x,y+2.54,z,1.04,3.3,LIGHT_STONE,10);
 cylinder(signal,'信號塔上環台',x,y+4.27,z,1.45,.42,STONE,12);
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4;
  cylinder(signal,'環台矮欄柱',x+Math.cos(a)*1.2,y+4.78,z+Math.sin(a)*1.2,.1,.78,LIGHT_STONE,6);
 }
 cylinder(signal,'海上信號桅',x,y+6.43,z,.11,4.6,WOOD,6);
 spar(signal,'信號旗橫桁',[x-1.17,y+7.6,z],[x+1.17,y+7.6,z],.055,WOOD,6);
 add(signal,'深藍港口旗',new T.PlaneGeometry(1.1,.7),DARK.clone(),x+.59,y+7.19,z).material.side=T.DoubleSide;
 return signal;
}
function faceAtX(x){
 const shoreline=HARBOR_FOUNDATION_COAST.slice(7).reverse();
 for(let i=0;i<shoreline.length-1;i++){
  const [ax,az]=shoreline[i],[bx,bz]=shoreline[i+1];
  if(x>=Math.min(ax,bx)&&x<=Math.max(ax,bx))return az+(bz-az)*(x-ax)/(bx-ax);
 }
 return -22;
}
function retainingButtresses(group){
 const masonry=new T.Group();masonry.name='臨水擋牆扶壁與壓頂';group.add(masonry);
 for(const x of[-29,-25,-9,9,25,29]){
  const z=faceAtX(x)+.22;
  box(masonry,'外凸承重扶壁',x,HARBOR_FOUNDATION_TOP/2,z,1.25,HARBOR_FOUNDATION_TOP,1.22,STONE);
  box(masonry,'扶壁白石壓頂',x,HARBOR_FOUNDATION_TOP+.12,z,1.42,.24,1.5,LIGHT_STONE);
 }
 return masonry;
}
function pierAccessSteps(group){
 const access=new T.Group();access.name='石岸至三座木碼頭的下行踏階';group.add(access);
 for(const x of[-20,0,20]){
  const edge=faceAtX(x);
  for(const [i,offset,top]of[[0,-.65,HARBOR_FOUNDATION_TOP],[1,0,HARBOR_FOUNDATION_TOP-.34],[2,.65,HARBOR_FOUNDATION_TOP-.68],[3,1.3,HARBOR_FOUNDATION_TOP-1]]){
   box(access,`第 ${i+1} 階・與碼頭板相接`,x,top-.12,edge+offset,3.35,.24,.76,LIGHT_STONE);
  }
 }
 return access;
}

export function createFjordIslandHarbor(){
 const {scale,z,pierAdvance,annexAdvance,sourceQuayTop}=ISLAND_HARBOR_PLACEMENT;
 const lift=HARBOR_FOUNDATION_TOP-sourceQuayTop;
 const group=new T.Group();group.name='新主島・內港設施';
 const kit=createFjordHarborProps();
 kit.name='石基上的倉庫、商舖、魚市、吊架與三座碼頭';
 kit.position.set(0,lift,z);kit.scale.set(scale,1,scale);
 // The warehouse occupied the foot of the castle approach. Leave that
 // berth-side square open, and move the small fish stall clear of the slope.
 kit.remove(kit.getObjectByName('西側港務倉庫與卸貨門'));
 const fishStall=kit.getObjectByName('碼頭魚市與布棚');
 fishStall.position.x+=2;
 fishStall.position.z+=4;
 const cargo=kit.getObjectByName('港市貨物與繫船設施');
 for(const item of [...cargo.children]){
  const worldX=item.position.x*scale;
  if(worldX>-16&&worldX<9&&item.position.z*scale+z< -11)cargo.remove(item);
 }
 for(const child of kit.children)if(child.name.startsWith('主碼頭 ')){
  child.position.y=-.4;
  child.position.z+=pierAdvance/scale;
 }
 // Put the working hoist on the waterside edge so cargo can swing between
 // the western berth and the stone quay instead of disappearing behind a shed.
 kit.getObjectByName('西碼頭木吊架與絞盤').position.z+=9.5;
 // Boats belong at the actual waterline, not at the raised quay height.
 const craft=[];
 const berthLocal={
  '西碼頭系泊漁舟':[-18.45,-9],
  '內港歸航划艇':[2.45,-9],
  '東碼頭運貨小船':[18.45,-9],
 };
 for(const child of kit.children){
  if(child.userData.moored){
   const berth=berthLocal[child.name];
   child.position.x=berth[0];child.position.z=berth[1]+pierAdvance/scale;
   child.position.y=-lift+.34;
   child.scale.y*=1.5;
   craft.push(child);
  }
 }
 // The original short timber piles ran into a lower waterfront. Join them
 // below the raised foundation so each pier bears on submerged timber.
 const piles=new T.Group();piles.name='三座碼頭・延伸至海床的承重樁';
 const timber=new T.MeshStandardMaterial({color:0x76583c,roughness:1,flatShading:true});
 const pileTop=-.45,pileBottom=-6.55-lift;
 for(const pierX of[-16,0,16])for(const side of[-1,1])for(const pierZ of[-15.3,-12.3,-9.4]){
  const pile=new T.Mesh(new T.CylinderGeometry(.16,.2,pileTop-pileBottom,6),timber);
  pile.name='入海木樁・與碼頭上樁搭接';
  pile.position.set(pierX+side*1.16,(pileTop+pileBottom)/2,pierZ);
  pile.castShadow=true;pile.receiveShadow=true;piles.add(pile);
 }
 piles.position.z=pierAdvance/scale;
 kit.add(piles);
 group.add(kit);
 const ropes=new T.Group();ropes.name='三艘小船・碼頭繫纜';group.add(ropes);
 const ropeMaterial=new T.MeshStandardMaterial({color:0xc9b68d,roughness:1});
 const pierTipZ=-8.74*scale+z+pierAdvance;
 for(const [boatX,pierX,side]of[[-18.45*scale,-20,-1],[2.45*scale,0,1],[18.45*scale,20,1]]){
  spar(ropes,'船首連至碼頭繫船樁',[boatX,.73,pierTipZ+1.73],[pierX+side*1.4,HARBOR_FOUNDATION_TOP-.1,pierTipZ+.13],.035,ropeMaterial,5);
 }
 const annex=new T.Group();annex.name='港口增建建物・隨平台前移';annex.position.z=annexAdvance;group.add(annex);
 const customsSide=new T.Group();customsSide.name='移至西側的港務通廊';customsSide.position.x=-23;annex.add(customsSide);
 customsArcade(customsSide);
 shipwrightShed(annex);
 signalPost(annex);
 retainingButtresses(group);
 pierAccessSteps(group);
 group.userData={previewOnly:true,quayTop:HARBOR_FOUNDATION_TOP,
  pierCenters:[-16,0,16].map(x=>x*scale),
  pierTips:[-16,0,16].map(x=>({x:x*scale,z:pierTipZ})),
  craftCount:craft.length,pileCount:piles.children.length};
 return group;
}
