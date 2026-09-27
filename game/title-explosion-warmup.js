// Exercise the gameplay explosion pool while the cover still hides the scene.
// The same materials and geometry remain in the pool for the first real hit.
export function createTitleExplosionWarmup(effects,positions,duration){
 let state='pending',elapsed=0;
 return {
  get complete(){return state==='done';},
  get progress(){return Math.min(1,elapsed/duration);},
  update(dt,camera,covered){
   if(state==='done')return false;
   if(!covered){
    if(state==='running')effects.clear();
    state='done';return false;
   }
   if(state==='pending'){
    for(const {kind,x,y,z} of positions)effects.explosion(x,y,z,kind);
    state='running';
   }
   effects.update(dt,camera);
   elapsed+=dt;
   if(elapsed>=duration){effects.clear();state='done';}
   return true;
  },
 };
}
