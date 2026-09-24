import { explosionCFragment } from './explosion-c-volume.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));
renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#070e17');scene.fog=new THREE.FogExp2('#070e17',.024);
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.1,110);
camera.position.set(12,8,17);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,3,0);controls.enableDamping=true;controls.minDistance=12;controls.maxDistance=35;controls.maxPolarAngle=Math.PI*.48;controls.enablePan=false;
scene.add(new THREE.HemisphereLight(0x91bfdc,0x171119,1.4));
const rim=new THREE.DirectionalLight(0x9fcbe9,3);rim.position.set(-8,12,-7);scene.add(rim);
const flash=new THREE.PointLight(0xff8b22,0,24,2);flash.position.set(0,.9,0);scene.add(flash);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.MeshStandardMaterial({color:0x182732,roughness:.43,metalness:.42}));floor.rotation.x=-Math.PI/2;scene.add(floor);
const stage=new THREE.Mesh(new THREE.CylinderGeometry(5.7,5.9,.18,96),new THREE.MeshStandardMaterial({color:0x25313a,roughness:.67,metalness:.3}));stage.position.y=.01;scene.add(stage);
for(const radius of [5.3,5.6]){const m=new THREE.Mesh(new THREE.TorusGeometry(radius,.018,6,128),new THREE.MeshBasicMaterial({color:0x657575}));m.rotation.x=Math.PI/2;m.position.y=.11;scene.add(m);}

// A bounded 3D density field, integrated front to back. No billboard smoke sprites.
const volumeMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,
 uniforms:{uTime:{value:0},uEye:{value:new THREE.Vector3()}},
 vertexShader:`varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
 fragmentShader:explosionCFragment});
const volume=new THREE.Mesh(new THREE.BoxGeometry(4.8,3.87,4.8),volumeMat);volume.position.y=2.065;volume.renderOrder=3;scene.add(volume);

const debrisMaterial=new THREE.MeshStandardMaterial({color:0x302323,roughness:.8,metalness:.22,emissive:0xff4308,emissiveIntensity:0});
const debris=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),debrisMaterial,12);scene.add(debris);
let seed=912;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const chunks=Array.from({length:12},()=>{const angle=random()*Math.PI*2,speed=1+random()*2.5;return{vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed,vy:1.5+random()*3,size:.025+random()**2*.075,spin:random()*8,phase:random()*6};});
const sparksCount=32,positions=new Float32Array(sparksCount*6),colors=new Float32Array(sparksCount*6);
const sparkData=Array.from({length:sparksCount},()=>{const a=random()*6.283,s=1+random()*3.5;return{vx:Math.cos(a)*s,vz:Math.sin(a)*s,vy:1+random()*4,life:.18+random()*.4};});
const sparkGeo=new THREE.BufferGeometry();sparkGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));sparkGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));
const sparkMaterial=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});const sparks=new THREE.LineSegments(sparkGeo,sparkMaterial);sparks.frustumCulled=false;scene.add(sparks);
const shock=new THREE.Mesh(new THREE.RingGeometry(.94,1,128),new THREE.MeshBasicMaterial({color:0xffc289,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));shock.rotation.x=-Math.PI/2;shock.position.y=.13;scene.add(shock);
const glow=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:0xffdf98,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));glow.position.y=.8;scene.add(glow);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.35,.5,1.15));composer.addPass(new OutputPass());

let elapsed=0,paused=false,slow=false,loop=true,last=performance.now();
const $=id=>document.getElementById(id);const buttons=[...document.querySelectorAll('button')];
function replay(){elapsed=0;paused=false;sync();}
function sync(){$('pause').textContent=paused?'繼續播放':'暫停';$('pause').setAttribute('aria-pressed',paused);$('slow').setAttribute('aria-pressed',slow);$('loop').setAttribute('aria-pressed',loop);$('loop').textContent=`循環：${loop?'開':'關'}`;}
$('replay').onclick=replay;$('pause').onclick=()=>{paused=!paused;sync();};$('slow').onclick=()=>{slow=!slow;sync();};$('loop').onclick=()=>{loop=!loop;sync();};
let selected=0,repeatAt=0,heldA=false;const select=i=>{selected=(i+buttons.length)%buttons.length;buttons.forEach((b,j)=>b.classList.toggle('is-selected',j===selected));};
document.addEventListener('pointerdown',()=>buttons.forEach(b=>b.classList.remove('is-selected')));
document.addEventListener('keydown',e=>{if(e.code==='Space'&&e.target.tagName!=='BUTTON'){e.preventDefault();$('pause').click();}if(e.code==='KeyR')replay();if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();select(selected+(['ArrowLeft','ArrowUp'].includes(e.code)?-1:1));buttons[selected].focus();}if(e.code==='Tab')requestAnimationFrame(()=>{const i=buttons.indexOf(document.activeElement);if(i>=0)select(i);});});
document.addEventListener('visibilitychange',()=>{last=performance.now();});
const dummy=new THREE.Object3D();
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;
 const pad=navigator.getGamepads?.()[0];if(pad){const axis=Math.abs(pad.axes[0])>.5?pad.axes[0]:pad.axes[1];if(Math.abs(axis)>.5&&now>repeatAt){select(selected+Math.sign(axis));repeatAt=now+260;}if(Math.abs(axis)<.3)repeatAt=0;const a=pad.buttons[0]?.pressed;if(a&&!heldA){select(selected);buttons[selected].click();}heldA=a;}else heldA=false;
 if(!paused&&!document.hidden){elapsed+=dt*(slow?.35:1);if(elapsed>3){if(loop)elapsed%=3;else{elapsed=3;paused=true;sync();}}}
 const t=Math.max(0,elapsed-.25);volume.visible=t>0&&t<1.5;volumeMat.uniforms.uTime.value=t;volumeMat.uniforms.uEye.value.copy(camera.position);
 flash.intensity=t>0?650*Math.exp(-t*14)+45*Math.exp(-t*7)*(1+Math.sin(t*37)*.1):0;
 glow.scale.setScalar(.15+Math.min(t,.07)*7);glow.material.opacity=t>0?Math.max(0,1-t/.10):0;
 shock.scale.setScalar(.2+t*5);shock.material.opacity=t>0?Math.max(0,.6-t*2.8):0;
 debris.visible=t>0;debrisMaterial.emissiveIntensity=.9*Math.exp(-t*2.4);
 chunks.forEach((c,i)=>{const hit=(c.vy+Math.sqrt(c.vy*c.vy+2*9.8*.65))/9.8;let y=.65+c.vy*t-4.9*t*t;let travel=t;if(t>hit){const b=t-hit;y=.15+Math.max(0,c.vy*.24*b-4.9*b*b);travel=hit+(1-Math.exp(-b*3))*.45;}dummy.position.set(c.vx*travel,y,c.vz*travel);dummy.rotation.set(c.phase+t*c.spin,t*c.spin*.7,c.phase);dummy.scale.set(c.size*.65,c.size*1.5,c.size*.85).multiplyScalar(1-THREE.MathUtils.smoothstep(t,.7,1.5));dummy.updateMatrix();debris.setMatrixAt(i,dummy.matrix);});debris.instanceMatrix.needsUpdate=true;
 sparkData.forEach((s,i)=>{const alive=t>0&&t<s.life;for(let end=0;end<2;end++){const q=Math.max(0,t-end*.025);const k=i*6+end*3;positions[k]=s.vx*q;positions[k+1]=Math.max(.14,.65+s.vy*q-4*q*q);positions[k+2]=s.vz*q;const bright=alive?(1-t/s.life)*(end?.7:3):0;colors[k]=bright;colors[k+1]=bright*.48;colors[k+2]=bright*.08;}});sparkGeo.attributes.position.needsUpdate=true;sparkGeo.attributes.color.needsUpdate=true;
 $('phase').textContent=t<.05?'準備引爆':t<.16?'衝擊波 · 火球爆發':t<.5?'火焰與濃煙':t<1.2?'命中煙團 · 快速消散':'餘燼消散';$('time').textContent=`${elapsed.toFixed(2)} / 3.00 s`;$('progress').style.width=`${elapsed/3*100}%`;
 controls.update();composer.render();
}
requestAnimationFrame(animate);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});
