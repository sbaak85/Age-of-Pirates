// A2 authored layout: persistent world data is independent of streamed visual detail.
export const MAP_RADIUS=210;
export const polar=(a,r)=>({x:Math.cos(a)*r,z:Math.sin(a)*r});
export const REGIONS=[
 {id:'harbor',name:'暖沙港灣',village:'暖沙港',angle:2.35,tier:1,rock:0xbda17d,roof:0xbc6548,grass:0x729965,weapon:'standard',special:'均衡砲組',description:'暖色灰泥村屋、階梯碼頭與棕櫚海岸'},
 {id:'redrock',name:'赤岩群柱',village:'赤岩鑄砲村',angle:3.6,tier:2,rock:0xb66f4d,roof:0x537e78,grass:0x809458,weapon:'heavy',special:'破艦重砲',description:'層疊紅砂岩、石柱與天然拱門'},
 {id:'fjord',name:'蒼壁峽灣',village:'蒼壁古港',angle:4.8,tier:4,rock:0x778b98,roof:0x476478,grass:0x617f69,weapon:'long',special:'遠射追獵砲',description:'高聳灰藍峭壁、沿岸古城與峽灣遺跡'},
 {id:'reef',name:'翡翠環礁',village:'翡翠漁村',angle:5.85,tier:2,rock:0xc5ad7b,roof:0x409d94,grass:0x619e69,weapon:'rapid',special:'速射珊瑚砲',description:'青綠淺灘、珊瑚台地與水上漁村'},
 {id:'mist',name:'霧隱海灣',village:'霧隱工坊港',angle:.85,tier:3,rock:0x82939a,roof:0x735b72,grass:0x54877c,weapon:'storm',special:'風暴重擊砲',description:'海蝕洞口、層樓聚落與局部海霧'},
].map(r=>({...r,...polar(r.angle,156),dock:polar(r.angle,130)}));
export const START={...polar(REGIONS[0].angle,124),yaw:Math.PI-REGIONS[0].angle};
// Hand-authored Coralhaven from the first island preview, just off the main harbor approach.
export const CORALHAVEN={...polar(REGIONS[0].angle-.18,136),radius:15};
export const TERRAIN=[];
for(const region of REGIONS){
 for(let j=-2;j<=2;j++){
  const a=region.angle+j*.16+(j===0?0:Math.sin(j*3.7+region.tier)*.025);
  const p=polar(a,j===0?169:166+(Math.abs(j)%2)*5+Math.sin(j*2.4+region.tier)*2);
  // Leave a ship-width water channel below each of the two bridge houses.
  if(region.id==='harbor'&&j===-2){p.x+=Math.sin(region.angle)*30;p.z-=Math.cos(region.angle)*30;}
  if(region.id==='harbor'&&j===2){p.x-=Math.sin(region.angle)*30;p.z+=Math.cos(region.angle)*30;}
  const rx=j===0?33:region.id==='reef'?19+Math.abs(j)*2:region.id==='redrock'?13+Math.abs(j):16+((j+region.tier+5)%3)*2;
  const rz=j===0?33:region.id==='fjord'?14+Math.abs(j)*2:region.id==='reef'?19:16+((j*2+region.tier+6)%3)*2;
  const h=j===0?5.2:region.id==='reef'?8+Math.abs(j)*2:region.id==='redrock'?27+Math.abs(j)*5:region.id==='fjord'?32+Math.abs(j)*7:region.tier*5+11+(j+2)%3*3;
  TERRAIN.push({...p,rx,rz,h,region:region.id,seed:TERRAIN.length});
 }
 // Inside coast of the navigable ring; passage radius 111 remains unobstructed.
 for(let j=-1;j<=1;j++){
  const p=polar(region.angle+j*.22,72);
  TERRAIN.push({...p,rx:14,rz:16,h:region.id==='reef'?8:18+region.tier*4,region:region.id,seed:TERRAIN.length});
 }
 // Two smaller satellites per coast create varied shore silhouettes and narrower, readable waterways.
 const outer=polar(region.angle+.38,183),inner=polar(region.angle-.36,78);
 if(region.id==='harbor'){outer.x-=Math.sin(region.angle)*30;outer.z+=Math.cos(region.angle)*30;}
 TERRAIN.push({...outer,rx:region.id==='reef'?12:8,rz:region.id==='fjord'?13:10,h:region.id==='reef'?5:9+region.tier*2,region:region.id,seed:TERRAIN.length});
 TERRAIN.push({...inner,rx:region.id==='redrock'?8:10,rz:region.id==='mist'?13:9,h:region.id==='reef'?6:12+region.tier*3,region:region.id,seed:TERRAIN.length});
}
// Two central mountain masses leave an open north/south sea-arch passage.
TERRAIN.push({x:-30,z:0,rx:20,rz:49,h:39,region:'harbor',seed:51},{x:30,z:0,rx:20,rz:49,h:46,region:'fjord',seed:52});
export const OBSTACLES=TERRAIN.map(t=>({x:t.x,z:t.z,rx:t.rx,rz:t.rz}));
OBSTACLES.push({x:CORALHAVEN.x,z:CORALHAVEN.z,rx:CORALHAVEN.radius,rz:CORALHAVEN.radius});
for(const [x,z,w,rot] of [[0,0,22,0],[-151,-65,22,Math.PI/2],[83,123,20,Math.PI/2]])for(const side of [-1,1])OBSTACLES.push({x:x+Math.cos(rot)*side*w/2,z:z-Math.sin(rot)*side*w/2,rx:4.5,rz:4.5});
for(const r of REGIONS){const u={x:Math.cos(r.angle),z:Math.sin(r.angle)};OBSTACLES.push({x:u.x*141,z:u.z*141,rx:Math.abs(u.x)*7+Math.abs(u.z)*2,rz:Math.abs(u.z)*7+Math.abs(u.x)*2});}
export const WHIRLPOOLS=[{id:'whirl-1',...polar(3.0,122),radius:11},{id:'whirl-2',...polar(4.28,105),radius:12},{id:'whirl-3',...polar(.2,112),radius:10}];
export function regionAt(x,z){return REGIONS.reduce((best,r)=>Math.hypot(x-r.dock.x,z-r.dock.z)<Math.hypot(x-best.dock.x,z-best.dock.z)?r:best,REGIONS[0]);}
export function dockAt(x,z){return REGIONS.find(r=>Math.hypot(x-r.dock.x,z-r.dock.z)<10)||null;}
export function navigable(x,z,padding=2){return Math.hypot(x,z)<MAP_RADIUS-padding&&!OBSTACLES.some(o=>Math.hypot((x-o.x)/(o.rx+padding),(z-o.z)/(o.rz+padding))<1);}
export const ENCOUNTERS=REGIONS.flatMap((r,i)=>['ship','shark','school','ship','submarine','octopus'].map((type,j)=>{
 const a=r.angle+(j-2.5)*.15,p=polar(a,j%2?107:115);
 return {id:`${r.id}-${j}`,name:`${r.name} · ${['巡防海盜','尖牙鯊魚','黃金魚群','掠奪艦','銅翼潛艇','赤潮克拉肯'][j]}`,region:r.id,type,hp:Math.round(({ship:100,shark:75,school:60,submarine:115,octopus:180}[type])*(1+(r.tier-1)*.16)),radius:type==='octopus'?4.5:type==='school'?2.7:2.3,speed:type==='school'?4.7:type==='shark'?4:type==='octopus'?1.7:2.7,reward:25+r.tier*12,color:[0xa94635,0x355e72,0x557e80,0x65576e,0x9e6f39][i],hostile:!['shark','school'].includes(type),fleeing:['shark','school'].includes(type),start:[p.x,p.z]};
}));
export const LOOT=REGIONS.flatMap(r=>Array.from({length:8},(_,j)=>{
 const p=polar(r.angle+(j-3.5)*.12,j%2?125:99);
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
