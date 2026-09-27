import test from 'node:test';
import assert from 'node:assert/strict';
import {FJORD_COAST_APRONS,fjordBlocked,fjordSurfaceHeight,fjordToWorld} from './fjord-layout.js';
import {createFjordCliffs} from './fjord-cliffs.js';
import {navigable} from './archipelago-data.js';

test('the widened citadel and both sea-gate feet remain founded on connected rock',()=>{
 for(const x of[-20,0,20])for(const z of[-42,-34,-25])
  assert.equal(fjordSurfaceHeight(x,z),10,`citadel shelf missing at ${x},${z}`);
 for(const x of[-17.5,17.5])assert.ok(fjordSurfaceHeight(x,31)>=3.5);
});

test('moored harbor craft have hull collisions without sealing the working channel',()=>{
 for(const p of[[-20.1,-3.65],[20,-3.55],[5.5,-3.3]]){
  const w=fjordToWorld(...p);assert.ok(fjordBlocked(w.x,w.z),`skiff hull is passable at ${p}`);
 }
 for(const z of[-10,-6,-3,0,5,10,14]){
  const p=fjordToWorld(-9,z);
  assert.ok(navigable(p.x,p.z,1.7),`inner harbor channel pinched near z=${z}`);
 }
});

test('outer cliff skirts slope from the settled rock to submerged feet with matching waterline collision',()=>{
 const cliffs=createFjordCliffs();assert.equal(FJORD_COAST_APRONS.length,6);
 for(const apron of FJORD_COAST_APRONS){
  const p=apron.stations[Math.floor(apron.stations.length/2)],at=f=>fjordToWorld(p.x+p.dx*p.reach*f,p.z+p.dz*p.reach*f);
  assert.ok(p.reach>=4.5,`${apron.id} did not create a visible coast buffer`);
  assert.equal(fjordSurfaceHeight(p.x+p.dx*p.reach*.65,p.z+p.dz*p.reach*.65),0,`${apron.id} replaced the slope with a flat building pad`);
  assert.ok(fjordBlocked(...Object.values(at(.65))),`${apron.id} has a pass-through exposed rock face`);
  assert.ok(!fjordBlocked(...Object.values(at(1))),`${apron.id} has no navigable underwater toe`);
  const mesh=cliffs.getObjectByName('入海緩坡岩腳・'+apron.id),y=mesh.geometry.attributes.position;
  let lo=Infinity,hi=-Infinity;for(let i=0;i<y.count;i++){lo=Math.min(lo,y.getY(i));hi=Math.max(hi,y.getY(i));}
  assert.ok(lo<-2&&hi>apron.height-.2,`${apron.id} rock does not meet both land and seabed`);
  assert.ok(y.count/3<5000,`${apron.id} exceeds its mesh budget`);
 }
});
