import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Bake only static meshes; animated and destructible subtrees keep their identity.
export function batchStatic(root){
  root.updateMatrixWorld(true);
  const inverse=root.matrixWorld.clone().invert(),buckets=new Map();
  let before=0,after=0;
  root.traverse(mesh=>{
    if(!mesh.isMesh||Array.isArray(mesh.material)||mesh.material.transparent)return;
    for(let p=mesh;p&&p!==root;p=p.parent)if(p.userData.dynamic)return;
    const attrs=Object.keys(mesh.geometry.attributes).sort().join(',');
    const key=`${mesh.material.uuid}:${mesh.castShadow}:${mesh.receiveShadow}:${attrs}`;
    if(!buckets.has(key))buckets.set(key,[]);
    buckets.get(key).push(mesh);before++;
  });
  for(const meshes of buckets.values()){
    if(meshes.length<2){after+=meshes.length;continue;}
    const copies=meshes.map(mesh=>{
      const copy=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
      copy.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));return copy;
    });
    const merged=mergeGeometries(copies,false);copies.forEach(g=>g.dispose());
    if(!merged){after+=meshes.length;continue;}
    merged.computeBoundingSphere();
    const batch=new THREE.Mesh(merged,meshes[0].material);
    batch.castShadow=meshes[0].castShadow;batch.receiveShadow=meshes[0].receiveShadow;
    batch.name='Static scenery batch';root.add(batch);
    for(const mesh of meshes)mesh.removeFromParent();
    after++;
  }
  return {before,after};
}

export function applyEdgeFog(scene){
  const materials=new Set();
  scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.isMeshStandardMaterial)materials.add(m);});
  for(const material of materials){
    const previous=material.onBeforeCompile;
    material.onBeforeCompile=shader=>{
      previous.call(material,shader);
      shader.uniforms.edgeFogColor={value:new THREE.Vector3(111/255,169/255,174/255)};
      shader.vertexShader='varying vec3 edgeWorld;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nedgeWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
      shader.fragmentShader='uniform vec3 edgeFogColor; varying vec3 edgeWorld;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>','#include <fog_fragment>\ngl_FragColor.rgb=mix(gl_FragColor.rgb,edgeFogColor,smoothstep(70.0,96.0,length(edgeWorld.xz)));');
    };
    material.customProgramCacheKey=()=> 'sea-edge-fog-v1';material.needsUpdate=true;
  }
}
