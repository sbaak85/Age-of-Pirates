export const KRAKEN_RESPAWN_SECONDS=90;
export const KRAKEN_SPAWNS=Object.freeze([
 {id:'redrock-5',region:'redrock',location:'西北航道',start:[-78,-132]},
 {id:'fjord-5',region:'fjord',location:'蒼壁峽灣外海',start:[0,-126]},
 {id:'mist-5',region:'mist',location:'東南航道',start:[93,66]},
 {id:'kraken-south',region:'mist',location:'南方航道',start:[-2,138]},
].map(p=>Object.freeze({...p,start:Object.freeze(p.start)})));

// Authored from the two yellow lagoon outlines, not the nearest-port sectors.
export const KRAKEN_EXCLUSION_ZONES=Object.freeze([
 {id:'reef',name:'翡翠環礁禁航區',points:[[68,-134],[105,-145],[144,-129],[171,-97],[188,-49],[196,7],[179,32],[142,40],[112,31],[84,11],[65,-26],[49,-65],[39,-89],[44,-116]]},
 {id:'harbor',name:'暖沙港灣禁航區',points:[[-150,43],[-143,25],[-122,13],[-96,25],[-72,45],[-52,77],[-34,109],[-31,130],[-45,148],[-59,153],[-77,143],[-92,117],[-111,96],[-133,78],[-148,59]]},
].map(p=>Object.freeze({...p,points:Object.freeze(p.points.map(Object.freeze))})));

export function insideKrakenZone(zone,x,z,padding=0){
 let inside=false;
 const p=zone.points;
 for(let i=0,j=p.length-1;i<p.length;j=i++){
  const [ax,az]=p[j],[bx,bz]=p[i],dx=bx-ax,dz=bz-az;
  const u=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
  if(Math.hypot(x-ax-u*dx,z-az-u*dz)<=padding)return true;
  if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
 }
 return inside;
}
export function isKrakenExclusion(x,z,padding=0){
 return KRAKEN_EXCLUSION_ZONES.some(zone=>insideKrakenZone(zone,x,z,padding));
}
export function scheduleKrakenRespawn(target,now){
 if(target.type!=='octopus'||target.alive||target.respawnAt!=null)return;
 target.respawnAt=now+KRAKEN_RESPAWN_SECONDS;
 target.melee=null;
}
// Reuse the same four target records, including when their meshes are streamed out.
export function respawnKrakens(targets,now){
 const revived=[];
 for(const t of targets){
  if(t.type!=='octopus'||t.alive||t.respawnAt==null||now<t.respawnAt)continue;
  t.x=t.anchorX;t.z=t.anchorZ;t.health=t.hp;t.alive=true;t.yaw=0;t.patrol=0;
  t.respawnAt=null;t.sinkAt=null;t.sinkY=null;t.melee=null;t.damageFlash=0;t.attackAt=now+3;
  revived.push(t);
 }
 return revived;
}
