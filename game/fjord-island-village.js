import * as T from 'three';
import {createHouse,triangleCount} from './fjord-models.js';
import {BUILDING_TERRACES,MAIN_WALKWAY_ROUTES,islandNaturalHeight,islandHeight,sideIslandNaturalHeight,sideIslandHeight} from './fjord-island-study.js';

const STUCCO=new T.MeshStandardMaterial({color:0xe8e5d6,roughness:.97,flatShading:true});
const LIME=new T.MeshStandardMaterial({color:0xf6f0dc,roughness:.97,flatShading:true});
const STONE=new T.MeshStandardMaterial({color:0xaab0a3,roughness:1,flatShading:true});
const DARK_STONE=new T.MeshStandardMaterial({color:0x788783,roughness:1,flatShading:true});
const BLUE=new T.MeshStandardMaterial({color:0x2c7496,roughness:.88,flatShading:true});
const PALE_BLUE=new T.MeshStandardMaterial({color:0x79adbd,roughness:.88,flatShading:true});
const TIMBER=new T.MeshStandardMaterial({color:0x897058,roughness:1,flatShading:true});
const GREEN=new T.MeshStandardMaterial({color:0x607e57,roughness:1,flatShading:true});
const POT=new T.MeshStandardMaterial({color:0xb77955,roughness:1,flatShading:true});

const LAYOUT={
 '入口西側':{yaw:Math.PI},
 '西坡下層':{centers:[[-4.5,-2.5],[1.5,-2.5]],shade:false},
 '西坡中層':{centers:[[-4.35,-1.3],[1.5,-1.3]],scale:.88,shade:false},
 '西坡上層':{centers:[[-2,-1.3],[3.7,-1.3]],scale:.87,shade:false},
 '東坡下層':{centers:[[-3,-5],[3,-5]],scale:.88,upper:1},
};
const DEFAULT_CENTERS=[[-3.8,-1.3],[3.8,-1.3]];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function add(group,name,geometry,material,x,y,z){
 const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);
 mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
}
function box(group,name,x,y,z,w,h,d,material){
 return add(group,name,new T.BoxGeometry(w,h,d),material,x,y,z);
}
function column(group,name,x,y,z,r,h,material=STUCCO){
 return add(group,name,new T.CylinderGeometry(r,r,h,8),material,x,y,z);
}
function rod(group,name,a,b,r,material=TIMBER){
 const start=new T.Vector3(...a),end=new T.Vector3(...b),axis=end.clone().sub(start);
 const item=add(group,name,new T.CylinderGeometry(r,r,axis.length(),6),material,...start.add(end).multiplyScalar(.5).toArray());
 item.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis.normalize());return item;
}
function worldPoint(x,z,yaw,u,v){
 return [x+Math.cos(yaw)*u+Math.sin(yaw)*v,z-Math.sin(yaw)*u+Math.cos(yaw)*v];
}
function plotDepth(plot,x,z){
 return Math.pow(((x-plot.x)/plot.rx)**4+((z-plot.z)/plot.rz)**4,.25);
}
function distanceToPublicStairs(x,z){
 let closest=Infinity;
 for(const route of MAIN_WALKWAY_ROUTES)for(let i=1;i<route.points.length;i++){
  const a=route.points[i-1],b=route.points[i],dx=b[0]-a[0],dz=b[1]-a[1];
  const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);
  closest=Math.min(closest,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t));
 }
 return closest;
}
// The cut terraces are aligned to the world axes. Face each district toward
// its adjacent water, so house walls, paved courts, retaining walls and the
// arrival from the public steps all follow the same site grid.
const terraceFacingYaw=plot=>plot.island==='side'||plot.x>0?-Math.PI/2:Math.PI/2;
function roofVariation(home,kind){
 if(kind===0){
  // A low drum and a blue half-dome stand on, rather than through, the flat roof.
  column(home,'藍圓頂白石鼓座',1.05,3.76,-.98,1.16,.32,LIME);
  add(home,'愛琴海藍色半圓頂',new T.SphereGeometry(1.13,16,8,0,Math.PI*2,0,Math.PI/2),BLUE,1.05,3.92,-.98);
  column(home,'屋頂採光小亭',-1.54,3.83,-1.2,.35,.47,PALE_BLUE);
 }else if(kind===2){
  // The timber shade is carried by four actual posts on the roof terrace.
  for(const x of[-1.45,1.45])for(const z of[-1.15,1.12]){
   box(home,'屋頂涼棚白柱',x,4.21,z,.14,1.38,.14,LIME);
  }
  for(const z of[-1.15,1.12])box(home,'屋頂涼棚主梁',0,4.94,z,3.15,.17,.19,TIMBER);
  for(const x of[-1.27,-.64,0,.64,1.27])box(home,'屋頂涼棚遮陽橫桁',x,5.03,0,.1,.11,2.62,TIMBER);
 }else if(kind===3){
  // Pale blue roof-edge paving and an inset water cistern break the silhouette.
  box(home,'屋頂青藍壓頂',0,3.58,-.33,4.64,.08,3.7,PALE_BLUE);
  column(home,'屋頂蓄水陶甕',-1.38,3.85,.48,.31,.56,POT);
 }
}
function houseFoundation(lot,plot,scale,tier,supportAt){
 const deckW=6.45*scale,deckD=6.85*scale;
 const corners=[];
 for(const u of[-deckW/2,deckW/2])for(const v of[-deckD/2,deckD/2]){
  const [x,z]=worldPoint(lot.position.x,lot.position.z,lot.rotation.y,u,v+.47*scale);
  corners.push(supportAt(x,z));
 }
 const bottom=Math.min(...corners,plot.y)-.24,top=plot.y+tier;
 box(lot,'嵌入原生岩坡的石砌房基',0,(bottom+top)/2-plot.y,.47*scale,deckW,top-bottom,deckD,DARK_STONE);
 box(lot,'白石平台壓頂',0,tier+.07,.47*scale,deckW+.14,.14,deckD+.12,LIME);
 // The exposed downhill face has joints and stout end buttresses; the rear
 // edge remains tucked under the cut mountain instead of hanging in the air.
 const face= .47*scale+deckD/2;
 for(const u of[-deckW/2+.37,deckW/2-.37]){
  box(lot,'階台外緣承重扶壁',u,(bottom+top)/2-plot.y,face+.2,.48,top-bottom,.48,STONE);
 }
 box(lot,'臨坡平台石檐',0,tier+.2,face+.23,deckW+.12,.21,.52,STUCCO);
 return {bottom,top,deckW,deckD};
}
function rearRetainingWall(lot,plot,scale,supportAt){
 const localZ=-3.15*scale;
 const [wx,wz]=worldPoint(lot.position.x,lot.position.z,lot.rotation.y,0,localZ-1.2);
 const mountain=supportAt(wx,wz);
 const height=clamp(mountain-plot.y+.35,.75,2.7);
 box(lot,'順著山坡的後擋土牆',0,height/2-.13,localZ,5.65*scale,height+.26,.42,STONE);
 box(lot,'擋土牆白灰壓頂',0,height+.06,localZ,5.83*scale,.18,.55,LIME);
 for(const u of[-2.4*scale,2.4*scale]){
  box(lot,'山牆短扶壁',u,height/2-.13,localZ+.24,.32,height+.26,.66,DARK_STONE);
 }
}
function doorwaySteps(lot,plot,scale,tier){
 if(tier<.4)return;
 const count=Math.ceil(tier/.2),run=.39,front=3.95*scale;
 for(let i=0;i<count;i++){
  const top=tier*(1-i/count),bottom=-.12;
  box(lot,'高低住宅間的短石階',0,(top+bottom)/2,front+i*run,1.75*scale,top-bottom,run+.055,LIME);
 }
}
function addPot(lot,u,v,tier,scale){
 const y=tier+.23;
 add(lot,'露台陶盆',new T.CylinderGeometry(.21,.16,.47,8),POT,u,y,v);
 add(lot,'露台香草與灌木',new T.IcosahedronGeometry(.37,0),GREEN,u,y+.42,v);
}
function cypress(group,x,y,z){
 column(group,'露台地中海柏樹樹幹',x,y+.75,z,.095,1.5,TIMBER);
 add(group,'露台地中海柏樹樹冠',new T.ConeGeometry(.52,2.45,7),GREEN,x,y+2.1,z);
}
function placeHillsideHome(root,plot,slot,index,terrainAt,naturalAt){
 const {yaw,scale,heightStretch,center,tier,kind}=slot;
 const [x,z]=worldPoint(plot.x,plot.z,yaw,center[0],center[1]);
 const lot=new T.Group();lot.name=`${plot.name}・${index+1} 號希臘山城住宅`;
 lot.position.set(x,plot.y,z);lot.rotation.y=yaw;root.add(lot);
 const foundation=houseFoundation(lot,plot,scale,tier,terrainAt);
 if(index<2)rearRetainingWall(lot,plot,scale,terrainAt);
 const house=createHouse(true,kind);house.name='希臘白灰石牆・海藍門窗平房';
 roofVariation(house,kind);house.position.y=tier+.14;house.scale.set(scale,scale*heightStretch,scale);lot.add(house);
 doorwaySteps(lot,plot,scale,tier);
 addPot(lot,-2.38*scale,3.0*scale,tier,scale);
 if(index===1)addPot(lot,2.35*scale,2.98*scale,tier,scale);
 const [rearX,rearZ]=worldPoint(x,z,yaw,0,-3.15*scale);
 lot.userData={plot:plot.name,island:plot.island,kind,scale,heightStretch,tier,footprint:[x,z],naturalRear:naturalAt(rearX,rearZ),foundationBottom:foundation.bottom,
  triangleCount:triangleCount(lot),houseTriangleCount:triangleCount(house),entrySteps:lot.children.filter(c=>c.name==='高低住宅間的短石階').length};
 return lot;
}
function patio(root,plot,yaw,anchor,supportAt,shade){
 const site=new T.Group();site.name=`${plot.name}・連接山坡石階的石板巷與庭院`;root.add(site);
 const court=box(site,'兩戶間的白石小庭',plot.x,plot.y+.055,plot.z,1.75,.11,3.6,STONE);
 court.rotation.y=yaw;
 if(anchor){
  const dx=plot.x-anchor[0],dz=plot.z-anchor[1],len=Math.hypot(dx,dz);
  const count=Math.ceil(len/.95),angle=Math.atan2(dx,dz);
  for(let i=0;i<count;i++){
   const t=(i+.5)/count;
   const x=anchor[0]+dx*t,z=anchor[1]+dz*t;
   if(plotDepth(plot,x,z)>1.1)continue;
   const stone=box(site,'從公共石階延續至住家的不規則鋪石',x,plot.y+.1,z,1.2,.09,len/count*.82,i%3?STONE:LIME);
   stone.rotation.y=angle;
  }
 }
 // Narrow sites keep the stone passage open rather than squeezing an arcade
 // between enlarged foundations and the public switchback.
 if(shade){
  const [px,pz]=worldPoint(plot.x,plot.z,yaw,0,-1.5);
  for(const u of[-.67,.67]){
   const [cx,cz]=worldPoint(px,pz,yaw,u,0);
   column(site,'庭院白灰圓柱',cx,plot.y+1.42,cz,.105,2.72,LIME);
  }
  const beam=box(site,'庭院木桁與攀藤架',px,plot.y+2.79,pz,1.72,.16,.23,TIMBER);beam.rotation.y=yaw;
 }
 for(const u of[-7.5,7.5]){
  const [x,z]=worldPoint(plot.x,plot.z,yaw,u,-2.55);
  if(plotDepth(plot,x,z)<.91)cypress(site,x,plot.y,z);
 }
 // The seaward edge of the cut terrace is dressed as short masonry runs. A
 // gap remains wherever a public switchback enters the village, and each run
 // bears into the sampled rock below its own two ends.
 let edgeSegments=0;
 for(const u of[-5.2,-2.6,0,2.6,5.2]){
  const v=6.55+.23*Math.sin(u*.58);
  const [x,z]=worldPoint(plot.x,plot.z,yaw,u,v);
  if(plotDepth(plot,x,z)>1.13||plot.island==='main'&&distanceToPublicStairs(x,z)<4.3)continue;
  const ends=[u-1.2,u,u+1.2].map(offset=>{
   const [ex,ez]=worldPoint(plot.x,plot.z,yaw,offset,v+.15);
   return supportAt(ex,ez);
  });
  if(Math.max(...ends)>plot.y+.4)continue;
  const bottom=Math.min(...ends,plot.y)-.28,top=plot.y+.26,height=top-bottom;
  const wall=box(site,'隨山坡起伏的聚落石砌護坡',x,(top+bottom)/2,z,2.48,height,.62,STONE);
  wall.rotation.y=yaw;
  const cap=box(site,'希臘白灰護坡壓頂',x,top+.06,z,2.61,.16,.82,LIME);cap.rotation.y=yaw;
  if(height>1.45){
   const [nx,nz]=worldPoint(plot.x,plot.z,yaw,u,v+.37);
   const niche=box(site,'護坡石拱陰影',nx,bottom+Math.min(1.25,height*.47),nz,.68,Math.min(1.4,height*.64),.08,DARK_STONE);
   niche.rotation.y=yaw;
  }
  edgeSegments++;
 }
 site.userData={plot:plot.name,island:plot.island,anchor,edgeSegments};
 return site;
}

export function createFjordIslandVillage(land,sideIsland){
 const root=new T.Group();root.name='蒼壁峽灣・依山而建的希臘式民居';
 const ray=new T.Raycaster();
 for(const mesh of[land,sideIsland])mesh?.updateMatrixWorld(true);
 const terrainAt=(plot,x,z)=>{
  const mesh=plot.island==='main'?land:sideIsland;
  if(!mesh)return(plot.island==='main'?islandHeight:sideIslandHeight)(x,z);
  ray.set(new T.Vector3(x,110,z),new T.Vector3(0,-1,0));
  return ray.intersectObject(mesh)[0]?.point.y??(plot.island==='main'?islandHeight:sideIslandHeight)(x,z);
 };
 const homes=[],sites=[];
 const plots=BUILDING_TERRACES.filter(plot=>plot.name!=='主堡用地');
 for(let k=0;k<plots.length;k++){
  const plot=plots[k],natural=plot.island==='main'?islandNaturalHeight:sideIslandNaturalHeight;
  const layout=LAYOUT[plot.name]??{},yaw=layout.yaw??terraceFacingYaw(plot),scale=layout.scale??.9;
  const centers=layout.centers??DEFAULT_CENTERS;
  const naturalBack=centers.map(([u,v])=>{
   const [x,z]=worldPoint(plot.x,plot.z,yaw,u,v-3.5*scale);
   return natural(x,z);
  });
  const route=MAIN_WALKWAY_ROUTES.find(r=>r.from===plot.name||r.to===plot.name);
  const point=route&&(route.from===plot.name?route.points[0]:route.points.at(-1));
  const upper=layout.upper??(naturalBack[0]>naturalBack[1]?0:1);
  const entryLocal=point?worldPoint(0,0,-yaw,point[0]-plot.x,point[1]-plot.z):[0,0];
  const frontSide=entryLocal[0]>=0?-2.45:2.45;
  const slots=[
   ...centers.map((center,i)=>({yaw,scale,heightStretch:1.2,center,tier:i===upper?1.1:.12,kind:(k*2+i)%4})),
   ...plot.name==='西坡下層'?[]:[{yaw,scale:.78,heightStretch:1.34,center:[frontSide,4.7],tier:.12,kind:(k+2)%4}],
  ];
  for(let i=0;i<slots.length;i++){
   homes.push(placeHillsideHome(root,plot,slots[i],i,(x,z)=>terrainAt(plot,x,z),natural));
  }
  sites.push(patio(root,plot,yaw,point?.slice(0,2),(x,z)=>terrainAt(plot,x,z),layout.shade!==false));
 }
 root.userData={previewOnly:true,plotCount:plots.length,houseCount:homes.length,greekCount:homes.length,mainCount:homes.filter(h=>h.userData.island==='main').length,sideCount:homes.filter(h=>h.userData.island==='side').length};
 return {root,homes,sites};
}
