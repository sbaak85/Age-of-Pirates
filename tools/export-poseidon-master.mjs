// Freeze all authored surfaces, including procedural drapery and trident, before review.
import * as T from 'three';
import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createPoseidonSculpt,sculptStats} from '../game/poseidon-sculpt.js';
const out=path.resolve('game/assets/poseidon-sculpt/master');await fs.mkdir(out,{recursive:true});const original=globalThis.fetch;
globalThis.fetch=async url=>new Response(await fs.readFile(fileURLToPath(url)));
try{const root=await createPoseidonSculpt();root.traverse(o=>{if(o.isMesh)o.geometry=new T.BufferGeometry().copy(o.geometry);});const json=root.toJSON();const types={Float32Array,Uint32Array,Uint16Array};for(const [i,g] of json.geometries.entries()){for(const [key,a] of Object.entries({...g.data.attributes,index:g.data.index})){const bytes=new types[a.type](a.array);const file=`mesh-${i}-${key}.bin`;await fs.writeFile(path.join(out,file),Buffer.from(bytes.buffer));a.binary=file;delete a.array;}}json.sculpt={...sculptStats(root),status:'awaiting-user-review',simplified:false,source:'tools/build-poseidon-sculpt.py + game/poseidon-sculpt.js',materialNote:'Procedural stone shader is defined in poseidon-sculpt.js; standard material values are also preserved here.'};await fs.writeFile(path.join(out,'scene.json'),JSON.stringify(json));console.log('Frozen high resolution master:',json.sculpt);}finally{globalThis.fetch=original;}

