import * as THREE from 'three';
import {WAVES,WAVE_GLSL} from '../ship-preview/waves.js';
import {TERRAIN,REGIONS,OBSTACLES,CORALHAVEN,regionAt} from './archipelago-data.js';
import {createTerrainBase,createVillageBase,detailsForRegion,createArches,createWhirlpoolVisuals,releaseChunk,instanceKit,consolidateChunk} from './archipelago-art.js';
import {createIsland} from '../ship-preview/island.js';
import {batchStatic} from './optimization.js';
function createSea(){
 const size=256,data=new Uint8Array(size*size*4);
 for(let z=0;z<size;z++)for(let x=0;x<size;x++){
  const wx=(x/(size-1)-.5)*512,wz=(z/(size-1)-.5)*512;
  let d=999;for(const t of TERRAIN)d=Math.min(d,(Math.hypot((wx-t.x)/t.rx,(wz-t.z)/t.rz)-1)*Math.min(t.rx,t.rz));
  d=Math.min(d,(Math.hypot((wx-CORALHAVEN.x)/15,(wz-CORALHAVEN.z)/12)-1)*12);
  const v=Math.round(255*THREE.MathUtils.clamp(d/18,0,1)),i=(z*size+x)*4;data[i]=v;data[i+1]=v;data[i+2]=v;data[i+3]=255;
 }
 const shore=new THREE.DataTexture(data,size,size);shore.minFilter=shore.magFilter=THREE.LinearFilter;shore.needsUpdate=true;
 const uniforms={overview:{value:0},time:{value:0},strength:{value:1},openSea:{value:1},shore:{value:shore},waves:{value:WAVES.map(w=>new THREE.Vector4(...w.direction,w.k,w.amplitude))},speeds:{value:WAVES.map(w=>w.speed)},fogColor:{value:new THREE.Color(0xa8c6cc)}};
 const geo=new THREE.PlaneGeometry(512,512,160,160);geo.rotateX(-Math.PI/2);
 const mat=new THREE.ShaderMaterial({uniforms,vertexShader:`${WAVE_GLSL} varying vec3 wp;varying vec3 norm;void main(){vec3 f=waveField(position.xz);wp=vec3(position.x,f.x,position.z);norm=normalize(vec3(-f.y,1.,-f.z));gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}`,fragmentShader:`uniform float time;uniform float overview;uniform sampler2D shore;uniform vec3 fogColor;varying vec3 wp;varying vec3 norm;void main(){float d=texture2D(shore,wp.xz/512.+.5).r;vec3 c=mix(vec3(.15,.77,.68),vec3(.018,.30,.41),smoothstep(.02,1.,d));float rip=sin(wp.x*.7+wp.z*1.2+sin(wp.z*.63+wp.x*.35)*2.-time*.8);c+=vec3(.012,.023,.018)*rip*(1.-d);vec3 light=normalize(vec3(-.5,1.,.3));float spec=pow(max(0.,dot(norm,normalize(light+normalize(cameraPosition-wp)))),70.);c+=vec3(.65,.86,.8)*spec*.36;float foam=(1.-smoothstep(.025,.11,d))*smoothstep(.005,.018,d)*(.65+.35*sin(time*2.-d*120.));c=mix(c,vec3(.81,.95,.87),foam);float fog=max(smoothstep(178.,212.,length(wp.xz)),smoothstep(65.,165.,length(cameraPosition-wp))*.7*(1.-overview));gl_FragColor=vec4(c,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>\ngl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.6588,.7765,.8),fog);}`.replace(';#include',';\n#include')});
 const mesh=new THREE.Mesh(geo,mat);mesh.frustumCulled=false;mesh.name='A2 seamless shallow-water ocean';return {mesh,setOverview:v=>uniforms.overview.value=v?1:0,update:t=>uniforms.time.value=t,setEnabled:v=>uniforms.strength.value=v?1:0};
}
export function createWorld(scene){
 scene.background=new THREE.Color(0xa8c6cc);scene.fog=new THREE.Fog(0xa8c6cc,62,155);
 scene.add(new THREE.HemisphereLight(0xe0fff2,0x8c7259,1.35));
 const sun=new THREE.DirectionalLight(0xffe7bf,3.1);sun.position.set(-18,60,22);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-50,right:50,top:50,bottom:-50,near:1,far:150});sun.shadow.normalBias=.09;scene.add(sun,sun.target);
 const far=new THREE.Group();far.name='Permanent low-detail archipelago';scene.add(far);
 for(const r of REGIONS){const group=new THREE.Group();for(const t of TERRAIN.filter(t=>t.region===r.id))group.add(createTerrainBase(t));consolidateChunk(group);far.add(group);}
 const coralhaven=createIsland();coralhaven.island.name='Coralhaven · original handmade island';
 coralhaven.island.position.set(CORALHAVEN.x,0,CORALHAVEN.z);coralhaven.island.rotation.y=.65;coralhaven.island.scale.setScalar(1.25);
 // Canonicalize repeated opaque colours before batching the original high-detail meshes.
 const materialKit=new Map();coralhaven.island.traverse(o=>{if(!o.isMesh||o.material.map||o.material.transparent)return;const m=o.material,k=[m.color.getHex(),m.roughness,m.metalness,m.side,m.flatShading,m.vertexColors].join('/');if(materialKit.has(k))o.material=materialKit.get(k);else materialKit.set(k,m);});
 batchStatic(coralhaven.island);far.add(coralhaven.island);
 const chunks=REGIONS.map(r=>{const village=createVillageBase(r);far.add(village);return {region:r,village,detail:null,generator:null,ready:false,lastNear:0};});
 createArches(far);const ocean=createSea();scene.add(ocean.mesh);const whirlUpdate=createWhirlpoolVisuals(scene);
 let clock=0,overview=false,totalBuilt=0,totalReleased=0;const batching={before:0,after:0};far.traverse(o=>{if(o.isMesh){batching.before+=o.isInstancedMesh?o.count:1;batching.after++;}});
 const world={obstacles:OBSTACLES,outposts:[],sun,ocean,batching,far,
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
   if(task){const deadline=performance.now()+2;let count=0;do{const result=task.generator.next();if(result.done){consolidateChunk(task.detail);task.generator=null;task.ready=true;task.detail.visible=true;task.village.userData.homes.visible=false;totalBuilt++;break;}task.detail.add(result.value);count++;}while(count<3&&performance.now()<deadline);}
   for(const c of chunks)if(c.detail&&c.ready)c.detail.visible=overview||Math.hypot(player.x-c.region.x,player.z-c.region.z)<140;
  },regionAt};
 return world;
}
