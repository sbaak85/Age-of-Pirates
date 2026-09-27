import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createHouse,triangleCount} from './fjord-models.js';
import {createFjordHarborProps} from './fjord-harbor-props.js';

test('four variants per fjord house style stay inside the established cliff foundation and model budget',()=>{
 for(const greek of[true,false]){
  const silhouettes=[];
  for(let variant=0;variant<4;variant++){
   const house=createHouse(greek,variant),bounds=new T.Box3().setFromObject(house);
   assert.ok(triangleCount(house)<5000,`${greek?'Greek':'tile'} ${variant} exceeds model budget`);
   assert.ok(bounds.min.x>=-3.01&&bounds.max.x<=3.01,'house outgrows its stone foundation');
   assert.ok(bounds.min.z>=-2.75&&bounds.max.z<=4.01,'house outgrows its shore terrace');
   assert.ok(Math.abs(bounds.min.y)<.01,'entry steps no longer meet foundation base');
   silhouettes.push(bounds.max.y.toFixed(2));
  }
  assert.ok(new Set(silhouettes).size>=2,'all houses have the same roofline');
 }
});

test('moorings add three distinct waterline boats without occupying the player docking point',()=>{
 const harbor=createFjordHarborProps();
 const boats=harbor.children.filter(o=>o.userData.moored);
 assert.equal(boats.length,3);
 for(const boat of boats){
  const bounds=new T.Box3().setFromObject(boat);
  assert.ok(bounds.min.y<0&&bounds.max.y>.3,boat.name+' does not cross the sea surface');
  assert.ok(Math.hypot(boat.position.x+8,boat.position.z+4+8)>8,boat.name+' blocks the player berth');
  assert.ok(triangleCount(boat)<1000,boat.name+' exceeds the small-boat budget');
 }
 for(const child of harbor.children)assert.ok(triangleCount(child)<5000,child.name+' exceeds individual prop budget');
});
