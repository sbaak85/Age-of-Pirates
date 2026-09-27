import fs from 'node:fs/promises';
import * as THREE from 'three';
import {createCentralJungle} from '../game/central-jungle-model.js';
import {CENTRAL_JUNGLE_SCALE,CENTRAL_JUNGLE_HEIGHT} from '../game/central-jungle-placement.js';
globalThis.fetch=async url=>new Response(await fs.readFile(url));
const jungle=await createCentralJungle();jungle.root.scale.set(CENTRAL_JUNGLE_SCALE,CENTRAL_JUNGLE_HEIGHT,CENTRAL_JUNGLE_SCALE);jungle.root.updateMatrixWorld(true);
const layers=[];
for(const root of [jungle.terrain,jungle.skull.fossil,jungle.lagoonBones])root.traverseVisible(mesh=>{
 if(!mesh.isMesh)return;const g=mesh.geometry,p=g.attributes.position,indices=g.index.array;
 for(const height of [.3,1.5,3,5.4]){
  const segments=[];
  for(let i=0;i<indices.length;i+=3){const v=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,indices[i+k]).applyMatrix4(mesh.matrixWorld)),cross=[];
   for(let k=0;k<3;k++){const a=v[k],b=v[(k+1)%3];if((a.y<=height&&b.y>height)||(b.y<=height&&a.y>height)){const t=(height-a.y)/(b.y-a.y);cross.push([a.x+t*(b.x-a.x),a.z+t*(b.z-a.z)]);}}
   if(cross.length===2)segments.push(cross);
  }
  layers.push(segments);
 }
});
const min=-96,step=.6,size=320,rows=[];
for(let row=0;row<size;row++){
 const z=min+(row+.5)*step,occupied=new Uint8Array(size);
 for(const segments of layers){const xs=[];for(const [a,b] of segments)if((a[1]<=z&&b[1]>z)||(b[1]<=z&&a[1]>z))xs.push(a[0]+(z-a[1])/(b[1]-a[1])*(b[0]-a[0]));xs.sort((a,b)=>a-b);
  for(let i=0;i+1<xs.length;i+=2)for(let x=Math.max(0,Math.floor((xs[i]-min)/step));x<Math.min(size,Math.ceil((xs[i+1]-min)/step));x++)occupied[x]=1;
 }
 const runs=[];for(let x=0;x<size;){if(!occupied[x]){x++;continue;}const a=x;while(x<size&&occupied[x])x++;runs.push(a,x);}rows.push(runs);
}
await fs.writeFile(new URL('../game/central-navigation-data.js',import.meta.url),`// Generated from the placed rock, fossil and lagoon-bone meshes.\nexport const CENTRAL_GRID=${JSON.stringify({min,step,size})};\nexport const CENTRAL_ROWS=${JSON.stringify(rows)};\n`);
console.log('Generated central navigation:',rows.reduce((n,r)=>n+r.length/2,0),'row spans');
