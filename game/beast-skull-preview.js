import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createBeastSkull} from './beast-skull-model.js';
import {createShip} from '../ship-preview/ship.js';

const viewport=document.querySelector('#viewport');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x536e69);scene.fog=new THREE.Fog(0x536e69,150,340);
const camera=new THREE.PerspectiveCamera(39,1,.5,450);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;viewport.append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=25;controls.maxDistance=235;controls.maxPolarAngle=Math.PI*.48;controls.autoRotateSpeed=.45;
scene.add(new THREE.HemisphereLight(0xd4e6da,0x343728,1.15));
const sun=new THREE.DirectionalLight(0xffeed3,3.0);sun.position.set(0,75,45);sun.target.position.set(-12,14,0);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-80,right:70,top:55,bottom:-55,near:1,far:180});sun.shadow.normalBias=.12;sun.shadow.bias=-.00005;scene.add(sun,sun.target);
const rim=new THREE.DirectionalLight(0x9fbfbb,1.7);rim.position.set(-35,40,-35);scene.add(rim);
const caveLight=new THREE.PointLight(0xffaf69,24,35,1.2);caveLight.position.set(-8,13,0);scene.add(caveLight);

const composer=new EffectComposer(renderer),ao=new SSAOPass(scene,camera,1,1,16);
ao.kernelRadius=5;ao.minDistance=.001;ao.maxDistance=.065;composer.addPass(new RenderPass(scene,camera));composer.addPass(ao);composer.addPass(new OutputPass());

let model;
try{model=await createBeastSkull();}catch(error){document.querySelector('#loading').textContent='模型載入失敗，請確認以專案啟動器開啟，並重新整理。';throw error;}
scene.add(model.root);
// Small ripples are surface relief, so water still receives physically consistent lighting.
const rippleData=new Uint8Array(256*256*4);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4,v=128+45*Math.sin(y*.28+Math.sin(x*.1)*1.4)+22*Math.sin(x*.21+y*.42);rippleData[i]=rippleData[i+1]=rippleData[i+2]=v;rippleData[i+3]=255;}
const ripple=new THREE.DataTexture(rippleData,256,256);ripple.wrapS=ripple.wrapT=THREE.RepeatWrapping;ripple.repeat.set(22,22);ripple.magFilter=THREE.LinearFilter;ripple.minFilter=THREE.LinearFilter;ripple.needsUpdate=true;
const water=new THREE.Mesh(new THREE.PlaneGeometry(900,900),new THREE.MeshStandardMaterial({color:0x376f70,roughness:.45,metalness:.15,bumpMap:ripple,bumpScale:.19}));water.rotation.x=-Math.PI/2;water.position.y=-1.15;water.receiveShadow=true;scene.add(water);
const {ship}=createShip();ship.scale.setScalar(.62);ship.position.set(29,.05,18);ship.rotation.y=-.8;scene.add(ship);

const views={hero:{position:[58,43,123],target:[-8,15,0]},side:{position:[-4,28,123],target:[-10,16,0]},front:{position:[106,30,12],target:[2,17,0]},game:{position:[60,106,83],target:[-12,11,0]},top:{position:[20,150,0],target:[-5,15,0]}};
function setView(id){const preset=views[id];controls.target.set(...preset.target).multiplyScalar(.8);camera.position.set(...preset.position).multiplyScalar(.8);camera.position.sub(controls.target).multiplyScalar(Math.max(1,.9/camera.aspect)).add(controls.target);controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===id)));}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
function updateVegetation(){const visible=!document.querySelector('#studio').checked&&document.querySelector('#moss').checked;model.foliage.visible=visible;model.mossUniform.value=visible?1:0;}
document.querySelector('#moss').onchange=updateVegetation;
document.querySelector('#studio').onchange=e=>{const studio=e.target.checked;updateVegetation();model.habitat.visible=water.visible=ship.visible=!studio;scene.background.set(studio?0x242e2d:0x536e69);scene.fog=studio?null:new THREE.Fog(0x536e69,150,340);};
document.querySelector('#rotate').onchange=e=>controls.autoRotate=e.target.checked;
document.querySelector('#wireframe').onchange=e=>{for(const mat of [model.bone,model.plainBone,model.toothMaterial])mat.wireframe=e.target.checked;};
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);composer.setSize(w,h);}addEventListener('resize',resize);resize();setView('hero');
document.querySelector('#loading').hidden=true;document.body.dataset.ready='true';
const clock=new THREE.Clock();function frame(){const t=clock.getElapsedTime();ripple.offset.y=t*.001;ship.position.y=.05+Math.sin(t*1.4)*.07;ship.rotation.z=Math.sin(t)*.014;controls.update();composer.render();requestAnimationFrame(frame);}frame();



