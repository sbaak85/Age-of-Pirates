import { createWaterMist } from './water-mist-column.js';

export class WaterImpactPool {
  constructor(scene,limit=6){
    this.serial=0;
    this.slots=Array.from({length:limit},()=>{
      const effect=createWaterMist();effect.group.visible=false;scene.add(effect.group);
      return {effect,active:false,age:0,serial:0};
    });
  }
  spawn(x,y,z){
    const slot=this.slots.find(s=>!s.active)||this.slots.reduce((a,b)=>a.serial<b.serial?a:b);
    slot.effect.group.position.set(x,y,z);slot.effect.update(0);
    slot.age=0;slot.serial=++this.serial;slot.active=true;
  }
  update(dt,camera){
    for(const slot of this.slots){
      if(!slot.active)continue;
      slot.age+=dt;
      if(slot.age>=2.4){slot.active=false;slot.effect.group.visible=false;continue;}
      if(dt>0)slot.effect.update(slot.age);
      slot.effect.prepare(camera);
    }
  }
  clear(){for(const slot of this.slots){slot.active=false;slot.effect.group.visible=false;}}
}
