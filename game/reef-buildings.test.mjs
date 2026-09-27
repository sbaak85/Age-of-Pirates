import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {reefCottage,villageSlots} from './archipelago-art.js';
import {REGIONS} from './archipelago-data.js';
test('every reef cottage has seated roofs, connected parts and grounded descending stairs',()=>{
 for(const s of villageSlots(REGIONS.find(r=>r.id==='reef')))for(const detail of [false,true]){
  const g=new THREE.Group();reefCottage(g,0,0,0,s.slot,detail);g.updateMatrixWorld(true);
  const bounds=o=>new THREE.Box3().setFromObject(o);
  const wall=bounds(g.getObjectByName('完整牆體')),roof=bounds(g.getObjectByName('貼合牆頂的完整屋頂'));
  assert.ok(roof.min.y<=wall.max.y&&roof.min.y>wall.max.y-.1,'roof sits on wall');
  assert.ok(roof.min.x<wall.min.x&&roof.max.x>wall.max.x&&roof.min.z<wall.min.z&&roof.max.z>wall.max.z,'eaves cover all walls including cross gable');
  const deck=bounds(g.getObjectByName('門廊地板'));
  const stairs=g.children.filter(o=>o.name.startsWith('落地階梯')).map(bounds);
  assert.ok(stairs[0].intersectsBox(deck),'top stair touches porch');
  for(let i=0;i<stairs.length;i++){
   assert.ok(Math.abs(stairs[i].min.y)<1e-6,'solid stair reaches ground');
   if(i)assert.ok(stairs[i].max.y<stairs[i-1].max.y&&stairs[i].intersectsBox(stairs[i-1]),'stairs descend continuously');
  }
  const boxes=g.children.map(o=>bounds(o).expandByScalar(.002)),seen=new Set([0]);
  for(let pass=0;pass<boxes.length;pass++)for(let i=0;i<boxes.length;i++)if(!seen.has(i)&&[...seen].some(j=>boxes[i].intersectsBox(boxes[j])))seen.add(i);
  assert.equal(seen.size,boxes.length,'unattached parts in cottage '+s.slot);
  const triangles=g.children.reduce((n,o)=>n+(o.geometry.index?.count??o.geometry.attributes.position.count)/3,0);
  assert.ok(triangles<5000);
 }
});
