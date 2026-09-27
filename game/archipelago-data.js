import {FJORD_ISLAND,fjordIslandToWorld} from './fjord-island-placement.js';
import {fjordIslandBlocked} from './fjord-island-navigation.js';
import {CENTRAL_HORIZONTAL_FACTOR,CENTRAL_HABITAT_RADIUS} from './central-jungle-placement.js';
import {centralBlocked} from './central-navigation.js';
import {populateSharks} from './shark-population.js';
import {KRAKEN_SPAWNS,KRAKEN_EXCLUSION_ZONES,insideKrakenZone,isKrakenExclusion} from './kraken-population.js';
// A2 authored layout: persistent world data is independent of streamed visual detail.
export const MAP_RADIUS=400;
export const polar=(a,r)=>({x:Math.cos(a)*r,z:Math.sin(a)*r});
export const REGIONS=[
 {id:'harbor',name:'暖沙港灣',village:'暖沙港',angle:2.35,tier:1,rock:0xbda17d,roof:0xbc6548,grass:0x729965,weapon:'standard',special:'均衡砲組',description:'暖色灰泥村屋、階梯碼頭與棕櫚海岸'},
 {id:'redrock',name:'赤岩群柱',village:'赤岩鑄砲村',angle:3.6,tier:2,rock:0xb66f4d,roof:0x537e78,grass:0x809458,weapon:'heavy',special:'破艦重砲',description:'層疊紅砂岩、石柱與天然拱門'},
 {id:'fjord',name:'蒼壁峽灣',village:'蒼壁古港',angle:4.8,tier:4,rock:0x778b98,roof:0x476478,grass:0x617f69,weapon:'long',special:'遠射追獵砲',description:'交疊海崖上的城堡、希臘混合港鎮、海神雕像與雙水道海門'},
 {id:'reef',name:'翡翠環礁',village:'翡翠漁村',angle:5.85,tier:2,rock:0xc5ad7b,roof:0x409d94,grass:0x619e69,weapon:'rapid',special:'速射珊瑚砲',description:'青綠淺灘、珊瑚台地與水上漁村'},
 {id:'mist',name:'霧隱海灣',village:'霧隱工坊港',angle:.85,tier:3,rock:0x82939a,roof:0x735b72,grass:0x54877c,weapon:'storm',special:'風暴重擊砲',description:'海蝕洞口、層樓聚落與局部海霧'},
].map(r=>({...r,...polar(r.angle,r.id==='fjord'?FJORD_ISLAND.radius:156),dock:r.id==='fjord'?fjordIslandToWorld(...FJORD_ISLAND.dock):polar(r.angle,130)}));
export const START={...polar(REGIONS[0].angle,124),yaw:Math.PI-REGIONS[0].angle};
// Hand-authored Coralhaven from the first island preview, just off the main harbor approach.
export const CORALHAVEN={...polar(REGIONS[0].angle-.18,136),radius:15};
export const TERRAIN=[];
for(const region of REGIONS){
 for(let j=-2;j<=2;j++){
  const a=region.angle+j*(region.id==='reef'?.32:.16)+(j===0?0:Math.sin(j*3.7+region.tier)*.025)+(region.id==='reef'&&j===1?.045:0);
  const p=polar(a,j===0?169:166+(Math.abs(j)%2)*5+Math.sin(j*2.4+region.tier)*2);
  // Leave a ship-width water channel below each of the two bridge houses.
  if(region.id==='harbor'&&j===-2){p.x+=Math.sin(region.angle)*30;p.z-=Math.cos(region.angle)*30;}
  if(region.id==='harbor'&&j===2){p.x-=Math.sin(region.angle)*30;p.z+=Math.cos(region.angle)*30;}
  const rx=j===0?region.id==='reef'?25:33:region.id==='reef'?11+Math.abs(j)*1.5:region.id==='redrock'?13+Math.abs(j):16+((j+region.tier+5)%3)*2;
  const rz=j===0?region.id==='reef'?22:33:region.id==='fjord'?14+Math.abs(j)*2:region.id==='reef'?9+Math.abs(j):16+((j*2+region.tier+6)%3)*2;
  const h=j===0?region.id==='reef'?6.2:5.2:region.id==='reef'?2.7+Math.abs(j)*.55:region.id==='redrock'?27+Math.abs(j)*5:region.id==='fjord'?32+Math.abs(j)*7:region.tier*5+11+(j+2)%3*3;
  TERRAIN.push({...p,rx,rz,h,region:region.id,seed:TERRAIN.length});
 }
 // Inside coast of the navigable ring; passage radius 111 remains unobstructed.
 for(let j=-1;j<=1;j++){
  const p=polar(region.angle+j*.22,72);
  TERRAIN.push({...p,rx:region.id==='reef'?9:14,rz:region.id==='reef'?8:16,h:region.id==='reef'?2.8+(j+1)*.35:18+region.tier*4,region:region.id,seed:TERRAIN.length});
 }
 // Two smaller satellites per coast create varied shore silhouettes and narrower, readable waterways.
 const outer=polar(region.angle+.38,183),inner=polar(region.angle-.36,78);
 if(region.id==='harbor'){outer.x-=Math.sin(region.angle)*30;outer.z+=Math.cos(region.angle)*30;}
 TERRAIN.push({...outer,rx:region.id==='reef'?8:8,rz:region.id==='fjord'?13:region.id==='reef'?7:10,h:region.id==='reef'?2.5:9+region.tier*2,region:region.id,seed:TERRAIN.length});
 TERRAIN.push({...inner,rx:region.id==='redrock'?8:region.id==='reef'?7:10,rz:region.id==='mist'?13:region.id==='reef'?7:9,h:region.id==='reef'?2.7:12+region.tier*3,region:region.id,seed:TERRAIN.length});
}
// Two central mountain masses leave an open north/south sea-arch passage.
TERRAIN.push({x:-30,z:0,rx:20,rz:49,h:39,region:'harbor',seed:51},{x:30,z:0,rx:20,rz:49,h:46,region:'fjord',seed:52});
// The resort lagoon expands into three irregular shoal belts. Their tiny land
// cores stay off the 111 U main route; the turquoise underwater flats extend
// farther than the collision ellipses and remain passable by ship.
const reef=REGIONS.find(r=>r.id==='reef');
const reefCandidates=[
 [-.66,88,6,5],[-.51,84,7,5.5],[-.37,89,6.5,6],[-.11,87,6,5],[.12,88,6.5,5.5],[.39,86,7,6],[.55,89,6,5],
 [-.64,139,7,6],[-.49,143,6,6],[-.34,138,7,5.5],[-.18,143,6,5.5],[.18,141,7,6],[.33,137,6,5.5],[.48,144,7,6],[.64,139,6,5],
 [-.65,190,7,6],[-.49,193,6,5.5],[-.36,188,7,5.5],[-.17,193,6,5],[.04,191,7,6],[.18,193,6,5.5],[.38,191,7,6],[.53,187,6,5],[.65,194,6,5],
];
let reefShoalSeed=53;
for(const [offset,radius,rx,rz] of reefCandidates){
 const p=polar(reef.angle+offset,radius),tooClose=TERRAIN.some(t=>t.region==='reef'&&Math.hypot(p.x-t.x,p.z-t.z)<Math.max(rx,rz)+Math.max(t.rx,t.rz)+5);
 if(tooClose)continue;
 TERRAIN.push({...p,rx,rz,h:2.15+(reefShoalSeed%4)*.34,region:'reef',seed:reefShoalSeed++,shoal:true});
}
// Replace the old central cliffs, retaining the authored outer coastal landmarks.
const replacedCentralSeeds=new Set([5,6,7,9,25,26,27,29,45,46,47,49,51,52]);
for(let i=TERRAIN.length-1;i>=0;i--)if(replacedCentralSeeds.has(TERRAIN[i].seed))TERRAIN.splice(i,1);
// Small outward shifts of the nearest Red Rock / reef islets preserve the 111 U sea lane.
for(const t of TERRAIN){
 const radius=Math.hypot(t.x,t.z);
 if(radius<95&&(t.region==='redrock'||t.region==='reef')){
  const shift=t.region==='redrock'?12:8;t.x*=1+shift/radius;t.z*=1+shift/radius;
  if(t.seed===15)t.z-=12;
 }
}
// The expanded west cave needs 7.5 U more approach clearance at this one islet.
{const t=TERRAIN.find(t=>t.seed===19),r=Math.hypot(t.x,t.z);t.x*=1+7.5/r;t.z*=1+7.5/r;}
// Keep the enlarged east/west cave approaches clear without squeezing the outer ring.
for(const [seed,angle] of [[19,-.16],[54,-.12]]){
 const t=TERRAIN.find(t=>t.seed===seed),x=t.x,z=t.z;
 t.x=x*Math.cos(angle)-z*Math.sin(angle);t.z=x*Math.sin(angle)+z*Math.cos(angle);
}
// The two circled resort groups share submerged reef foundations. Their dry
// island cores remain separate and the smaller inner-lagoon islets stay free.
export const REEF_CLUSTER_BEDS=Object.freeze([
 {id:'blue',name:'藍圈',seeds:Object.freeze([30,31,55,56,57,58,63,64])},
 {id:'red',name:'紅圈',seeds:Object.freeze([33,34,38,59,60,61,62,65,66,67])},
]);
// Five authored shelves soften the sea-facing feet marked on the Red Rock
// preview. Their stone cores have collision; the outer sandy lips sit below
// wave height and can be sailed across.
export const REDROCK_SHOALS=Object.freeze([
 {seed:10,angle:.10,reach:10,arc:.38},
 {seed:11,angle:.30,reach:8,arc:.33},
 {seed:14,angle:.20,reach:10,arc:.38},
 {seed:15,angle:-1.57,reach:10,arc:.38},
 {seed:17,angle:-3.04,reach:12,arc:.43},
]);
const redrockIsland=seed=>TERRAIN.find(t=>t.seed===seed&&t.region==='redrock');
const outerToInner=(()=>{
 const from=redrockIsland(14),to=redrockIsland(17),dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;
 const fromRadius=1/Math.hypot(ux/from.rx,uz/from.rz),toRadius=1/Math.hypot(ux/to.rx,uz/to.rz);
 return {from:{x:from.x+ux*fromRadius*.70,z:from.z+uz*fromRadius*.70},to:{x:to.x-ux*toRadius*.70,z:to.z-uz*toRadius*.70}};
})();
export const REDROCK_GRAND_ARCH=Object.freeze({fromSeed:14,toSeed:17,from:outerToInner.from,to:outerToInner.to,clearance:28});
// Replace all former fjord cliff footprints with the authored castle town.
for(let i=TERRAIN.length-1;i>=0;i--)if(TERRAIN[i].region==='fjord')TERRAIN.splice(i,1);
export const OBSTACLES=TERRAIN.map(t=>({x:t.x,z:t.z,rx:t.rx,rz:t.rz}));
OBSTACLES.push({x:CORALHAVEN.x,z:CORALHAVEN.z,rx:CORALHAVEN.radius,rz:CORALHAVEN.radius});
for(const shelf of REDROCK_SHOALS){
 const t=redrockIsland(shelf.seed),distanceX=t.rx*1.10+shelf.reach*.25,distanceZ=t.rz*1.10+shelf.reach*.25;
 OBSTACLES.push({x:t.x+Math.cos(shelf.angle)*distanceX,z:t.z+Math.sin(shelf.angle)*distanceZ,rx:4.4+Math.abs(Math.cos(shelf.angle))*1.3,rz:4.4+Math.abs(Math.sin(shelf.angle))*1.3});
}
for(const [x,z,w,rot] of [[-151,-65,22,Math.PI/2],[83,123,20,Math.PI/2]])for(const side of [-1,1])OBSTACLES.push({x:x+Math.cos(rot)*side*w/2,z:z-Math.sin(rot)*side*w/2,rx:4.5,rz:4.5});
for(const r of REGIONS.filter(r=>r.id!=='fjord')){const u={x:Math.cos(r.angle),z:Math.sin(r.angle)};OBSTACLES.push({x:u.x*141,z:u.z*141,rx:Math.abs(u.x)*7+Math.abs(u.z)*2,rz:Math.abs(u.z)*7+Math.abs(u.x)*2});}
OBSTACLES.centralCollision=true;OBSTACLES.fjordCollision=true;
export const WHIRLPOOLS=[{id:'whirl-1',...polar(3.0,122),radius:11},{id:'whirl-2',...polar(4.28,105),radius:12},{id:'whirl-3',...polar(.2,112),radius:10}];
export function regionAt(x,z){return REGIONS.reduce((best,r)=>Math.hypot(x-r.dock.x,z-r.dock.z)<Math.hypot(x-best.dock.x,z-best.dock.z)?r:best,REGIONS[0]);}
// Same nearest-port boundary used by the region HUD. Padding keeps enemy bodies outside.
export function isHarborSafeZone(x,z,padding=0){
 const harbor=REGIONS[0].dock,home=(x-harbor.x)**2+(z-harbor.z)**2;
 return REGIONS.slice(1).every(r=>home-((x-r.dock.x)**2+(z-r.dock.z)**2)<=2*padding*Math.hypot(r.dock.x-harbor.x,r.dock.z-harbor.z));
}
// Kraken lagoon boundaries are explicitly authored; padding excludes the whole body.
export function isReefKrakenExclusion(x,z,padding=0){
 return insideKrakenZone(KRAKEN_EXCLUSION_ZONES.find(zone=>zone.id==='reef'),x,z,padding);
}
export function isEnemyPositionRestricted(target,x,z){
 // The enclosed central lagoon is a separate habitat from the outer port sectors.
 if(target.habitat==='central-lagoon')return Math.hypot(x,z)+target.radius>CENTRAL_HABITAT_RADIUS||centralBlocked(x,z,target.radius);
 return target.type==='octopus'?isKrakenExclusion(x,z,target.radius):isHarborSafeZone(x,z,target.radius);
}
export function dockAt(x,z){return REGIONS.find(r=>Math.hypot(x-r.dock.x,z-r.dock.z)<10)||null;}
export function navigable(x,z,padding=2){return Math.hypot(x,z)<MAP_RADIUS-padding&&!centralBlocked(x,z,padding)&&!fjordIslandBlocked(x,z,padding)&&!OBSTACLES.some(o=>Math.hypot((x-o.x)/(o.rx+padding),(z-o.z)/(o.rz+padding))<1);}
const BASE_ENCOUNTERS=REGIONS.flatMap((r,i)=>r.id==='harbor'?[]:['ship','shark','school','ship','submarine','octopus'].flatMap((type,j)=>{
 // Replace only the reef kraken with seven individually tracked sharks.
 if(r.id==='reef'&&type==='octopus')return Array.from({length:7},(_,n)=>{
  const p=polar(r.angle+(n-3)*.095, n%2?119:109);
  return {id:`reef-kraken-shark-${n+1}`,name:`${r.name} · 淺灘鯊魚 ${n+1}`,region:r.id,type:'shark',hp:Math.round(75*(1+(r.tier-1)*.16)),radius:2.3,speed:4,reward:25+r.tier*12,color:0x65576e,hostile:false,fleeing:true,start:[p.x,p.z]};
 });
 if(type==='octopus')return [];
 const a=r.angle+(j-2.5)*.15,p=r.id==='fjord'?fjordIslandToWorld([-48,-29,-10,10,29,48][j],j%2?88:78):polar(a,j%2?107:115);
 return {id:`${r.id}-${j}`,name:`${r.name} · ${['巡防海盜','尖牙鯊魚','黃金魚群','掠奪艦','銅翼潛艇','赤潮克拉肯'][j]}`,region:r.id,type,hp:Math.round(({ship:100,shark:75,school:60,submarine:115,octopus:180}[type])*(1+(r.tier-1)*.16)),radius:type==='octopus'?4.5:type==='school'?2.7:2.3,speed:type==='school'?4.7:type==='shark'?4:type==='octopus'?1.7:2.7,reward:25+r.tier*12,color:[0xa94635,0x355e72,0x557e80,0x65576e,0x9e6f39][i],hostile:!['shark','school'].includes(type),fleeing:['shark','school'].includes(type),start:[p.x,p.z]};
}));
// Keep authored encounters in the clear water off the new sea gate.
for(const target of BASE_ENCOUNTERS.filter(t=>t.region==='fjord')){
 if(navigable(...target.start,target.radius)&&!isEnemyPositionRestricted(target,...target.start))continue;
 let placed=false;for(const depth of[78,88,98]){for(const x of[0,-15,15,-30,30,-45,45]){
 const p=fjordIslandToWorld(x,depth);
 if(!navigable(p.x,p.z,target.radius+1)||isEnemyPositionRestricted(target,p.x,p.z)||regionAt(p.x,p.z).id!=='fjord')continue;
 if(BASE_ENCOUNTERS.some(other=>other!==target&&Math.hypot(p.x-other.start[0],p.z-other.start[1])<target.radius+other.radius+4))continue;
 target.start=[p.x,p.z];placed=true;break;
 }if(placed)break;}
 if(!placed)throw new Error('No navigable castle-town encounter position: '+target.id);
}
BASE_ENCOUNTERS.push(...KRAKEN_SPAWNS.map(spawn=>{
 const r=REGIONS.find(r=>r.id===spawn.region);
 return {...spawn,start:[...spawn.start],name:`${spawn.location} · 赤潮克拉肯`,type:'octopus',hp:Math.round(180*(1+(r.tier-1)*.16)),radius:4.5,speed:1.7,reward:25+r.tier*12,color:0xa7344e,hostile:true,fleeing:false};
}));
const CENTRAL_SHARKS=[[-10,-26],[14,-18],[-26,-14],[-18,2],[22,2],[10,22],[-2,26]].map((start,i)=>({
 id:'central-shark-'+(i+1),name:'中央秘境 · 內海鯊魚 '+(i+1),region:'central',habitat:'central-lagoon',
 type:'shark',sharkVariant:1,hp:87,radius:2.4,speed:4,reward:49,color:0x557e80,hostile:false,fleeing:true,start:start.map(v=>v*CENTRAL_HORIZONTAL_FACTOR)
}));
export const ENCOUNTERS=[...populateSharks(BASE_ENCOUNTERS,{regions:REGIONS,navigable,regionAt,restricted:isEnemyPositionRestricted}),...CENTRAL_SHARKS];
export const LOOT=REGIONS.flatMap(r=>Array.from({length:8},(_,j)=>{
 let p=r.id==='fjord'?fjordIslandToWorld([-48,-36,-24,-12,12,24,36,48][j],[81,90,99,81,90,99,81,90][j]):polar(r.angle+(j-3.5)*.12,j%2?125:99);
 if(!navigable(p.x,p.z,3))p=polar(r.angle+(j-3.5)*.12,111);
 return {id:`loot-${r.id}-${j}`,region:r.id,...p,kind:j%3===0?'parts':'gold',amount:j%3===0?2+r.tier:18+r.tier*8};
}));
export function whirlpoolForce(boat,vortex,dt){
 const dx=vortex.x-boat.x,dz=vortex.z-boat.z,d=Math.hypot(dx,dz);
 if(d>=vortex.radius)return 0;
 const nx=dx/Math.max(.2,d),nz=dz/Math.max(.2,d),strength=(1-d/vortex.radius),pull=1.4+strength*2.4;
 boat.x+=(nx*pull-nz*.6*strength)*dt;boat.z+=(nz*pull+nx*.6*strength)*dt;
 return d<vortex.radius*.65?dt*(4+strength*4):0;
}
export function upgradeOffer(save,region,kind){
 const n=Math.max(0,Number(save[kind])||0),cap=region.tier+2;
 return {cap,cost:(kind==='cannon'?80:60)+n*(kind==='cannon'?55:45),parts:n>=2?n:0,available:n<cap};
}
export function specialtyOffer(save,region){
 const level=Math.max(0,Number(save.armory?.[region.weapon])||0);
 return {level,cap:3,cost:90+region.tier*25+level*90,parts:2+level*2,available:level<3};
}
