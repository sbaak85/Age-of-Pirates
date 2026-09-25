import {createSharkVariant} from './shark-variants.js';
import {batchStatic} from './optimization.js';
export function createGameShark(def){
 const shark=createSharkVariant(def.sharkVariant??1);
 shark.group.scale.multiplyScalar(.8);
 // Keep moving parts separate, while batching gums, teeth and other static detail.
 for(const object of [shark.body,shark.tail,shark.jaw])object.userData.dynamic=true;
 shark.group.traverse(o=>{if(o.name==='胸鰭')o.userData.dynamic=true;});
 for(const root of [shark.jaw,shark.fluke,shark.group]){
  const before=new Set();root.traverse(o=>{if(o.geometry)before.add(o.geometry);});
  batchStatic(root);
  root.traverse(o=>before.delete(o.geometry));before.forEach(g=>g.dispose());
 }
 return {...shark,waterline:.48};
}
