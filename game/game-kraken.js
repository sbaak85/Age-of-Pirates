import * as THREE from 'three';
import { createKraken } from './kraken-models.js';

export const KRAKEN_GAME_SCALE=1.65;
export const KRAKEN_WATERLINE=1.84;

export function createGameKraken(){
  const creature=createKraken(0,{seaPose:true}),group=new THREE.Group();
  group.name='赤潮克拉肯';group.scale.setScalar(KRAKEN_GAME_SCALE);
  // Preview faces +Z; navigation and enemy firing face +X.
  creature.group.rotation.y=Math.PI/2;group.add(creature.group);
  group.userData.dynamic=true;
  let lastTime=0,attackTime=-Infinity;
  return {group,waterline:KRAKEN_WATERLINE,
    attack(){attackTime=lastTime;},
    animate(time,combatAge){lastTime=time;const age=combatAge??(time-attackTime);
      creature.update(age>=0&&age<3?age:time,age>=0&&age<3?'attack':'swim');
    }
  };
}
