import {CENTRAL_GRID as G,CENTRAL_ROWS} from './central-navigation-data.js';
export {CENTRAL_GRID,CENTRAL_ROWS} from './central-navigation-data.js';
export function centralDistance(x,z,limit=18){
 if(x<G.min-limit||z<G.min-limit||x>G.min+G.size*G.step+limit||z>G.min+G.size*G.step+limit)return limit;
 let best=limit;
 const a=Math.max(0,Math.floor((z-limit-G.min)/G.step)),b=Math.min(G.size-1,Math.floor((z+limit-G.min)/G.step));
 for(let row=a;row<=b;row++){
  const z0=G.min+row*G.step,dz=Math.max(z0-z,0,z-z0-G.step);if(dz>=best)continue;
  const runs=CENTRAL_ROWS[row];for(let j=0;j<runs.length;j+=2){const x0=G.min+runs[j]*G.step,x1=G.min+runs[j+1]*G.step,dx=Math.max(x0-x,0,x-x1);best=Math.min(best,Math.hypot(dx,dz));if(best===0)return 0;}
 }
 return best;
}
export function centralBlocked(x,z,radius=0){return centralDistance(x,z,radius+.01)<=radius;}

// Project a hull out of the occupancy field, retaining its tangential motion.
// The old X/Z rollback treated diagonal cave walls as square corners and erased
// propulsion every frame; it also could not recover an already overlapping hull.
function clearPosition(x,z,radius,previous){
 const clearance=radius+.025;
 for(let i=0;i<12;i++){
  const d=centralDistance(x,z,clearance+.8);
  if(d>=clearance)return {x,z};
  const e=.3;
  const gx=centralDistance(x+e,z,clearance+1)-centralDistance(x-e,z,clearance+1);
  const gz=centralDistance(x,z+e,clearance+1)-centralDistance(x,z-e,clearance+1);
  const length=Math.hypot(gx,gz);
  if(length<1e-6)break;
  x+=gx/length*(clearance-d+.01);z+=gz/length*(clearance-d+.01);
 }
 // Rare recovery for a collision push / old position already inside a solid cell.
 // Search locally, preferring the last clear side instead of crossing a wall.
 for(let reach=.15;reach<=radius+2;reach+=.15){
  let best=null,bestScore=Infinity;
  for(let i=0;i<48;i++){
   const a=i*Math.PI/24,px=x+Math.cos(a)*reach,pz=z+Math.sin(a)*reach;
   if(centralBlocked(px,pz,clearance))continue;
   const score=previous?Math.hypot(px-previous.x,pz-previous.z):reach;
   if(score<bestScore){best={x:px,z:pz};bestScore=score;}
  }
  if(best)return best;
 }
 return previous&&!centralBlocked(previous.x,previous.z,radius)?previous:null;
}
export function resolveCentralMotion(boat,oldX,oldZ,radius){
 boat.centralContact=false;
 const dx=boat.x-oldX,dz=boat.z-oldZ;
 // Swept substeps prevent crossing thin bone/cave colliders at low frame rates.
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.25));
 let position={x:oldX,z:oldZ},moveX=dx/steps,moveZ=dz/steps;
 if(centralBlocked(oldX,oldZ,radius)){
  position=clearPosition(oldX,oldZ,radius,null)||position;
  boat.centralContact=true;
 }
 for(let i=0;i<steps;i++){
  const x=position.x+moveX,z=position.z+moveZ;
  if(!centralBlocked(x,z,radius+.015)){position={x,z};continue;}
  const next=clearPosition(x,z,radius,position);
  boat.centralContact=true;
  if(!next)break;
  const nx=next.x-x,nz=next.z-z,n=Math.hypot(nx,nz);
  if(n>1e-6){
   const ux=nx/n,uz=nz/n,into=boat.vx*ux+boat.vz*uz,moveInto=moveX*ux+moveZ*uz;
   if(into<0){boat.vx-=into*ux;boat.vz-=into*uz;}
   if(moveInto<0){moveX-=moveInto*ux;moveZ-=moveInto*uz;}
  }
  position=next;
 }
 boat.x=position.x;boat.z=position.z;
}
