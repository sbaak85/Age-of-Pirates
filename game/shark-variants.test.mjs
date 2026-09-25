import test from 'node:test';
import assert from 'node:assert/strict';
import {createSharkVariant,SHARK_VARIANTS} from './shark-variants.js';
test('both rebuilt sharks retain finite geometry throughout swimming',()=>{
 assert.equal(SHARK_VARIANTS.length,2);
 for(let i=0;i<2;i++){
  const shark=createSharkVariant(i);
  shark.animate(0);const initial=shark.body.geometry.attributes.position.array.slice();
  for(const t of [.2,1,5,50])for(const mode of ['cruise','burst']){
   shark.animate(t,mode);
   shark.group.traverse(o=>{if(o.isMesh)for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));});
  }
  assert.notDeepEqual(shark.body.geometry.attributes.position.array,initial);
  assert.ok(shark.group.getObjectByName('主背鰭'));
  assert.ok(shark.group.getObjectByName('上尾葉'));
 }
});
