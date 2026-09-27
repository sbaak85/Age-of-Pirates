import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createCentralJungle} from './central-jungle-model.js';
import {createShip} from '../ship-preview/ship.js';
import {batchStatic} from './optimization.js';

const viewport=document.querySelector('#viewport'),scene=new THREE.Scene();scene.background=new THREE.Color(0x86b4af);scene.fog=new THREE.Fog(0x86b4af,300,670);
const camera=new THREE.PerspectiveCamera(43,1,.5,1000);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.localClippingEnabled=true;viewport.append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=12;controls.maxDistance=490;controls.maxPolarAngle=Math.PI*.49;
scene.add(new THREE.HemisphereLight(0xc2eee0,0x4a5541,1.8));
const sun=new THREE.DirectionalLight(0xffe6b0,3.1);sun.position.set(-65,135,60);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-118,right:118,top:118,bottom:-118,near:1,far:300});sun.shadow.normalBias=.25;sun.shadow.bias=-.0001;scene.add(sun,sun.target);
const fill=new THREE.DirectionalLight(0x70bfc0,.9);fill.position.set(90,45,-60);scene.add(fill);
let jungle;try{jungle=await createCentralJungle();}catch(error){document.querySelector('#loading').textContent='秘境載入失敗：'+error.message;throw error;}scene.add(jungle.root);

const grainData=new Uint8Array(128*128*4);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const v=130+40*Math.sin(y*.45+Math.sin(x*.2))+15*Math.sin(x*.39+y*.6),i=(y*128+x)*4;grainData[i]=grainData[i+1]=grainData[i+2]=v;grainData[i+3]=255;}
const ripple=new THREE.DataTexture(grainData,128,128);ripple.wrapS=ripple.wrapT=THREE.RepeatWrapping;ripple.repeat.set(35,35);ripple.magFilter=ripple.minFilter=THREE.LinearFilter;ripple.needsUpdate=true;
const waterMat=new THREE.MeshStandardMaterial({color:0x195777,roughness:.42,metalness:.12,bumpMap:ripple,bumpScale:.2});
waterMat.onBeforeCompile=shader=>{
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 lagoonP;').replace('#include <begin_vertex>','#include <begin_vertex>\nlagoonP=(modelMatrix*vec4(position,1.)).xyz;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 lagoonP;').replace('#include <color_fragment>',`#include <color_fragment>
float angle=atan(lagoonP.z,lagoonP.x);
float coast=60.+sin(angle*7.)*1.2+sin(angle*19.)*.45;
float shore=exp(-pow((length(lagoonP.xz)-coast)/5.,2.))*(1.-smoothstep(.966,.997,max(abs(sin(angle)),abs(cos(angle)))));
float island=exp(-pow((length(lagoonP.xz/vec2(18.,31.))-1.)*6.,2.));
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.045,.23,.19),max(shore,island)*.55);`);
};
const water=new THREE.Mesh(new THREE.PlaneGeometry(1200,1200),waterMat);water.rotation.x=-Math.PI/2;water.position.y=-.8;water.receiveShadow=true;scene.add(water);
const {ship}=createShip();batchStatic(ship);ship.scale.setScalar(.62);ship.position.set(20,.05,43);scene.add(ship);
const routes=new THREE.Group();scene.add(routes);routes.visible=false;
const lineMat=new THREE.LineDashedMaterial({color:0xf0d99b,dashSize:2.2,gapSize:1.5,transparent:true,opacity:.85,depthTest:false});
function route(points){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),lineMat);line.computeLineDistances();line.renderOrder=5;routes.add(line);}
route(Array.from({length:121},(_,i)=>{const a=i/120*Math.PI*2;return [Math.cos(a)*49,.15,Math.sin(a)*49];}));
for(const gate of jungle.gates){
 route([[gate.x*49,.15,gate.z*49],[gate.x*122,.15,gate.z*122]]);
 const c=document.createElement('canvas');c.width=256;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#163e34e8';ctx.fillRect(0,0,256,96);ctx.strokeStyle='#cfca8e';ctx.strokeRect(2,2,252,92);ctx.font='28px system-ui';ctx.fillStyle='#fff0be';ctx.textAlign='center';ctx.fillText(gate.name,128,58);
 const label=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false}));label.position.set(gate.x*111,10,gate.z*111);label.scale.set(22,8.25,1);label.renderOrder=6;routes.add(label);
}
const sectionPlane=new THREE.Plane(new THREE.Vector3(0,0,-1),27),sectionMats=new Set();
for(const group of [jungle.terrain,jungle.roofs,jungle.forest,jungle.details])group.traverse(o=>{if(o.isMesh)sectionMats.add(o.material);});
function section(){const enabled=document.querySelector('#section').checked;for(const mat of sectionMats){mat.clippingPlanes=enabled?[sectionPlane]:[];mat.clipShadows=true;mat.needsUpdate=true;}document.querySelector('#view-note').textContent=enabled?'前側已剖開，便於查看內部水道。':'完整岩壁包圍；可切換洞口或俯視視角。';}
const presets={hero:{p:[151,166,209],t:[0,4,0]},top:{p:[0,360,1],t:[0,0,0]},skull:{p:[67,53,88],t:[0,9,3]},lagoon:{p:[41,18,54],t:[-8,11,2]}};
function selectView(id){
 const {p,t}=presets[id];controls.target.set(...t);camera.position.set(...p);camera.position.sub(controls.target).multiplyScalar(Math.max(1,.96/camera.aspect)).add(controls.target);controls.update();
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===id)));
 document.querySelectorAll('[data-gate]').forEach(b=>b.setAttribute('aria-pressed','false'));
 if(id==='top'){document.querySelector('#section').checked=false;section();}
}
function stage(id){const enabled=id==='forest';jungle.forest.visible=jungle.details.visible=enabled;document.querySelectorAll('[data-stage]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.stage===id)));document.querySelector('#stage-label').textContent=enabled?'森林層次 · 配置初稿':'地形、水道與四洞 · 配置初稿';}
document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>stage(b.dataset.stage));
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>selectView(b.dataset.view));
document.querySelectorAll('[data-gate]').forEach(b=>b.onclick=()=>{
 const gate=jungle.gates.find(g=>g.id===b.dataset.gate);document.querySelector('#section').checked=false;document.querySelector('#roofs').checked=true;jungle.roofs.visible=true;section();
 camera.position.set(gate.x*126,13,gate.z*126);controls.target.set(gate.x*53,8,gate.z*53);controls.update();ship.position.set(gate.x*111,.05,gate.z*111);ship.rotation.y=Math.atan2(gate.x,gate.z)+Math.PI/2;document.querySelector('#sailing').checked=false;
 document.querySelectorAll('[data-view]').forEach(v=>v.setAttribute('aria-pressed','false'));document.querySelectorAll('[data-gate]').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));
});
document.querySelector('#section').onchange=section;document.querySelector('#roofs').onchange=e=>jungle.roofs.visible=e.target.checked;document.querySelector('#routes').onchange=e=>routes.visible=e.target.checked;
document.querySelector('#reset').onclick=()=>{document.querySelector('#section').checked=true;document.querySelector('#roofs').checked=true;document.querySelector('#routes').checked=false;document.querySelector('#sailing').checked=false;jungle.roofs.visible=true;routes.visible=false;ship.position.set(20,.05,43);section();stage('forest');selectView('hero');};
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}new ResizeObserver(resize).observe(viewport);resize();section();selectView('hero');document.querySelector('#loading').hidden=true;document.body.dataset.ready='true';
const clock=new THREE.Clock();let tick=0,travel=0;
function animate(){const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;if(!document.hidden){
 controls.update();jungle.update(time);ripple.offset.y=time*.0018;
 if(document.querySelector('#sailing').checked){travel+=dt*4;const a=travel/49;ship.position.set(Math.cos(a)*49,.05,Math.sin(a)*49);ship.rotation.y=-a-Math.PI/2;}
 ship.position.y=.05+Math.sin(time*1.4)*.065;ship.rotation.z=Math.sin(time)*.01;renderer.render(scene,camera);
 if(tick++%30===0)document.querySelector('#stats').textContent=`${renderer.info.render.calls} draws · ${Math.round(renderer.info.render.triangles/1000)}k 場景三角面`;
 }requestAnimationFrame(animate);}
animate();
