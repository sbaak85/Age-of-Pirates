import * as THREE from 'three';

export function fossilPartKey(mesh,model){
 return mesh===model.cranium?'cranium':mesh===model.mandible?'mandible':mesh.material===model.toothMaterial?'teeth':mesh.material===model.plainBone?'axial-bones':'sutures';
}

/** Clone the baseline: shared materials/environment, independent compact fossil geometry. */
export function createBeastSkullLod50(original){return createBeastSkullLod(original,'lod50');}

export async function createBeastSkullLod(original,level='lod50'){
 if(!['lod50','lod10k','lod5k'].includes(level))throw new Error(`Unknown skull detail level: ${level}`);
 const base=`./assets/beast-skull/${level}/`;
 const response=await fetch(base+'manifest.json');
 if(!response.ok)throw new Error('Missing skull LOD manifest');
 const manifest=await response.json(),root=original.root.clone(true);
 const child=group=>root.children[original.root.children.indexOf(group)];
 const model={...original,root,fossil:child(original.fossil),habitat:child(original.habitat),foliage:child(original.foliage)};
 const meshes=new Map(original.fossil.children.map((mesh,index)=>[fossilPartKey(mesh,original),{source:mesh,target:model.fossil.children[index]}]));
 if(meshes.size!==manifest.parts.length)throw new Error('Skull source changed; rebuild LOD assets');
 await Promise.all(manifest.parts.map(async part=>{
  const entry=meshes.get(part.key);if(!entry)throw new Error(`Unknown fossil part ${part.key}`);
  const {source,target}=entry,position=source.geometry.attributes.position.array,index=new Uint32Array(source.geometry.index.array);
  const sourceData=new Uint8Array(position.byteLength+index.byteLength);
  sourceData.set(new Uint8Array(position.buffer,position.byteOffset,position.byteLength));sourceData.set(new Uint8Array(index.buffer,index.byteOffset,index.byteLength),position.byteLength);
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',sourceData))].map(v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==part.sourceHash)throw new Error(`Skull ${part.key} changed; rebuild LOD assets`);
  const read=async file=>{const result=await fetch(base+file);if(!result.ok)throw new Error(`Missing LOD asset: ${file}`);return result.arrayBuffer();};
  const geometry=new THREE.BufferGeometry();
  await Promise.all(Object.entries(part.attributes).map(async([name,{file,itemSize}])=>geometry.setAttribute(name,new THREE.BufferAttribute(new Float32Array(await read(file)),itemSize))));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(await read(part.index)),1));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  target.geometry=geometry;
  if(part.key==='cranium')model.cranium=target;
  if(part.key==='mandible')model.mandible=target;
 }));
 return {model,manifest};
}
