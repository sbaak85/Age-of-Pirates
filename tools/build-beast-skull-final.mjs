// Authoring-only export. The production loader never imports the archived sculpt.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createBeastSkull} from '../archive/beast-skull/2026-09-26/game/beast-skull-model.js';
import {createBeastSkullLod} from '../archive/beast-skull/2026-09-26/game/beast-skull-lod.js';
import {setSkullWideProfile} from '../archive/beast-skull/2026-09-26/game/beast-skull-shape.js';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const archive=path.join(project,'archive/beast-skull/2026-09-26/game');
const output=path.join(project,'game/assets/beast-skull-final');
const previousFetch=globalThis.fetch;
globalThis.fetch=async url=>{
 const file=path.resolve(archive,String(url));
 if(!file.startsWith(path.join(archive,'assets/beast-skull')+path.sep))throw new Error('Unexpected authoring asset');
 return new Response(await fs.readFile(file));
};
let model;
try{const source=await createBeastSkull();({model}=await createBeastSkullLod(source,'lod5k'));}finally{globalThis.fetch=previousFetch;}
setSkullWideProfile(model,true);model.root.scale.setScalar(.6);model.root.updateMatrixWorld(true);
const triangles=model.fossil.children.reduce((n,m)=>n+m.geometry.index.count/3,0);
if(triangles!==4929)throw new Error(`Approved fossil must remain 4929 triangles; got ${triangles}`);
await fs.mkdir(output,{recursive:true});
const json=model.root.toJSON(),files={};
const types={Float32Array,Uint32Array,Uint16Array,Uint8Array};
async function binary(array,type,file){
 const buffer=new types[type](array),bytes=Buffer.from(buffer.buffer,buffer.byteOffset,buffer.byteLength);
 await fs.writeFile(path.join(output,file),bytes);
 files[file]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 return file;
}
for(const [i,g] of json.geometries.entries()){
 for(const [name,a] of Object.entries(g.data.attributes)){a.binary=await binary(a.array,a.type,`mesh-${i}-${name}.bin`);delete a.array;}
 const index=g.data.index;index.binary=await binary(index.array,index.type,`mesh-${i}-index.bin`);delete index.array;
}
for(const [i,image] of (json.images??[]).entries()){
 if(!image.url?.data)throw new Error('Final asset must contain local data textures only');
 image.url.binary=await binary(image.url.data,image.url.type,`texture-${i}.bin`);delete image.url.data;
}
const objects=Object.fromEntries(['fossil','habitat','foliage','cranium','mandible'].map(key=>[key,model[key].uuid]));
const materials=Object.fromEntries(['bone','plainBone','toothMaterial'].map(key=>[key,model[key].uuid]));
json.beastSkull={version:1,status:'approved',fossilTriangles:triangles,teeth:68,scale:.6,eyeWidthMultiplier:1.45,objects,materials,files};
await fs.writeFile(path.join(output,'scene.json'),JSON.stringify(json)+'\n');
console.log(`Exported approved fossil: ${triangles} triangles, 68 teeth, widened skull, 60% scale; ${Object.keys(files).length} local binary files, ${Object.values(files).reduce((n,f)=>n+f.bytes,0)} bytes.`);
