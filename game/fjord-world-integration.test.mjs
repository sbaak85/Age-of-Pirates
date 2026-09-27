import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createWorld} from './world.js';
import {MAP_RADIUS,REGIONS,navigable} from './archipelago-data.js';
import {FJORD_ISLAND,FJORD_ISLAND_CENTER,fjordIslandToWorld} from './fjord-island-placement.js';
import {FJORD_ISLAND_SOLIDS,fjordIslandBlocked} from './fjord-island-navigation.js';
import {ISLAND_COAST,SIDE_ISLAND_COAST} from './fjord-island-study.js';
import {SEA_SPAN} from './sea.js';

test('playable map uses the complete full-size fjord island and keeps the approach navigable',()=>{
 const world=createWorld(new T.Scene()),fjord=world.fjord;
 assert.equal(fjord.root.name,'蒼壁峽灣・主專案島嶼');
 assert.equal(fjord.root.position.x,FJORD_ISLAND_CENTER.x);
 assert.equal(fjord.root.position.z,FJORD_ISLAND_CENTER.z);
 assert.equal(fjord.root.rotation.y,FJORD_ISLAND.rotation);
 assert.ok(fjord.land&&fjord.sideIsland&&fjord.harbor&&fjord.castle&&fjord.gate&&fjord.statue);
 assert.equal(fjord.root.userData.houseCount,29);
 assert.ok(fjord.root.userData.terrainTriangles<=30000);
 assert.ok(!world.far.getObjectByName('蒼壁峽灣 · 海神城堡港鎮'),'old town remained in the playable scene');
 let drawables=0;fjord.root.traverse(o=>{if(o.isMesh)drawables++;});
 assert.ok(drawables<500,`fjord batching regressed to ${drawables} drawables`);
 for(const coast of[ISLAND_COAST,SIDE_ISLAND_COAST])for(const [x,z]of coast){const p=fjordIslandToWorld(x,z);assert.ok(Math.hypot(p.x,p.z)<MAP_RADIUS-10,'island reaches the playable boundary');}
 const dock=REGIONS.find(r=>r.id==='fjord').dock;
 assert.ok(navigable(dock.x,dock.z,3));
 for(const [x,z]of[[0,100],[0,75],[0,61],[0,47],[-9,35],[-9,12]]){const p=fjordIslandToWorld(x,z);assert.ok(navigable(p.x,p.z,1.7),`sea gate route blocked at ${x},${z}`);}
 for(const [x,z]of[[-17.5,61],[17.5,61],[0,32],[0,-50]]){const p=fjordIslandToWorld(x,z);assert.ok(fjordIslandBlocked(p.x,p.z),`solid ${x},${z} was omitted`);}
 assert.equal(FJORD_ISLAND_SOLIDS.length>8,true);
 assert.equal(world.ocean.mesh.geometry.parameters.width,SEA_SPAN);
 const shore=world.ocean.mesh.material.uniforms.shore.value,size=shore.image.width;
 const sample=(x,z)=>{const i=Math.round((x/SEA_SPAN+.5)*(size-1)),j=Math.round((z/SEA_SPAN+.5)*(size-1));return shore.image.data[(j*size+i)*4];};
 const land=fjordIslandToWorld(0,-50),open=fjordIslandToWorld(0,104);
 assert.ok(sample(land.x,land.z)<sample(open.x,open.z),'fjord shoreline is missing from ocean texture');
});
