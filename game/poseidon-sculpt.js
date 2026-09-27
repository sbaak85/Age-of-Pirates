import * as T from 'three';

// Dense authoring model. Approval is required before any simplification/export to gameplay.
function surface(rows,cols,point){const p=[],idx=[];for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++)p.push(...point(i/cols,j/rows));for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,c=a+cols+1;idx.push(a,c,b,b,c,c+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;}
function add(g,geo,mat,name){const m=new T.Mesh(geo,mat);m.name=name;m.castShadow=m.receiveShadow=true;g.add(m);return m;}
function material(color){const m=new T.MeshStandardMaterial({color,roughness:.78});m.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 sculptP;').replace('#include <begin_vertex>','#include <begin_vertex>\nsculptP=position;');s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 sculptP;
float pn(vec3 p){return sin(p.x*3.4+sin(p.z*2.1))*sin(p.y*2.9+sin(p.x*1.8));}
`).replace('#include <color_fragment>',`#include <color_fragment>
float grain=pn(sculptP*.55)*.025+pn(sculptP*3.1)*.009;
float vein=pow(.5+.5*sin(sculptP.x*2.8+sculptP.y*.9+pn(sculptP*.9)),15.)*.035;
diffuseColor.rgb*=1.+grain-vein;
`).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
float relief=pn(sculptP*18.)*.0009;
normal=normalize(normal + vec3(dFdx(relief),dFdy(relief),0.));
`);};m.customProgramCacheKey=()=> 'poseidon-marble-1';return m;}
// Tapered sculpted locks: lobed elliptical sections along a smooth centerline.
function sweep(points,radii,mat,root,name,{segments=64,sides=16,flat=1,flutes=0}={}){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),frames=curve.computeFrenetFrames(segments,false);const geo=surface(segments,sides,(u,t)=>{const f=t*(radii.length-1),a=Math.min(radii.length-2,Math.floor(f)),r=T.MathUtils.lerp(radii[a],radii[a+1],f-a),k=Math.round(t*segments),angle=u*Math.PI*2;const rr=r*(1+flutes*Math.cos(angle*5+t*7));return curve.getPointAt(t).addScaledVector(frames.normals[k],Math.cos(angle)*rr).addScaledVector(frames.binormals[k],Math.sin(angle)*rr*flat).toArray();});const ix=geo.index.array;for(let i=0;i<ix.length;i+=3){const t=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=t;}geo.computeVertexNormals();return add(root,geo,mat,name);}
export async function createPoseidonSculpt(onProgress=()=>{}){
 const root=new T.Group();root.name='Poseidon high-resolution master';const figure=new T.Group();figure.position.y=2;root.add(figure);
 const marble=material('#c9c7b8'),hair=material('#bcbcaf'),base=material('#9da9a0');
 const url=new URL('./assets/poseidon-sculpt/',import.meta.url);const response=await fetch(new URL('geometry.json',url));if(!response.ok)throw Error('雕像網格尚未生成');const meta=await response.json();
 for(const [name,part] of Object.entries(meta.parts)){onProgress('讀取 '+name);const [v,f]=await Promise.all(['positions','indices'].map(async suffix=>{const r=await fetch(new URL(name+'-'+suffix+'.bin',url));if(!r.ok)throw Error('Missing '+name);return r.arrayBuffer();}));const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(v),3));geo.setIndex(new T.BufferAttribute(new Uint32Array(f),1));geo.computeVertexNormals();add(figure,geo,(name==='hair'||name==='beard')?hair:marble,name);}
 // Thick, asymmetrical wrap, with a raised hem exposing the relaxed left leg.
 const clothMat=marble.clone();clothMat.side=T.DoubleSide;
 const cloth=surface(200,192,(u,t)=>{const a=u*Math.PI*2;const leftFront=Math.exp(-Math.pow(Math.atan2(Math.sin(a+.72),Math.cos(a+.72))/.8,2));const top=6.3+.23*Math.sin(a-.2),bottom=.52+3.25*leftFront;const y=T.MathUtils.lerp(top,bottom,t);const twist=a+.36*Math.sin(t*2.5)+.13*Math.sin(a*2)*(1-t);const fold=(Math.cos(twist*13+.32*Math.sin(a*3))*.08+Math.cos(twist*23-t*2)*.024)*Math.sin(Math.PI*(.13+t*.7));const r=1.02+.27*t+.06*Math.sin(t*5)+fold;return [.06+Math.sin(a)*r,y,Math.cos(a)*r*(.62+.08*t)-.01];});add(figure,cloth,clothMat,'continuous folded hip wrap');
 // Broad diagonal swag over the hip wrap, with hanging nested catenary folds.
 const swag=surface(96,144,(u,v)=>{const x=-1.02+2.03*u;const yy=6.52-.36*u-1.32*Math.sin(u*Math.PI)*v;const zz=.39+.52*Math.sin(u*Math.PI)+.075*Math.sin(v*Math.PI*10+u*2)*Math.sin(u*Math.PI);return [x,yy,zz];});add(figure,swag,clothMat,'diagonal drapery swag');
 // Real fingers already remeshed into body. Three-pronged fork joins its long shaft.
 const metal=material('#8faaa4');metal.metalness=.35;metal.roughness=.57;
 sweep([[-3.38,.02,.62],[-3.38,7,.62],[-3.38,12.5,.62]],[.105,.105,.13],metal,figure,'trident shaft',{segments:100,sides:24});
 for(const s of [-1,1]){sweep([[-3.38,11.8,.62],[-3.38+s*.55,12.08,.62],[-3.38+s*.96,12.52,.62],[-3.38+s*1.01,13.47,.62]],[.14,.18,.15,.075],metal,figure,'fork branch '+s,{segments:70,sides:20});sweep([[-3.38+s*1.01,13.4,.62],[-3.38+s*1.02,13.65,.62],[-3.38+s*1.02,14.18,.62]],[.075,.18,.002],metal,figure,'side spear '+s,{segments:45,sides:16,flat:.55});}
 sweep([[-3.38,12,.62],[-3.38,14.1,.62],[-3.38,14.38,.62],[-3.38,15,.62]],[.11,.09,.21,.001],metal,figure,'central spear',{segments:70,sides:20,flat:.6});
 for(const y of [1.1,1.3,11.4,11.6]){const o=add(figure,new T.TorusGeometry(.12,.03,10,32),metal,'shaft collar');o.rotation.x=Math.PI/2;o.position.set(-3.38,y,.62);}
 // Lathed plinth with proper mouldings; statue feet sit at y=2 exactly.
 const profile=[[0,0],[3.94,0],[4,.1],[4,.38],[3.9,.49],[3.68,.49],[3.62,.58],[3.62,1.23],[3.7,1.28],[3.7,1.43],[3.5,1.54],[3.45,1.91],[3.36,2],[0,2]].map(p=>new T.Vector2(...p));add(root,new T.LatheGeometry(profile,160),base,'tiered marble plinth');
 root.userData.metadata=meta;return root;
}
export function sculptStats(root){let triangles=0,meshes=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return {triangles,meshes};}




