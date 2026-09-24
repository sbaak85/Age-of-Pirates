import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createShip } from '../ship-preview/ship.js';
import { batchStatic } from './optimization.js';
import { CombatExplosions } from './combat-explosions.js';

const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x245369);scene.add(new THREE.HemisphereLight(0xd4f8ff,0x233442,2));
const sun=new THREE.DirectionalLight(0xffeccd,2.4);sun.position.set(-12,20,10);scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0x236d7d,roughness:.6}));floor.rotation.x=-Math.PI/2;floor.position.y=-.25;scene.add(floor);
const {ship}=createShip();ship.scale.setScalar(.72);ship.position.y=.27;scene.add(ship);batchStatic(ship);
const camera=new THREE.PerspectiveCamera(48,1,.1,200);camera.position.set(12,13,15);
const controls=new OrbitControls(camera,document.getElementById('views'));controls.target.set(0,1.8,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=12;controls.maxDistance=48;controls.maxPolarAngle=Math.PI*.47;controls.update();
const fx=new CombatExplosions(scene),scales=[3,4.5,6,8],panels=[...document.querySelectorAll('.view')];
let selectedSlots=[],elapsed=0,paused=false,slow=false,last=performance.now();
const $=id=>document.getElementById(id);
function sync(){$('pause').textContent=paused?'繼續播放':'暫停';$('slow').setAttribute('aria-pressed',String(slow));}
function replay(){fx.clear();elapsed=0;paused=false;for(const scale of scales)fx.spawn('impact',0,1.4,2.1,scale);selectedSlots=fx.slots.filter(s=>s.active);for(const slot of selectedSlots.slice(1)){slot.chunks=selectedSlots[0].chunks;slot.embers=selectedSlots[0].embers;}sync();}
$('replay').onclick=replay;$('pause').onclick=()=>{paused=!paused;sync();};$('slow').onclick=()=>{slow=!slow;sync();};
$('freeze').onclick=()=>{replay();elapsed=.18;fx.update(.18,camera);paused=true;sync();};
const buttons=[...document.querySelectorAll('button')];let selection=0,repeatAt=0,aHeld=false;
function select(index){selection=(index+buttons.length)%buttons.length;buttons.forEach((b,i)=>b.classList.toggle('is-selected',i===selection));}
document.addEventListener('pointerdown',()=>buttons.forEach(b=>b.classList.remove('is-selected')));
document.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();select(selection+(['ArrowLeft','ArrowUp'].includes(e.code)?-1:1));buttons[selection].focus();}if(e.code==='Tab')requestAnimationFrame(()=>{const i=buttons.indexOf(document.activeElement);if(i>=0)select(i);});if(e.code==='Space'&&e.target.tagName!=='BUTTON'){e.preventDefault();$('pause').click();}});
replay();
function frame(now){requestAnimationFrame(frame);const dt=document.hidden?0:Math.min(.05,(now-last)/1000)*(slow?.35:1);last=now;
 const pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);if(pad){const axis=Math.abs(pad.axes[0])>.5?pad.axes[0]:pad.axes[1];if(Math.abs(axis)>.5&&now>repeatAt){select(selection+Math.sign(axis));repeatAt=now+260;}if(Math.abs(axis)<.3)repeatAt=0;const a=pad.buttons[0]?.pressed;if(a&&!aHeld){select(selection);buttons[selection].click();}aHeld=a;}else aHeld=false;
 controls.update();if(!paused){elapsed+=dt;if(elapsed>=2.6)replay();}
 fx.update(paused?0:dt,camera);
 renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.clear();renderer.setScissorTest(true);
 panels.forEach((panel,i)=>{const rect=panel.getBoundingClientRect(),slot=selectedSlots[i];
   fx.slots.forEach(s=>{s.group.visible=s===slot&&s.active;});
   fx.lights[1].intensity=0;const light=fx.lights[0],t=slot.age,scale=scales[i];light.intensity=slot.active?650*Math.exp(-t*14)+45*Math.exp(-t*7):0;light.distance=15*scale;light.position.copy(slot.group.position).y+=(slot.c.referenceY+.3)*scale;
   camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();slot.volume.material.uniforms.uToClip.value.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(slot.group.matrixWorld);
   renderer.setViewport(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissor(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.render(scene,camera);
 });renderer.setScissorTest(false);$('status').textContent=`${paused?'已暫停':'同步播放'} · ${elapsed.toFixed(2)} s`;
}
requestAnimationFrame(frame);addEventListener('resize',()=>renderer.setSize(innerWidth,innerHeight));
