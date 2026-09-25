import { advanceSails, sailEase } from './sail-motion.js';
import { PLAYER, CANNON, WORLD_RADIUS } from './constants.js';

export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const damp=(current,target,rate,dt)=>current+(target-current)*(1-Math.exp(-rate*dt));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const forward=yaw=>({x:Math.cos(yaw),z:-Math.sin(yaw)});
export const right=yaw=>({x:Math.sin(yaw),z:Math.cos(yaw)});
export const sideOf=(boat,target)=>((target.x-boat.x)*Math.sin(boat.yaw)+(target.z-boat.z)*Math.cos(boat.yaw))>=0?1:-1;
export function nearestSide(boat,targets){
  let nearest=null,best=Infinity;
  for(const t of targets){if(!t.alive||t.kind==='chest')continue;const d=distance(boat,t);if(d<best){best=d;nearest=t;}}
  return nearest?{side:sideOf(boat,nearest),target:nearest,distance:best}:{side:1,target:null,distance:Infinity};
}
export function createBoatState(x=-3,z=14,yaw=-Math.PI/2){return {x,z,yaw,vx:0,vz:0,speed:0,steering:0,hp:PLAYER.maxHp,maxHp:PLAYER.maxHp,sails:true,sailDeployment:1,invulnerable:0,speedBonus:0,damageBonus:0,minTurnRadius:PLAYER.minTurnRadius,steeringResponse:PLAYER.steeringResponse,acceleration:PLAYER.acceleration};}
export function stepBoat(boat,input,dt,obstacles=[]){
  const directional=!!input.directional;
  let headingError=Number.isFinite(input.targetYaw)?Math.atan2(Math.sin(input.targetYaw-boat.yaw),Math.cos(input.targetYaw-boat.yaw)):null;
  // Keep the chosen turn side stable near a 180-degree command.
  if(headingError!==null&&Math.abs(headingError)>Math.PI-.08&&Math.abs(boat.steering)>.1)headingError=-Math.sign(boat.steering)*Math.abs(headingError);
  const steer=directional&&headingError!==null?clamp(-headingError*1.8,-1,1):clamp(input.steer||0,-1,1),throttle=clamp(input.throttle||0,directional?0:-1,1);
  boat.sailDeployment=advanceSails(boat.sailDeployment??(boat.sails?1:0),boat.sails,dt);
  const deployed=sailEase(boat.sailDeployment),furled=1-deployed;
  boat.steering=damp(boat.steering,steer,(boat.steeringResponse??PLAYER.steeringResponse)*(1+.3*furled),dt);
  const max=(PLAYER.maxSpeed+(PLAYER.sailSpeed-PLAYER.maxSpeed)*deployed)*(1+(boat.speedBonus||0));
  const desired=throttle>=0?throttle*max:throttle*PLAYER.reverseSpeed;
  boat.speed=damp(boat.speed,desired,throttle===0?.8+.35*furled:(boat.acceleration??PLAYER.acceleration)*(1+.2*furled),dt);
  if(Math.abs(boat.speed)<.025)boat.speed=0;
  const travel=clamp(Math.abs(boat.speed)/max,0,1);
  const direction=Math.sign(boat.speed)||1;
  let yawRate=-boat.steering*direction*PLAYER.turnRate*(1+.28*furled)*(.15+.07*furled+(.85-.07*furled)*travel);
  if(directional){
    // Angular speed <= actual travel speed / radius. No stationary pivot.
    const limit=Math.hypot(boat.vx,boat.vz)/Math.max(.1,boat.minTurnRadius??PLAYER.minTurnRadius);
    yawRate=clamp(yawRate,-limit,limit);
    if(headingError!==null&&yawRate*headingError>0&&Math.abs(yawRate*dt)>Math.abs(headingError))yawRate=headingError/dt;
  }
  boat.yaw+=yawRate*dt;
  const f=forward(boat.yaw);
  const chop=1-.015*Math.sin(boat.x*.38+boat.z*.27);
  boat.vx=damp(boat.vx,f.x*boat.speed*chop,PLAYER.hullResponse*(1+.3*furled),dt);
  boat.vz=damp(boat.vz,f.z*boat.speed*chop,PLAYER.hullResponse*(1+.3*furled),dt);
  boat.x+=boat.vx*dt;boat.z+=boat.vz*dt;
  for(const obstacle of obstacles){
    const dx=boat.x-obstacle.x,dz=boat.z-obstacle.z,rx=obstacle.rx+PLAYER.radius,rz=obstacle.rz+PLAYER.radius;
    const norm=Math.hypot(dx/rx,dz/rz);
    if(norm>=1)continue;
    if(norm<.0001){boat.x=obstacle.x+rx*1.006;boat.vx=0;boat.vz=0;boat.speed=0;continue;}
    const nx=dx/(rx*rx),nz=dz/(rz*rz),nlen=Math.hypot(nx,nz)||1;
    const n={x:nx/nlen,z:nz/nlen};
    boat.x=obstacle.x+dx/norm*1.006;
    boat.z=obstacle.z+dz/norm*1.006;
    const into=boat.vx*n.x+boat.vz*n.z;
    if(into<0){boat.vx-=into*n.x;boat.vz-=into*n.z;boat.speed*=.72;}
  }
  const radius=Math.hypot(boat.x,boat.z);
  if(radius>WORLD_RADIUS){const k=WORLD_RADIUS/radius;boat.x*=k;boat.z*=k;boat.vx*=.35;boat.vz*=.35;boat.speed*=.7;}
  boat.invulnerable=Math.max(0,boat.invulnerable-dt);
  return boat;
}
export function createVolley(now,side,weapon=CANNON){return {side,weapon,shotsFired:0,nextShot:now,finishedAt:now+(CANNON.volleyCount-1)*CANNON.volleyInterval,reloadUntil:now+(CANNON.volleyCount-1)*CANNON.volleyInterval+weapon.reload};}
export function dueVolleyShots(volley,now){
  const shots=[];
  while(volley&&volley.shotsFired<CANNON.volleyCount&&now+1e-6>=volley.nextShot){
    shots.push(volley.shotsFired++);
    volley.nextShot+=CANNON.volleyInterval;
  }
  return shots;
}
