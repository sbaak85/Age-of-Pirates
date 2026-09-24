import * as THREE from 'three';

// Opaque screen-door cutaway: the clear centre reveals every layer of scenery,
// with a soft coverage gradient at the rim. No transparency sorting or extra pass.
export function createCameraOcclusion(){
 const uniforms={cutCenter:{value:new THREE.Vector2()},cutRadius:{value:new THREE.Vector2(1,1)},cutDepth:{value:0},cutStrength:{value:0}};
 const materials=new Map(),patched=new WeakSet(),size=new THREE.Vector2(),point=new THREE.Vector3(),view=new THREE.Vector3();
 function attach(root){
  root.traverse(o=>{if(!o.isMesh)return;
   const patch=source=>{
    if(!source.isMeshStandardMaterial||patched.has(source))return source;
    if(materials.has(source))return materials.get(source);
    const m=source.clone(),previous=source.onBeforeCompile,cacheKey=source.customProgramCacheKey();
    m.onBeforeCompile=(shader,renderer)=>{
     previous.call(m,shader,renderer);Object.assign(shader.uniforms,uniforms);
     shader.vertexShader='varying float cutViewDepth;\n'+shader.vertexShader;
     shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\ncutViewDepth = -mvPosition.z;');
     shader.fragmentShader='uniform vec2 cutCenter; uniform vec2 cutRadius; uniform float cutDepth; uniform float cutStrength; varying float cutViewDepth;\n'+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      float cutDistance = length((gl_FragCoord.xy-cutCenter)/cutRadius);
      float cutCoverage = (1.0-smoothstep(0.66,1.0,cutDistance)) * (1.0-smoothstep(cutDepth-1.0,cutDepth,cutViewDepth)) * cutStrength;
      float cutNoise = fract(52.9829189 * fract(dot(floor(gl_FragCoord.xy),vec2(0.06711056,0.00583715))));
      if(cutCoverage > cutNoise) discard;
     `);
    };
    m.customProgramCacheKey=()=>cacheKey+'|player-cutaway-v1';
    materials.set(source,m);patched.add(m);return m;
   };
   o.material=Array.isArray(o.material)?o.material.map(patch):patch(o.material);
  });
 }
 function update(camera,renderer,position,dt,enabled=true){
  camera.updateMatrixWorld();renderer.getDrawingBufferSize(size);
  point.set(position.x,position.y+3.5,position.z);view.copy(point).applyMatrix4(camera.matrixWorldInverse);
  const depth=-view.z;point.project(camera);
  const active=enabled&&depth>camera.near&&Math.abs(point.x)<1.3&&Math.abs(point.y)<1.3;
  uniforms.cutStrength.value=THREE.MathUtils.damp(uniforms.cutStrength.value,active?1:0,12,Math.max(0,Math.min(dt,.1)));
  uniforms.cutCenter.value.set((point.x*.5+.5)*size.x,(point.y*.5+.5)*size.y);
  const pixels=size.y*.5*camera.projectionMatrix.elements[5]/Math.max(depth,1);
  uniforms.cutRadius.value.set(Math.max(1,pixels*7),Math.max(1,pixels*9));
  uniforms.cutDepth.value=depth+4;
 }
 return {attach,update,uniforms,dispose(){for(const m of materials.values())m.dispose();materials.clear();}};
}
