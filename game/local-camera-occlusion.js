import * as THREE from 'three';

/** A bounded sight corridor, independent of the topology of the cliff mesh. */
export function createLocalCameraOcclusion({surfaces,targets,hullLength,diameterShips=10}){
 if(!(hullLength>0))throw new Error('A positive world-space hull length is required');
 const uniforms={localEye:{value:new THREE.Vector3()},localAxis:{value:new THREE.Vector3(0,0,-1)},localReach:{value:0},localRadius:{value:1},localAmount:{value:0}};
 const ray=new THREE.Raycaster(),point=new THREE.Vector3(),direction=new THREE.Vector3(),center=new THREE.Vector3();
 const originals=[],patched=new Map(),depths=new Map();let held=0,blockedFor=0,blocked=false,count=0;
 const declarations='varying vec3 localWorld; uniform vec3 localEye,localAxis; uniform float localReach,localRadius,localAmount;';
 const fragment=`
 vec3 localDelta=localWorld-localEye;
 float alongSight=dot(localDelta,localAxis);
 float sightDistance=length(localDelta-localAxis*alongSight);
 float coverage=localAmount*(1.-smoothstep(localRadius*.72,localRadius,sightDistance));
 coverage*=smoothstep(3.,8.,localWorld.y);
 coverage*=step(0.,alongSight)*(1.-smoothstep(localReach,localReach+${(hullLength*.6).toFixed(6)},alongSight));
 float localNoise=fract(52.9829189*fract(dot(floor(gl_FragCoord.xy),vec2(.06711056,.00583715))));
 if(coverage>localNoise)discard;
 `;
 function inject(shader){
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 localWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   vec4 localVertex=vec4(transformed,1.);
   #ifdef USE_INSTANCING
    localVertex=instanceMatrix*localVertex;
   #endif
   localWorld=(modelMatrix*localVertex).xyz;`);
  shader.fragmentShader=declarations+'\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n'+fragment);
 }
 function patch(source){
  if(!source.isMeshStandardMaterial)return source;
  if(patched.has(source))return patched.get(source);
  const m=source.clone(),previous=source.onBeforeCompile,key=source.customProgramCacheKey();
  m.onBeforeCompile=(shader,renderer)=>{previous.call(m,shader,renderer);inject(shader);};m.customProgramCacheKey=()=>key+'|local-sight-fade-v1';patched.set(source,m);return m;
 }
 for(const root of targets)root.traverse(o=>{
  if(!o.isMesh)return;
  originals.push([o,o.material,o.customDepthMaterial]);const source=o.material;
  o.material=Array.isArray(source)?source.map(patch):patch(source);
  if(!depths.has(source)){const d=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});d.onBeforeCompile=inject;d.customProgramCacheKey=()=> 'local-sight-shadow-v1';depths.set(source,d);}
  o.customDepthMaterial=depths.get(source);
 });
 function update(probe,position,yaw,dt,enabled=true){
  dt=THREE.MathUtils.clamp(dt,0,.1);count=0;let centerBlocked=false;
  const c=Math.cos(yaw),s=Math.sin(yaw);
  // Only actual hull/deck sample intersections trigger fading, never the wide reveal area.
  const samples=[[0,0,1.4],[.4,0,1.3],[-.4,0,1.3],[0,.16,1.9],[0,-.16,1.9]];
  if(enabled)for(let i=0;i<samples.length;i++){
   const [along,side,y]=samples[i];point.set(position.x+hullLength*(along*c+side*s),position.y+y,position.z+hullLength*(-along*s+side*c));
   direction.copy(point).sub(probe.position);const distance=direction.length();ray.set(probe.position,direction.normalize());ray.near=.05;ray.far=Math.max(.05,distance-.15);
   if(ray.intersectObjects(surfaces,true).some(h=>h.object.visible&&h.point.y>3.1)){count++;if(i===0)centerBlocked=true;}
  }
  blocked=enabled&&(centerBlocked||count>=2);blockedFor=blocked?blockedFor+dt:0;held=blockedFor>=.08?.2:Math.max(0,held-dt);
  const amount=THREE.MathUtils.damp(uniforms.localAmount.value,enabled&&held>0?1:0,7,dt);uniforms.localAmount.value=amount<.001?0:amount;
 }
 function setView(camera,position,{diameter=diameterShips,adaptive=true}={}){
  center.copy(position);center.y+=1.4;uniforms.localEye.value.copy(camera.position);direction.copy(center).sub(camera.position);
  const distance=direction.length();uniforms.localAxis.value.copy(direction.normalize());uniforms.localReach.value=distance;
  // Ten hull lengths is an upper bound; close cameras should not erase a whole screen.
  const viewportHeight=2*distance*Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV())/2);
  const requested=THREE.MathUtils.clamp(diameter,4,14)*hullLength;
  const effective=adaptive?Math.min(requested,Math.max(hullLength*3,viewportHeight*Math.min(1,camera.aspect)*.85)):requested;
  uniforms.localRadius.value=effective/2;
 }
 // CPU equivalent for geometry regression checks (height, radius, front/behind limits).
 function coverageAt(p){
  const d=direction.copy(p).sub(uniforms.localEye.value),along=d.dot(uniforms.localAxis.value),radial=d.addScaledVector(uniforms.localAxis.value,-along).length(),r=uniforms.localRadius.value;
  return uniforms.localAmount.value*(1-THREE.MathUtils.smoothstep(radial,r*.72,r))*THREE.MathUtils.smoothstep(p.y,3,8)*(along>=0?1:0)*(1-THREE.MathUtils.smoothstep(along,uniforms.localReach.value,uniforms.localReach.value+hullLength*.6));
 }
 return {uniforms,update,setView,coverageAt,get amount(){return uniforms.localAmount.value;},get blocked(){return blocked;},get hitCount(){return count;},get heightMultiplier(){return 1+.15*uniforms.localAmount.value;},get diameter(){return uniforms.localRadius.value*2;},dispose(){for(const [o,m,d] of originals){o.material=m;o.customDepthMaterial=d;}for(const m of patched.values())m.dispose();for(const m of depths.values())m.dispose();}};
}
