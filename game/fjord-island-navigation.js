import {ISLAND_COAST,SIDE_ISLAND_COAST,HARBOR_FOUNDATION_COAST,islandSignedDistance,sideIslandSignedDistance,harborFoundationSignedDistance,islandHeight,sideIslandHeight,HARBOR_FOUNDATION_TOP} from './fjord-island-study.js';
import {fjordIslandToLocal} from './fjord-island-placement.js';

const circle=(x,z,r,n=16)=>Array.from({length:n},(_,i)=>[x+Math.cos(i*2*Math.PI/n)*r,z+Math.sin(i*2*Math.PI/n)*r]);
const rectangle=(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
const ellipse=(x,z,rx,rz,n=12)=>Array.from({length:n},(_,i)=>[x+Math.cos(i*2*Math.PI/n)*rx,z+Math.sin(i*2*Math.PI/n)*rz]);
export const FJORD_ISLAND_SOLIDS=[
 {id:'main-island',points:ISLAND_COAST,height:60},
 {id:'western-reef',points:ellipse(-119,63,8,11),height:4},
 {id:'channel-island',points:SIDE_ISLAND_COAST,height:45},
 {id:'harbor-foundation',points:HARBOR_FOUNDATION_COAST,height:HARBOR_FOUNDATION_TOP},
 {id:'poseidon-plinth',points:circle(0,32,5.8),height:4},
 ...[-20,0,20].map(x=>({id:`pier-${x}`,points:rectangle(x,0,3.5,11),height:1.5})),
 ...[[-23.06,7],[3.06,7],[23.06,7]].map(([x,z],i)=>({id:`moored-boat-${i}`,points:ellipse(x,z,1.1,2.7),height:1.4})),
 ...[-17.5,17.5].map(x=>({id:`gate-tower-${x}`,points:circle(x,61,5.65),height:27})),
];
const extra=FJORD_ISLAND_SOLIDS.slice(4);
function polygonDistance(x,z,points){let inside=false,d=Infinity;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[j],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],denom=dx*dx+dz*dz;
  const t=denom?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/denom)):0;
  d=Math.min(d,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));
  if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside?-d:d;
}
function localDistance(x,z,limit){
 if(x<-147-limit||x>213+limit||z<-156-limit||z>83+limit)return limit;
 let d=Math.min(-islandSignedDistance(x,z),-sideIslandSignedDistance(x,z),-harborFoundationSignedDistance(x,z));
 for(const solid of extra){
  if(solid.points.every(p=>Math.abs(x-p[0])>limit+10||Math.abs(z-p[1])>limit+10))continue;
  d=Math.min(d,polygonDistance(x,z,solid.points));
 }
 return Math.min(limit,d);
}
export function fjordIslandDistance(x,z,limit=18){const p=fjordIslandToLocal(x,z);return localDistance(p.x,p.z,limit);}
export const fjordIslandBlocked=(x,z,r=0)=>fjordIslandDistance(x,z,r+.02)<=r;
export function fjordIslandProjectileBlocked(x,z,y){
 const p=fjordIslandToLocal(x,z);
 if(p.x<-147||p.x>213||p.z<-156||p.z>83)return false;
 if(islandSignedDistance(p.x,p.z)>0&&y<islandHeight(p.x,p.z))return true;
 if(sideIslandSignedDistance(p.x,p.z)>0&&y<sideIslandHeight(p.x,p.z))return true;
 if(harborFoundationSignedDistance(p.x,p.z)>0&&y<HARBOR_FOUNDATION_TOP)return true;
 return extra.some(s=>y<s.height&&polygonDistance(p.x,p.z,s.points)<0);
}
export function resolveFjordIslandMotion(boat,oldX,oldZ,radius){
 boat.fjordContact=false;
 const dx=boat.x-oldX,dz=boat.z-oldZ,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.3));
 let x=oldX,z=oldZ;
 for(let k=0;k<n;k++){
  let xx=x+dx/n,zz=z+dz/n;
  for(let j=0;j<12;j++){
   const d=fjordIslandDistance(xx,zz,radius+1);
   if(d>radius+.015)break;
   boat.fjordContact=true;
   const e=.08,gx=fjordIslandDistance(xx+e,zz,30)-fjordIslandDistance(xx-e,zz,30),gz=fjordIslandDistance(xx,zz+e,30)-fjordIslandDistance(xx,zz-e,30),len=Math.hypot(gx,gz);
   if(len<1e-7){xx=x;zz=z;break;}
   const ux=gx/len,uz=gz/len;xx+=ux*(radius+.025-d);zz+=uz*(radius+.025-d);
   const into=boat.vx*ux+boat.vz*uz;if(into<0){boat.vx-=into*ux;boat.vz-=into*uz;}
  }
  if(!fjordIslandBlocked(xx,zz,radius)){x=xx;z=zz;}
 }
 boat.x=x;boat.z=z;
}
