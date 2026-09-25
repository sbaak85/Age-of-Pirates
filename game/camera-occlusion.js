import * as THREE from 'three';

const LIMIT=8;
export function createCameraOcclusion(){
 const regions=[],materials=new Map(),patched=new WeakSet();
 const uniforms={fadeMin:{value:Array.from({length:LIMIT},()=>new THREE.Vector3())},fadeMax:{value:Array.from({length:LIMIT},()=>new THREE.Vector3())},fadeAmount:{value:Array(LIMIT).fill(0)}};
 const ray=new THREE.Ray(),point=new THREE.Vector3(),direction=new THREE.Vector3(),hit=new THREE.Vector3();
 let strength=0;
 function register(root){root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root);if(box.max.y>8)regions.push({box,amount:0,hold:0});}
 function attach(root){root.traverse(o=>{if(!o.isMesh)return;const patch=source=>{
  if(!source.isMeshStandardMaterial||patched.has(source))return source;
  if(materials.has(source))return materials.get(source);
  const m=source.clone(),previous=source.onBeforeCompile,key=source.customProgramCacheKey();
  m.onBeforeCompile=(shader,renderer)=>{previous.call(m,shader,renderer);Object.assign(shader.uniforms,uniforms);
   shader.vertexShader='varying vec3 fadeWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
    vec4 fadeVertex=vec4(transformed,1.0);
    #ifdef USE_INSTANCING
    fadeVertex=instanceMatrix*fadeVertex;
    #endif
    fadeWorld=(modelMatrix*fadeVertex).xyz;`);
   shader.fragmentShader='varying vec3 fadeWorld; uniform vec3 fadeMin[8],fadeMax[8]; uniform float fadeAmount[8];\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
    float coverage=0.0;
    for(int i=0;i<8;i++){
     if(fadeAmount[i]>0.001 && all(greaterThanEqual(fadeWorld,fadeMin[i])) && all(lessThanEqual(fadeWorld,fadeMax[i]))) coverage=max(coverage,fadeAmount[i]*smoothstep(3.0,8.0,fadeWorld.y));
    }
    float noise=fract(52.9829189*fract(dot(floor(gl_FragCoord.xy),vec2(0.06711056,0.00583715))));
    if(coverage>noise)discard;
   `);
  };m.customProgramCacheKey=()=>key+'|upper-cliff-fade-v2';materials.set(source,m);patched.add(m);return m;
 };o.material=Array.isArray(o.material)?o.material.map(patch):patch(o.material);});}
 function update(camera,renderer,position,dt,enabled=true){
  dt=Math.max(0,Math.min(dt,.1));
  // Probe the configured, unboosted camera so lifting cannot cause feedback flicker.
  const forward=new THREE.Vector3(position.x-camera.position.x,0,position.z-camera.position.z).normalize();
  const right=new THREE.Vector3(-forward.z,0,forward.x);
  for(const r of regions){
   let blocked=enabled&&r.box.containsPoint(camera.position);
   if(enabled&&!blocked)for(const [ahead,side] of [[0,0],[18,0],[0,-12],[0,12]]){
    point.copy(position).addScaledVector(forward,ahead).addScaledVector(right,side);point.y=2;
    direction.copy(point).sub(camera.position);const distance=direction.length();ray.set(camera.position,direction.normalize());
    if(ray.intersectBox(r.box,hit)&&hit.distanceTo(camera.position)<distance-1){blocked=true;break;}
   }
   r.hold=blocked?.5:Math.max(0,r.hold-dt);
   r.amount=THREE.MathUtils.damp(r.amount,enabled&&r.hold>0?1:0,6,dt);
   if(r.amount<.001)r.amount=0;
  }
  const active=regions.filter(r=>r.amount>0).sort((a,b)=>b.amount-a.amount).slice(0,LIMIT);
  strength=0;
  for(let i=0;i<LIMIT;i++){const r=active[i];uniforms.fadeAmount.value[i]=r?.amount??0;if(r){uniforms.fadeMin.value[i].copy(r.box.min).addScalar(-.1);uniforms.fadeMax.value[i].copy(r.box.max).addScalar(.1);strength=Math.max(strength,r.amount);}}
 }
 return {attach,register,update,uniforms,get heightMultiplier(){return 1+.15*strength;},dispose(){for(const m of materials.values())m.dispose();materials.clear();}};
}
