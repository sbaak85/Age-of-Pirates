import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPoseidon6K} from '../game/poseidon-form-6k.js';
import {createPoseidon3K} from '../game/poseidon-form-3k.js';
import {createPoseidonForm,formStats} from '../game/poseidon-form-study.js';
const root=createPoseidon6K(),stats=formStats(root);assert.ok(stats.triangles>=5800&&stats.triangles<=6100);
root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(const v of p.array)assert.ok(Number.isFinite(v));for(const v of o.geometry.attributes.normal.array)assert.ok(Number.isFinite(v));for(const i of o.geometry.index.array)assert.ok(i>=0&&i<p.count);});
// The two shoulder holes are filled using shared indices, with consistent face orientation.
const joined=root.getObjectByName('胸背肩肘共頂點連續曲面'),idx=joined.geometry.index.array,edges=new Map();
for(let i=0;i<idx.length;i+=3)for(let j=0;j<3;j++){const a=idx[i+j],b=idx[i+(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');const e=edges.get(key)||[];e.push([a,b]);edges.set(key,e);}
let boundary=0;for(const e of edges.values()){assert.ok(e.length<=2);if(e.length===1)boundary++;else assert.notEqual(e[0][0],e[1][0],'Adjacent triangle winding');}
assert.equal(boundary,40,'Only the original waist and neck rings remain open; no open shoulder seams');
assert.equal(formStats(createPoseidon3K()).triangles,3062);assert.equal(formStats(createPoseidonForm()).triangles,500);
const json=root.toJSON();assert.equal(formStats(new T.ObjectLoader().parse(json)).triangles,stats.triangles);
await fs.mkdir('game/assets/poseidon-form-6k',{recursive:true});await fs.writeFile('game/assets/poseidon-form-6k/scene.json',JSON.stringify(json));await fs.writeFile('game/assets/poseidon-form-6k/triangle-budget.json',JSON.stringify(stats,null,2));
console.log(JSON.stringify({triangles:stats.triangles,shoulderSeams:'shared vertices, consistent winding, no open seam',preservedVersions:[3062,500],roundTrip:'passed'}));
