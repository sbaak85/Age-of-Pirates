import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createGrandGate} from '../game/fjord-grand-gate.js';
import {createGate,triangleCount} from '../game/fjord-models.js';
const model=createGrandGate(),old=createGate();model.updateMatrixWorld(true);
assert.ok(triangleCount(model)<=5000);assert.equal(triangleCount(old),1564);
model.traverse(o=>{if(!o.isMesh)return;for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));});
const ray=new T.Raycaster();let samples=0;for(const x of[-11.8,-10,-8,-4,0,4,8,10,11.8]){const roof=4+Math.sqrt(144-x*x);for(const y of[.25,2,roof-.18])for(const side of[-1,1]){ray.set(new T.Vector3(x,y,side*30),new T.Vector3(0,0,-side));assert.equal(ray.intersectObject(model,true).length,0,`Passage blocked at ${x},${y},${side}`);samples++;}}
const dimensions=new T.Box3().setFromObject(model,true).getSize(new T.Vector3()).toArray(),previous=new T.Box3().setFromObject(old,true).getSize(new T.Vector3()).toArray();
const json=model.toJSON();assert.equal(triangleCount(new T.ObjectLoader().parse(json)),triangleCount(model));
await fs.mkdir('game/assets/fjord-grand-gate',{recursive:true});await fs.writeFile('game/assets/fjord-grand-gate/scene.json',JSON.stringify(json));await fs.writeFile('game/assets/fjord-grand-gate/spec.json',JSON.stringify({triangles:triangleCount(model),dimensions,previousDimensions:previous,opening:{width:24,crownHeight:16,springHeight:4},passageSamples:samples,status:'preview-only'},null,2));console.log(JSON.stringify({triangles:triangleCount(model),dimensions,previousDimensions:previous,passageSamples:samples}));
