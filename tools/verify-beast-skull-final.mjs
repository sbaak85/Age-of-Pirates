import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createBeastSkull} from '../game/beast-skull-model.js';
import {createBeastSkull as createSource} from '../archive/beast-skull/2026-09-26/game/beast-skull-model.js';
import {createBeastSkullLod} from '../archive/beast-skull/2026-09-26/game/beast-skull-lod.js';
import {setSkullWideProfile} from '../archive/beast-skull/2026-09-26/game/beast-skull-shape.js';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assetRoot=path.join(project,'game/assets/beast-skull-final');
const archive=path.join(project,'archive/beast-skull/2026-09-26/game');
const previousFetch=globalThis.fetch,requests=[];
const digest=data=>createHash('sha256').update(data).digest('hex');
const bytes=a=>new Uint8Array(a.buffer,a.byteOffset,a.byteLength);
const geometryHash=g=>{const hash=createHash('sha256');for(const name of Object.keys(g.attributes).sort())hash.update(bytes(g.attributes[name].array));hash.update(bytes(g.index.array));return hash.digest('hex');};
const allHashes=model=>{const hashes=[];model.root.traverse(m=>{if(m.isMesh)hashes.push(geometryHash(m.geometry));});return hashes.sort();};
try{
 // Production load is deliberately restricted: any source/archive request fails.
 globalThis.fetch=async url=>{const file=fileURLToPath(url);assert(file.startsWith(assetRoot+path.sep),`Non-production dependency: ${file}`);requests.push(file);return new Response(await fs.readFile(file));};
 const model=await createBeastSkull();
 assert.equal(model.fossil.children.reduce((n,m)=>n+m.geometry.index.count/3,0),4929);
 assert.deepEqual(model.root.scale.toArray(),[.6,.6,.6]);
 assert.equal(model.metadata.scale,.6);
 for(const [file,info] of Object.entries(model.metadata.files)){
  const data=await fs.readFile(path.join(assetRoot,file));assert.equal(data.length,info.bytes);assert.equal(digest(data),info.sha256);
 }
 model.root.traverse(m=>{if(!m.isMesh)return;const g=m.geometry;for(const a of Object.values(g.attributes))assert(a.array.every(Number.isFinite));assert(g.index.array.every(i=>i<g.attributes.position.count));});
 // Compare with the exact approved, trimmed 5k candidate after its width sculpt.
 globalThis.fetch=async url=>new Response(await fs.readFile(path.resolve(archive,String(url))));
 const source=await createSource(),{model:expected}=await createBeastSkullLod(source,'lod5k');setSkullWideProfile(expected,true);
 assert.deepEqual(allHashes(model),allHashes(expected),'all approved geometry/attributes retained exactly');
 assert.deepEqual(model.bone.color.toArray(),expected.bone.color.toArray());
 assert.deepEqual(model.bone.bumpMap.image.data,expected.bone.bumpMap.image.data);
 assert.equal(model.bone.customProgramCacheKey(),'weathered-fossil-v2');
 const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <normal_fragment_maps>'};
 model.bone.onBeforeCompile(shader);assert.equal(shader.uniforms.boneMoss,model.mossUniform);assert(shader.fragmentShader.includes('float mineral='));
 console.log(`PASS: exact approved 4929-triangle geometry and materials; 60% scale; ${requests.length} loads entirely within final assets; zero runtime archive/high-poly dependencies.`);
}finally{globalThis.fetch=previousFetch;}
