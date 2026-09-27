import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createBeastSkull} from './beast-skull-model.js';
import {createBeastSkullLod50,createBeastSkullLod} from './beast-skull-lod.js';
import {createShip} from '/ship-preview/ship.js';
import {setSkullWideProfile} from './beast-skull-shape.js';

const DEFAULT_SCALE=.8;
const triple=Boolean(document.querySelector('#low-viewport'));
const fogNear=triple?450:150,fogFar=triple?850:340;
const views={hero:{position:[58,43,123],target:[-8,15,0]},side:{position:[-4,28,137],target:[-13,16,0]},front:{position:[106,30,12],target:[2,17,0]},game:{position:[60,106,83],target:[-12,11,0]},top:{position:[20,150,0],target:[-5,15,0]}};
const loading=document.querySelector('#loading');
let original,reduced,manifest,low,lowManifest,tiny,tinyManifest;
try{
 original=await createBeastSkull();
 ({model:reduced,manifest}=await createBeastSkullLod50(original));
 if(document.querySelector('#low-viewport'))({model:low,manifest:lowManifest}=await createBeastSkullLod(original,'lod10k'));
 if(document.querySelector('#tiny-viewport'))({model:tiny,manifest:tinyManifest}=await createBeastSkullLod(original,'lod5k'));
}catch(error){loading.textContent=`比較模型載入失敗：${error.message}`;throw error;}

// Both sides use the same water, ship and material definitions.
const rippleData=new Uint8Array(256*256*4);
for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4,v=128+45*Math.sin(y*.28+Math.sin(x*.1)*1.4)+22*Math.sin(x*.21+y*.42);rippleData[i]=rippleData[i+1]=rippleData[i+2]=v;rippleData[i+3]=255;}
const ripple=new THREE.DataTexture(rippleData,256,256);ripple.wrapS=ripple.wrapT=THREE.RepeatWrapping;ripple.repeat.set(22,22);ripple.magFilter=ripple.minFilter=THREE.LinearFilter;ripple.needsUpdate=true;
const waterGeometry=new THREE.PlaneGeometry(900,900),waterMaterial=new THREE.MeshStandardMaterial({color:0x376f70,roughness:.45,metalness:.15,bumpMap:ripple,bumpScale:.19});
const sourceShip=createShip().ship;

function makePane(viewport,model){
 setSkullWideProfile(model,true);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x536e69);scene.fog=new THREE.Fog(0x536e69,fogNear,fogFar);
 const camera=new THREE.PerspectiveCamera(39,1,.5,triple?1000:450);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;viewport.append(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=20;controls.maxDistance=triple?700:280;controls.maxPolarAngle=Math.PI*.48;controls.autoRotateSpeed=.45;
 scene.add(new THREE.HemisphereLight(0xd4e6da,0x343728,1.15));
 const sun=new THREE.DirectionalLight(0xffeed3,3.0);sun.position.set(0,75,45);sun.target.position.set(-12,14,0);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-80,right:70,top:55,bottom:-55,near:1,far:180});sun.shadow.normalBias=.12;sun.shadow.bias=-.00005;scene.add(sun,sun.target);
 const rim=new THREE.DirectionalLight(0x9fbfbb,1.7);rim.position.set(-35,40,-35);scene.add(rim);
 const caveLight=new THREE.PointLight(0xffaf69,24,35,1.2);caveLight.position.set(-8,13,0).multiplyScalar(DEFAULT_SCALE);scene.add(caveLight);
 const composer=new EffectComposer(renderer),ao=new SSAOPass(scene,camera,1,1,16);ao.kernelRadius=5;ao.minDistance=.001;ao.maxDistance=.065;composer.addPass(new RenderPass(scene,camera));composer.addPass(ao);composer.addPass(new OutputPass());
 model.root.scale.setScalar(DEFAULT_SCALE);scene.add(model.root);
 const water=new THREE.Mesh(waterGeometry,waterMaterial);water.rotation.x=-Math.PI/2;water.position.y=-1.15;water.receiveShadow=true;scene.add(water);
 const ship=sourceShip.clone(true);ship.scale.setScalar(.62);ship.position.set(29,.05,18);ship.rotation.y=-.8;scene.add(ship);
 return {viewport,model,scene,camera,renderer,controls,composer,ao,water,ship,caveLight};
}
const panes=[];
if(document.querySelector('#original-viewport'))panes.push(makePane(document.querySelector('#original-viewport'),original));
panes.push(makePane(document.querySelector('#reduced-viewport'),reduced));
if(low)panes.push(makePane(document.querySelector('#low-viewport'),low));
if(tiny)panes.push(makePane(document.querySelector('#tiny-viewport'),tiny));
let synchronizing=false,currentView='hero';
function synchronize(source){
 if(synchronizing)return;synchronizing=true;
 for(const pane of panes){if(pane===source)continue;pane.camera.position.copy(source.camera.position);pane.camera.quaternion.copy(source.camera.quaternion);pane.camera.up.copy(source.camera.up);pane.camera.zoom=source.camera.zoom;pane.camera.updateProjectionMatrix();pane.controls.target.copy(source.controls.target);pane.controls.update(0);}
 synchronizing=false;
}
for(const pane of panes)pane.controls.addEventListener('change',()=>synchronize(pane));

function resize(){
 for(const p of panes){const w=p.viewport.clientWidth,h=p.viewport.clientHeight;p.camera.aspect=w/h;p.camera.updateProjectionMatrix();p.renderer.setSize(w,h);p.composer.setSize(w,h);}
}
new ResizeObserver(resize).observe(document.querySelector('main'));resize();
function setView(id){
 currentView=id;
 const p=panes[0],preset=views[id],scale=Number(document.querySelector('#scale').value)/100;
 p.controls.target.set(...preset.target).multiplyScalar(scale);
 p.camera.position.set(...preset.position).multiplyScalar(DEFAULT_SCALE);
 if(triple){
  const back=p.camera.position.clone().sub(p.controls.target).normalize(),right=new THREE.Vector3().crossVectors(p.camera.up,back).normalize(),up=new THREE.Vector3().crossVectors(back,right);
  const tangent=Math.tan(THREE.MathUtils.degToRad(p.camera.fov/2));let distance=0;
  const point=new THREE.Vector3();
  for(const root of [p.model.root,p.ship]){root.updateMatrixWorld(true);root.traverseVisible(mesh=>{const positions=mesh.geometry?.attributes.position;if(!positions)return;const step=Math.max(1,Math.floor(positions.count/4000));for(let i=0;i<positions.count;i+=step){point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).sub(p.controls.target);distance=Math.max(distance,point.dot(back)+Math.abs(point.dot(right))/(tangent*p.camera.aspect),point.dot(back)+Math.abs(point.dot(up))/tangent);}});}
  p.camera.position.copy(p.controls.target).addScaledVector(back,distance*1.1);
 }else p.camera.position.sub(p.controls.target).multiplyScalar(Math.max(1,1.04/p.camera.aspect)).add(p.controls.target);
 p.camera.zoom=1;p.camera.updateProjectionMatrix();p.controls.update(0);synchronize(p);
 document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===id)));
}
function setScale(){
 const scale=Number(document.querySelector('#scale').value)/100;
 for(const p of panes){p.model.root.scale.setScalar(scale);p.caveLight.position.set(-8,13,0).multiplyScalar(scale);}
 document.querySelector('#scale-value').value=`${Math.round(scale*100)}%`;
 document.querySelector('.help').textContent=`拖曳任一側同步旋轉 · 滾輪同步縮放 · 右鍵平移 ｜ ${panes.length===3?'三':'兩'}版長、寬、高均為先前的 ${Math.round(scale*100)}%，船隻尺寸固定；可用滑桿微調。`;
}
function setStudio(){
 const studio=document.querySelector('#studio').checked;
 for(const p of panes){p.model.foliage.visible=p.model.habitat.visible=p.water.visible=p.ship.visible=!studio;p.model.mossUniform.value=studio?0:1;p.scene.background.set(studio?0x242e2d:0x536e69);p.scene.fog=studio?null:new THREE.Fog(0x536e69,fogNear,fogFar);}
}
const wireMaterial=new THREE.MeshBasicMaterial({color:0xbcd6c5,wireframe:true});
const surfaceMaterials=new Map(panes.flatMap(p=>p.model.fossil.children.map(mesh=>[mesh,mesh.material])));
function setWireframe(){
 const wireframe=document.querySelector('#wireframe').checked;
 for(const p of panes){p.ao.enabled=!wireframe;for(const part of p.model.fossil.children)part.material=wireframe?wireMaterial:surfaceMaterials.get(part);}
}
function setRotation(){panes[0].controls.autoRotate=document.querySelector('#rotate').checked;}
document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>setView(button.dataset.view));
document.querySelector('#scale').oninput=setScale;
document.querySelector('#studio').onchange=setStudio;
document.querySelector('#wireframe').onchange=setWireframe;
document.querySelector('#rotate').onchange=setRotation;
const skullProfile=document.querySelector('#skull-profile');
if(skullProfile)skullProfile.onchange=()=>{for(const p of panes)setSkullWideProfile(p.model,skullProfile.checked);};
const layout=document.querySelector('#layout');
if(layout)layout.onchange=()=>{document.querySelector('main').dataset.layout=layout.value;resize();setView(currentView);};
if(layout&&innerWidth<1250){layout.value='rows';document.querySelector('main').dataset.layout='rows';resize();}
document.querySelector('#reset').onclick=()=>{document.querySelector('#scale').value='80';for(const id of ['studio','wireframe','rotate'])document.querySelector('#'+id).checked=false;if(skullProfile)skullProfile.checked=true;for(const p of panes)setSkullWideProfile(p.model,true);setScale();setStudio();setWireframe();setRotation();setView('hero');};

const triangles=model=>model.fossil.children.reduce((sum,part)=>sum+part.geometry.index.count/3,0);
if(triangles(original)!==manifest.originalTriangles||triangles(reduced)!==manifest.reducedTriangles)throw new Error('Rendered model count differs from manifest');
if(low&&triangles(low)!==lowManifest.reducedTriangles)throw new Error('10k model count differs from manifest');
if(tiny&&triangles(tiny)!==tinyManifest.reducedTriangles)throw new Error('5k model count differs from manifest');
const format=new Intl.NumberFormat('zh-TW');
const originalCount=document.querySelector('#original-count');
if(originalCount)originalCount.textContent=`${format.format(triangles(original))} 三角面 · 完整獸骨`;
document.querySelector('#reduced-count').textContent=`${format.format(triangles(reduced))} 三角面 · 完整獸骨`;
document.querySelector('#reduction').textContent=`實際減少 ${(manifest.reduction*100).toFixed(2)}%`;
if(low){document.querySelector('#low-count').textContent=`${format.format(triangles(low))} 三角面 · 完整獸骨`;document.querySelector('#low-reduction').textContent=`實際減少 ${(lowManifest.reduction*100).toFixed(2)}%`;}
if(tiny){document.querySelector('#tiny-count').textContent=`${format.format(triangles(tiny))} 三角面 · 完整獸骨`;document.querySelector('#tiny-reduction').textContent=`實際減少 ${(tinyManifest.reduction*100).toFixed(2)}%`;}
setView('hero');loading.hidden=true;document.body.dataset.ready='true';
const clock=new THREE.Clock();
function frame(){
 const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
 if(!document.hidden){ripple.offset.y=t*.001;panes[0].controls.update(dt);for(const p of panes){p.ship.position.y=.05+Math.sin(t*1.4)*.07;p.ship.rotation.z=Math.sin(t)*.014;p.composer.render();}}
 requestAnimationFrame(frame);
}
frame();
