import * as THREE from 'three';
import {createTargetModel} from './models.js';
const refs=new Map();
function resources(group){const all=new Set();group.traverse(o=>{if(o.geometry)all.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){all.add(m);for(const v of Object.values(m))if(v?.isTexture)all.add(v);}});return all;}
export function createTargetStreamer(scene,targets){
 function unload(t){
  const old=t.model;scene.remove(old.group);old.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});
  for(const r of old.resources||[]){const n=(refs.get(r)||1)-1;if(n<=0){r.dispose();refs.delete(r);}else refs.set(r,n);}
  t.model={group:new THREE.Group(),loaded:false,animate(){}};
 }
 return {reset(){for(const t of targets)if(t.model.loaded)unload(t);},update(player){
  let built=false;
  const sorted=targets.slice().sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z));
  for(const t of sorted){const d=Math.hypot(t.x-player.x,t.z-player.z);
   if(t.model.loaded&&d>120&&!t.melee?.engaged){unload(t);continue;}
   if(!built&&!t.model.loaded&&t.alive&&d<85){
    const model=createTargetModel(t);model.loaded=true;model.resources=resources(model.group);for(const r of model.resources)refs.set(r,(refs.get(r)||0)+1);
    t.model=model;t.baseScale=model.group.scale.clone();t.baseY=model.group.position.y;
    model.group.position.set(t.x,model.waterline!=null?-model.waterline*model.group.scale.y:.18,t.z);model.group.rotation.y=t.yaw;scene.add(model.group);built=true;
   }
  }
 },count:()=>targets.filter(t=>t.model.loaded).length};
}
