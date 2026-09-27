import * as THREE from 'three';
import {applyBeastSkullWeathering} from './beast-skull-materials.js';

/** Approved 4,929-triangle fossil. No dependency on the archived high-detail model. */
export async function createBeastSkull(){
 const base=new URL('./assets/beast-skull-final/',import.meta.url);
 const response=await fetch(new URL('scene.json',base));
 if(!response.ok)throw new Error('Missing final beast skull scene');
 const json=await response.json(),spec=json.beastSkull;
 if(spec?.status!=='approved'||spec.fossilTriangles!==4929)throw new Error('Unexpected beast skull asset');
 const types={Float32Array,Uint32Array,Uint16Array,Uint8Array};
 async function read(binary,type){
  if(!spec.files[binary]||!types[type])throw new Error('Unknown final skull buffer');
  const result=await fetch(new URL(binary,base));if(!result.ok)throw new Error(`Missing final skull buffer: ${binary}`);
  const data=await result.arrayBuffer();if(data.byteLength!==spec.files[binary].bytes)throw new Error(`Incomplete skull buffer: ${binary}`);
  return new types[type](data);
 }
 await Promise.all(json.geometries.flatMap(g=>[
  ...Object.values(g.data.attributes).map(async a=>{a.array=await read(a.binary,a.type);}),
  (async()=>{const a=g.data.index;a.array=await read(a.binary,a.type);})()
 ]));
 await Promise.all((json.images??[]).map(async image=>{const data=image.url;data.data=await read(data.binary,data.type);}));
 const root=new THREE.ObjectLoader().parse(json),model={root,mossUniform:{value:1},metadata:spec};
 for(const [key,uuid] of Object.entries(spec.objects))model[key]=root.getObjectByProperty('uuid',uuid);
 const materials=new Map();root.traverse(mesh=>{if(mesh.isMesh)materials.set(mesh.material.uuid,mesh.material);});
 for(const [key,uuid] of Object.entries(spec.materials))model[key]=materials.get(uuid);
 applyBeastSkullWeathering(model.bone,model.plainBone,model.mossUniform);
 const triangles=model.fossil.children.reduce((n,m)=>n+m.geometry.index.count/3,0);
 if(triangles!==spec.fossilTriangles)throw new Error('Final skull triangle count mismatch');
 return model;
}
