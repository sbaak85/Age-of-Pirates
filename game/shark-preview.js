import * as THREE from 'three';
import {createSharkVariant} from './shark-variants.js';

const stage=document.getElementById('stage'),panels=[...stage.querySelectorAll('.panel')],buttons=[...document.querySelectorAll('button')];
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x113547);scene.fog=new THREE.Fog(0x113547,14,32);
scene.add(new THREE.HemisphereLight(0xbfeaf0,0x12323c,2.1));
const sun=new THREE.DirectionalLight(0xffebc6,2.8);sun.position.set(2,9,6);scene.add(sun);
const fill=new THREE.DirectionalLight(0x5ac6d3,1.6);fill.position.set(-5,2,-5);scene.add(fill);
const seabed=new THREE.Mesh(new THREE.PlaneGeometry(90,90),new THREE.MeshStandardMaterial({color:0x226278,roughness:1}));seabed.rotation.x=-Math.PI/2;seabed.position.y=-1.65;scene.add(seabed);
for(let i=0;i<12;i++){
 const radius=1.2+i*.57,points=[];
 for(let j=0;j<=64;j++){const a=j/64*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*radius,-1.632,Math.sin(a)*radius*.68));}
 const ring=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:i%3===0?0x5bb6bb:0x3c8795,transparent:true,opacity:i%3===0?.24:.12}));scene.add(ring);
}
const bubbles=new Float32Array(42*3);
for(let i=0;i<42;i++){bubbles[i*3]=Math.sin(i*12.989)*5.5;bubbles[i*3+1]=-1.3+(i%11)*.28;bubbles[i*3+2]=Math.cos(i*7.37)*3.5;}
const bubbleGeo=new THREE.BufferGeometry();bubbleGeo.setAttribute('position',new THREE.BufferAttribute(bubbles,3));
scene.add(new THREE.Points(bubbleGeo,new THREE.PointsMaterial({color:0xa5e5db,size:.055,transparent:true,opacity:.62,depthWrite:false})));
const sharks=[0,1].map(createSharkVariant);sharks.forEach(shark=>scene.add(shark.group));
const camera=new THREE.PerspectiveCamera(43,1,.1,100);
let yaw=.55,pitch=.18,distance=13.5,elapsed=0,last=performance.now(),view='all',burst=false,slow=false,paused=false;
let selection=0,navMode=false,repeatAt=0,aHeld=false;
const $=id=>document.getElementById(id);
function updateCamera(){
 const horizontal=distance*Math.cos(pitch);camera.position.set(Math.sin(yaw)*horizontal,.12+distance*Math.sin(pitch),Math.cos(yaw)*horizontal);
 camera.lookAt(0,.05,0);
}
function chooseView(value){
 view=value;stage.classList.toggle('single',view!=='all');panels.forEach((p,i)=>p.hidden=view!=='all'&&Number(view)!==i);
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 distance=view==='all'?13.5:11;updateCamera();
}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>chooseView(button.dataset.view)));
function sync(){
 $('burst').textContent=`衝刺：${burst?'開':'關'}`;$('burst').classList.toggle('active',burst);
 $('slow').textContent=`慢動作：${slow?'開':'關'}`;$('slow').classList.toggle('active',slow);
 $('pause').textContent=paused?'繼續':'暫停';$('pause').classList.toggle('active',paused);
 $('status').textContent=paused?'已暫停':burst?'衝刺中':'巡弋中';
}
$('burst').addEventListener('click',()=>{burst=!burst;sync();});
$('slow').addEventListener('click',()=>{slow=!slow;sync();});
$('pause').addEventListener('click',()=>{paused=!paused;sync();});
$('reset').addEventListener('click',()=>{elapsed=0;paused=false;sync();});
function select(index){
 selection=(index+buttons.length)%buttons.length;navMode=true;
 buttons.forEach((button,i)=>button.classList.toggle('is-selected',i===selection));
 buttons[selection].focus({preventScroll:true});
}
document.addEventListener('pointerdown',()=>{navMode=false;buttons.forEach(button=>button.classList.remove('is-selected'));});
document.addEventListener('keydown',event=>{
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code)){
  event.preventDefault();select(selection+(['ArrowLeft','ArrowUp'].includes(event.code)?-1:1));
 }else if(event.code==='Tab')requestAnimationFrame(()=>{const index=buttons.indexOf(document.activeElement);if(index>=0)select(index);});
 else if(event.code==='Space'&&document.activeElement.tagName!=='BUTTON'){event.preventDefault();$('pause').click();}
});
let dragging=false,lastX=0,lastY=0;
stage.addEventListener('pointerdown',event=>{dragging=true;lastX=event.clientX;lastY=event.clientY;stage.setPointerCapture(event.pointerId);stage.classList.add('dragging');});
stage.addEventListener('pointermove',event=>{if(!dragging)return;yaw+=(event.clientX-lastX)*.008;pitch=THREE.MathUtils.clamp(pitch+(event.clientY-lastY)*.006,-.25,.85);lastX=event.clientX;lastY=event.clientY;updateCamera();});
function stopDrag(){dragging=false;stage.classList.remove('dragging');}
stage.addEventListener('pointerup',stopDrag);stage.addEventListener('pointercancel',stopDrag);
stage.addEventListener('wheel',event=>{event.preventDefault();distance=THREE.MathUtils.clamp(distance+Math.sign(event.deltaY)*.48,5.5,14);updateCamera();},{passive:false});
function gamepad(now){
 const pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);
 if(!pad){aHeld=false;return;}
 const axis=Math.abs(pad.axes[0]||0)>.55?pad.axes[0]:pad.axes[1]||0;
 if(Math.abs(axis)>.55&&now>=repeatAt){select(selection+Math.sign(axis));repeatAt=now+260;}
 if(Math.abs(axis)<.25)repeatAt=0;
 const a=Boolean(pad.buttons[0]?.pressed);
 if(a&&!aHeld){if(!navMode)select(selection);buttons[selection].click();}aHeld=a;
}
function frame(now){
 requestAnimationFrame(frame);const dt=document.hidden?0:Math.min(.05,(now-last)/1000);last=now;gamepad(now);
 if(!paused)elapsed+=dt*(slow?.34:1);
 sharks.forEach(shark=>shark.animate(elapsed,burst?'burst':'cruise'));
 const position=bubbleGeo.attributes.position;
 for(let i=0;i<position.count;i++){const y=position.getY(i)+dt*.10*(1+i%3);position.setY(i,y>1.8?-1.38:y);}
 position.needsUpdate=true;
 renderer.setScissorTest(false);renderer.setViewport(0,0,innerWidth,innerHeight);renderer.clear();renderer.setScissorTest(true);
 for(let i=0;i<panels.length;i++){
  const rect=panels[i].getBoundingClientRect();if(!rect.width||!rect.height)continue;
  sharks.forEach((shark,j)=>shark.group.visible=j===i);
  camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();
  renderer.setViewport(rect.left,innerHeight-rect.bottom,rect.width,rect.height);
  renderer.setScissor(rect.left,innerHeight-rect.bottom,rect.width,rect.height);
  renderer.render(scene,camera);
 }
 renderer.setScissorTest(false);
}
updateCamera();sync();requestAnimationFrame(frame);
addEventListener('resize',()=>renderer.setSize(innerWidth,innerHeight));


