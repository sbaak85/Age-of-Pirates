export const KRAKEN_MELEE=Object.freeze({detect:32,disengage:40,approach:8.5,reach:10.5,halfAngle:Math.PI/3,windup:1.4,impact:1.68,recovery:3,cooldown:4.8,damage:26,speed:3.8});
const delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

// Uses game time so pausing also freezes anticipation, contact and cooldown.
export function stepKrakenCombat(target,player,now,safe=false){
  const s=target.melee??={engaged:false,startedAt:null,nextAttack:0,struck:false,heading:0,age:undefined};
  if(safe){s.engaged=false;s.startedAt=null;s.struck=false;s.age=undefined;return {engaged:false,locked:false,started:false,strike:false,hit:false,warning:false,age:undefined,speed:0};}
  const dx=player.x-target.x,dz=player.z-target.z,distance=Math.hypot(dx,dz),toward=Math.atan2(-dz,dx);
  let started=false,strike=false,hit=false;
  if(!target.alive)return {engaged:false,locked:false,started,strike,hit,warning:false,age:undefined,speed:0};
  if(distance<KRAKEN_MELEE.detect)s.engaged=true;
  else if(distance>KRAKEN_MELEE.disengage&&s.startedAt===null)s.engaged=false;
  if(s.startedAt===null&&s.engaged&&distance<=KRAKEN_MELEE.approach&&now>=s.nextAttack&&Math.abs(delta(toward,target.yaw))<.4){
    s.startedAt=now;s.heading=target.yaw;s.struck=false;s.nextAttack=now+KRAKEN_MELEE.cooldown;started=true;
  }
  s.age=s.startedAt===null?undefined:now-s.startedAt;
  if(s.age!==undefined&&!s.struck&&s.age>=KRAKEN_MELEE.impact){
    strike=true;s.struck=true;
    // Check the player's current location, not their position at windup start.
    hit=distance<=KRAKEN_MELEE.reach&&Math.abs(delta(toward,s.heading))<=KRAKEN_MELEE.halfAngle;
  }
  if(s.age>=KRAKEN_MELEE.recovery){s.startedAt=null;s.age=undefined;}
  const locked=s.startedAt!==null;
  return {engaged:s.engaged,locked,started,strike,hit,warning:locked&&s.age<KRAKEN_MELEE.impact,age:s.age,heading:locked?s.heading:toward,speed:locked?0:distance>KRAKEN_MELEE.approach-.3?KRAKEN_MELEE.speed:0};
}
