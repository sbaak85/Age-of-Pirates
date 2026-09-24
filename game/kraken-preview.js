import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createShip } from '../ship-preview/ship.js';
import { batchStatic } from './optimization.js';
import { createKraken } from './kraken-models.js';

const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x245369);scene.add(new THREE.HemisphereLight(0xd4f8ff,0x233442,2));
const sun=new THREE.DirectionalLight(0xffeccd,2.4);sun.position.set(-12,20,10);scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0x236d7d,roughness:.6}));floor.rotation.x=-Math.PI/2;floor.position.y=-.25;scene.add(floor);

const camera=new THREE.PerspectiveCamera(48,1,.1,200);camera.position.set(12,16,30);
const controls=new OrbitControls(camera,document.getElementById('views'));controls.target.set(0,1.7,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=12;controls.maxDistance=48;controls.maxPolarAngle=Math.PI*.47;controls.update();
const variants=[0,1,2].map(createKraken),panels=[...document.querySelectorAll('.view')];variants.forEach(v=>scene.add(v.group));
const ball=new THREE.Mesh(new THREE.SphereGeometry(.18,12,8),new THREE.MeshStandardMaterial({color:0x292d31,metalness:.5,roughness:.4}));scene.add(ball);
let elapsed=0,paused=false,slow=false,last=performance.now();
const $=id=>document.getElementById(id);
function sync(){$('pause').textContent=paused?'繼續播放':'暫停';$('slow').setAttribute('aria-pressed',String(slow));}
function replay(){elapsed=0;paused=false;sync();}
$('replay').onclick=replay;$('pause').onclick=()=>{paused=!paused;sync();};$('slow').onclick=()=>{slow=!slow;sync();};
let view='all',mode='auto';
const modes=['auto','idle','swim','attack'],names=['自動展示','待機','巡弋','蓄力拍擊'];
$('motion').onclick=()=>{mode=modes[(modes.indexOf(mode)+1)%modes.length];elapsed=0;$('motion').textContent='動作：'+names[modes.indexOf(mode)];};
document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{view=button.dataset.view;$('views').style.gridTemplateColumns=view==='all'?'repeat(3,1fr)':'1fr';panels.forEach((p,i)=>p.style.display=view==='all'||Number(view)===i?'':'none');camera.position.set(...(view==='all'?[12,16,30]:[9,9,16]));controls.target.set(0,1.7,0);controls.update();});
const buttons=[...document.querySelectorAll('button')];let selection=0,repeatAt=0,aHeld=false;
function select(index){selection=(index+buttons.length)%buttons.length;buttons.forEach((b,i)=>b.classList.toggle('is-selected',i===selection));}
document.addEventListener('pointerdown',()=>buttons.forEach(b=>b.classList.remove('is-selected')));
document.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();select(selection+(['ArrowLeft','ArrowUp'].includes(e.code)?-1:1));buttons[selection].focus();}if(e.code==='Tab')requestAnimationFrame(()=>{const i=buttons.indexOf(document.activeElement);if(i>=0)select(i);});if(e.code==='Space'&&e.target.tagName!=='BUTTON'){e.preventDefault();$('pause').click();}});
replay();
function frame(now){requestAnimationFrame(frame);const dt=document.hidden?0:Math.min(.05,(now-last)/1000)*(slow?.35:1);last=now;
 const pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);if(pad){const axis=Math.abs(pad.axes[0])>.5?pad.axes[0]:pad.axes[1];if(Math.abs(axis)>.5&&now>repeatAt){select(selection+Math.sign(axis));repeatAt=now+260;}if(Math.abs(axis)<.3)repeatAt=0;const a=pad.buttons[0]?.pressed;if(a&&!aHeld){select(selection);buttons[selection].click();}aHeld=a;}else aHeld=false;
 controls.update();if(!paused){elapsed+=dt;}
 const t=elapsed;let phase='';variants.forEach(v=>{phase=v.update(t,mode);});ball.visible=false;
 renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.clear();renderer.setScissorTest(true);
 panels.forEach((panel,i)=>{const rect=panel.getBoundingClientRect();if(!rect.width)return;variants.forEach((v,j)=>{v.group.visible=j===i;});
   camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();
   renderer.setViewport(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.setScissor(rect.left,innerHeight-rect.bottom,rect.width,rect.height);renderer.render(scene,camera);
 });renderer.setScissorTest(false);$('status').textContent=paused?'已暫停':phase;
}
requestAnimationFrame(frame);addEventListener('resize',()=>renderer.setSize(innerWidth,innerHeight));
