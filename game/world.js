import * as THREE from 'three';
import {createSea} from './sea.js';
import {TERRAIN,REGIONS,OBSTACLES,CORALHAVEN,regionAt} from './archipelago-data.js';
import {createTerrainBase,createReefClusterBeds,createVillageBase,detailsForRegion,createArches,createWhirlpoolVisuals,releaseChunk,instanceKit,consolidateChunk} from './archipelago-art.js';
import {createIsland} from '../ship-preview/island.js';
import {batchStatic} from './optimization.js';
import {createCameraOcclusion} from './camera-occlusion.js';
export function createWorld(scene){
 scene.background=new THREE.Color(0xa8c6cc);scene.fog=new THREE.Fog(0xa8c6cc,62,155);
 scene.add(new THREE.HemisphereLight(0xe0fff2,0x8c7259,1.35));
 const sun=new THREE.DirectionalLight(0xffe7bf,3.1);sun.position.set(-18,60,22);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-50,right:50,top:50,bottom:-50,near:1,far:150});sun.shadow.normalBias=.09;scene.add(sun,sun.target);
 const occlusion=createCameraOcclusion();
 const far=new THREE.Group();far.name='Permanent low-detail archipelago';scene.add(far);
 for(const r of REGIONS){
  const group=new THREE.Group();
  for(const t of TERRAIN.filter(t=>t.region===r.id)){
   const terrain=createTerrainBase(t);occlusion.register(terrain);group.add(terrain);
  }
  if(r.id==='reef')group.add(createReefClusterBeds());
  consolidateChunk(group);far.add(group);
 }
 const coralhaven=createIsland();coralhaven.island.name='Coralhaven · original handmade island';
 coralhaven.island.position.set(CORALHAVEN.x,0,CORALHAVEN.z);coralhaven.island.rotation.y=.65;coralhaven.island.scale.setScalar(1.25);
 // Canonicalize repeated opaque colours before batching the original high-detail meshes.
 const materialKit=new Map();coralhaven.island.traverse(o=>{if(!o.isMesh||o.material.map||o.material.transparent)return;const m=o.material,k=[m.color.getHex(),m.roughness,m.metalness,m.side,m.flatShading,m.vertexColors].join('/');if(materialKit.has(k))o.material=materialKit.get(k);else materialKit.set(k,m);});
 batchStatic(coralhaven.island);far.add(coralhaven.island);
 const chunks=REGIONS.map(r=>{const village=createVillageBase(r);far.add(village);return {region:r,village,detail:null,generator:null,ready:false,lastNear:0};});
 const arches=new THREE.Group();createArches(arches);for(const arch of arches.children)occlusion.register(arch);far.add(arches);const ocean=createSea();scene.add(ocean.seabed,ocean.mesh);const whirlUpdate=createWhirlpoolVisuals(scene);
 let clock=0,overview=false,totalBuilt=0,totalReleased=0;const batching={before:0,after:0};far.traverse(o=>{if(o.isMesh){batching.before+=o.isInstancedMesh?o.count:1;batching.after++;}});
 occlusion.attach(far);
 const world={obstacles:OBSTACLES,outposts:[],sun,ocean,batching,far,occlusion,
  setOverview(value){overview=value;ocean.setOverview(value);scene.fog=value?null:new THREE.Fog(0xa8c6cc,62,155);},
  stats:()=>({loaded:chunks.filter(c=>c.ready).length,building:chunks.filter(c=>c.generator).length,built:totalBuilt,released:totalReleased}),
  update(time,dt,player){
   clock+=dt;ocean.update(time);whirlUpdate(time);coralhaven.update(time);
   if(scene.fog){const mist=REGIONS[4],d=Math.hypot(player.x-mist.dock.x,player.z-mist.dock.z),blend=1-THREE.MathUtils.smoothstep(d,15,65);scene.fog.near=THREE.MathUtils.damp(scene.fog.near,62-blend*22,1.5,dt);scene.fog.far=THREE.MathUtils.damp(scene.fog.far,155-blend*45,1.5,dt);}
   sun.position.set(player.x-18,65,player.z+22);sun.target.position.set(player.x,0,player.z);sun.target.updateMatrixWorld();
   const predicted={x:player.x+(player.vx||0)*3,z:player.z+(player.vz||0)*3};
   const sorted=chunks.map(c=>({c,d:Math.min(Math.hypot(player.x-c.region.x,player.z-c.region.z),Math.hypot(predicted.x-c.region.x,predicted.z-c.region.z))})).sort((a,b)=>a.d-b.d);
   for(const {c,d} of sorted){
    if(d<115||overview){c.lastNear=clock;if(!c.detail){c.detail=new THREE.Group();c.detail.name=c.region.village+' streamed details';c.detail.visible=false;scene.add(c.detail);c.generator=detailsForRegion(c.region);}}
    if(d>156&&!overview&&clock-c.lastNear>8&&c.detail){releaseChunk(c.detail);c.detail=null;c.generator=null;c.ready=false;c.village.userData.homes.visible=true;totalReleased++;}
   }
   // One bounded region job per frame. Yield between each building/tree cluster.
   const task=sorted.find(({c})=>c.generator)?.c;
   if(task){const deadline=performance.now()+2;let count=0;do{const result=task.generator.next();if(result.done){consolidateChunk(task.detail);occlusion.attach(task.detail);task.generator=null;task.ready=true;task.detail.visible=true;task.village.userData.homes.visible=false;totalBuilt++;break;}task.detail.add(result.value);count++;}while(count<3&&performance.now()<deadline);}
   for(const c of chunks)if(c.detail&&c.ready)c.detail.visible=overview||Math.hypot(player.x-c.region.x,player.z-c.region.z)<140;
  },regionAt};
 return world;
}
