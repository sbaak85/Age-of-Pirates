import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createFjordIslandStudy,BUILDING_TERRACES,HARBOR_FOUNDATION_TOP,MAIN_WALKWAY_ROUTES,harborFoundationSignedDistance} from './fjord-island-study.js';
import {createFjordIslandWalkways} from './fjord-island-walkways.js';

test('every mainland cottage plot connects to the harbor through graded pedestrian stairs',()=>{
 const plots=BUILDING_TERRACES.filter(p=>p.island==='main'&&p.name!=='主堡用地');
 const byName=new Map(plots.map(plot=>[plot.name,plot]));
 const graph=new Map();
 for(const route of MAIN_WALKWAY_ROUTES){
  for(const [a,b]of[[route.from,route.to],[route.to,route.from]]){
   if(!graph.has(a))graph.set(a,[]);
   graph.get(a).push(b);
  }
  for(const [name,point]of[[route.from,route.points[0]],[route.to,route.points.at(-1)]]){
   if(name==='港口'){
    assert.ok(harborFoundationSignedDistance(point[0],point[1])>=0,`${route.name} meets the stone quay`);
    assert.ok(Math.abs(point[2]-HARBOR_FOUNDATION_TOP)<.01);
   }else{
    const plot=byName.get(name);assert.ok(plot,`${name} is a reserved house plot`);
    const q=Math.pow(((point[0]-plot.x)/plot.rx)**4+((point[1]-plot.z)/plot.rz)**4,.25);
    assert.ok(q<=1,`${route.name} reaches the level part of ${name}`);
    assert.ok(Math.abs(point[2]-plot.y)<.01);
   }
  }
 }
 const reached=new Set(['港口']),todo=['港口'];
 while(todo.length)for(const neighbor of graph.get(todo.shift())??[])if(!reached.has(neighbor)){
  reached.add(neighbor);todo.push(neighbor);
 }
 for(const plot of plots)assert.ok(reached.has(plot.name),`${plot.name} is connected to the harbor`);
 assert.equal(MAIN_WALKWAY_ROUTES.length,7);
 assert.ok(MAIN_WALKWAY_ROUTES.filter(route=>route.name.includes('折返')).length>=3);
});

test('west lowland and east lower stair centerlines meet plot edges without crossing the buildable pads',()=>{
 for(const name of ['西岸低地','東坡下層']){
  const plot=BUILDING_TERRACES.find(p=>p.name===name);
  for(const route of MAIN_WALKWAY_ROUTES.filter(r=>r.from===name||r.to===name)){
   for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i];
    for(let j=0;j<=100;j++){
     const t=j/100,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
     const q=Math.pow(((x-plot.x)/plot.rx)**4+((z-plot.z)/plot.rz)**4,.25);
     assert.ok(q>=.97,`${route.name} segment ${i} must stay at the edge of ${name}`);
    }
   }
  }
 }
});

test('stair treads and turn landings stay walkable and rest on the rendered rock or quay',()=>{
 const terrain=createFjordIslandStudy(),walkways=createFjordIslandWalkways(terrain.land);
 assert.ok(terrain.group.userData.terrainTriangles+walkways.userData.earthTriangles<=30000,
  'terrain and built earth stair foundations share the 30K terrain budget');
 assert.ok(walkways.userData.minRun>=.28&&walkways.userData.maxGrade<.6);
 assert.ok(walkways.userData.landingCount>=25);
 const ray=new T.Raycaster(),matrix=new T.Matrix4(),position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3();
 let counted=0;
 for(const route of walkways.children.filter(child=>child.type==='Group')){
  assert.ok(route.children.some(child=>child.name==='石階下方隨山坡收邊的岩土路基'),`${route.name} has a grounded earth bed`);
  for(const flight of route.children.filter(child=>child.isInstancedMesh)){
   let previous=null;
   for(let i=0;i<flight.count;i++){
    flight.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
    const top=position.y+scale.y/2,bottom=position.y-scale.y/2;
    ray.set(new T.Vector3(position.x,100,position.z),new T.Vector3(0,-1,0));
    const hit=ray.intersectObject(terrain.land)[0];assert.ok(hit);
    const support=harborFoundationSignedDistance(position.x,position.z)>=0?HARBOR_FOUNDATION_TOP:hit.point.y;
    assert.ok(top>=support-.05,`${route.name} tread ${i} is not buried`);
    assert.ok(bottom<=support-.2,`${route.name} tread ${i} has a grounded base`);
    assert.ok(flight.userData.run>=.28&&flight.userData.riseLimit<=.18);
    if(previous!==null)assert.ok(Math.abs(top-previous)<=.18,`${route.name} risers remain walkable`);
    previous=top;counted++;
   }
  }
 }
 assert.equal(counted,walkways.userData.stepCount);
});
