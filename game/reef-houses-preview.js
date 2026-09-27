import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {reefCottage,createReefChapel,villageSlots,instanceKit} from './archipelago-art.js';
import {REGIONS,TERRAIN} from './archipelago-data.js';
const region=REGIONS.find(r=>r.id==='reef'),slots=villageSlots(region);
const names=['珊瑚紅屋頂・高架住宅','青藍屋頂・長屋','杏橙屋頂・寬屋','薄荷綠屋頂・橫脊住宅'];
const entries=slots.map((s,i)=>({...s,id:'home-'+s.slot,label:String(i+1).padStart(2,'0')+' · '+names[s.slot%4],kind:s.slot%4}));
entries.push({id:'chapel',label:'34 · 主島海濱大教堂',kind:4,islandSeed:32,...(()=>{const t=TERRAIN.find(t=>t.seed===32);return {x:t.x,z:t.z,y:t.h};})()});
document.querySelector('#summary').textContent=slots.length+' 棟住宅 · 4 種外觀配置 · 1 座大教堂';
const scene=new THREE.Scene();scene.background=new THREE.Color('#213e44');
scene.add(new THREE.HemisphereLight(0xe8fff4,0x6f6959,2));
const sun=new THREE.DirectionalLight(0xffe3bc,3);sun.position.set(15,24,22);scene.add(sun);
const ground=new THREE.Mesh(new THREE.CircleGeometry(80,80),new THREE.MeshStandardMaterial({color:0x315057,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.08;scene.add(ground);
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#canvas'),antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const camera=new THREE.PerspectiveCamera(38,1,.1,500),controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=3;controls.maxDistance=100;controls.autoRotateSpeed=.7;
const models=new Map(),cards=new Map();let active,size,center;
function modelFor(e){
 if(models.has(e.id))return models.get(e.id);
 const g=e.kind===4?createReefChapel({x:0,z:0,h:0}):new THREE.Group();
 if(e.kind!==4){reefCottage(g,0,0,0,e.slot,true);instanceKit(g);}
 models.set(e.id,g);return g;
}
function frame(direction='angle'){
 const radius=Math.max(size.x,size.y,size.z)*.72,dist=radius/Math.sin(THREE.MathUtils.degToRad(19))*1.14;
 const v=direction==='front'?new THREE.Vector3(0,.25,1):direction==='back'?new THREE.Vector3(0,.25,-1):new THREE.Vector3(1,.65,1.35);
 camera.position.copy(center).addScaledVector(v.normalize(),dist);controls.target.copy(center);controls.update();
}
function show(e){
 if(active)scene.remove(modelFor(active));active=e;
 const model=modelFor(e);scene.add(model);model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(model);size=bounds.getSize(new THREE.Vector3());center=bounds.getCenter(new THREE.Vector3());
 frame();
 for(const [id,card] of cards)card.classList.toggle('active',id===e.id);
 let triangles=0;model.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});
 document.querySelector('#name').textContent=e.label;
 document.querySelector('#meta').textContent='島嶼 '+e.islandSeed+(e.slot!==undefined?' · 配置 '+e.slot:' · 唯一地標')+' ｜ 地圖 X '+e.x.toFixed(1)+' / Z '+e.z.toFixed(1)+' ｜ '+triangles.toLocaleString()+' 三角面';
}
function resize(){const box=document.querySelector('#view').getBoundingClientRect();renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();}
renderer.setPixelRatio(1);renderer.setSize(300,240,false);camera.aspect=1.25;camera.updateProjectionMatrix();
for(const e of entries){
 show(e);renderer.render(scene,camera);
 const card=document.createElement('button');card.className='card';card.dataset.kind=e.kind;card.setAttribute('aria-label',e.label+'，島嶼 '+e.islandSeed);
 const img=new Image();img.src=renderer.domElement.toDataURL('image/png');img.alt=e.label;
 const title=document.createElement('span');title.textContent=e.label;
 const sub=document.createElement('small');sub.textContent='島嶼 '+e.islandSeed+(e.slot!==undefined?' · 配置 '+e.slot:' · 地標');
 card.append(img,title,sub);card.onclick=()=>show(e);document.querySelector('#list').append(card);cards.set(e.id,card);
}
for(const [kind,label] of [[-1,'全部 34'],...names.map((n,k)=>[k,n.split('・')[0]+' '+entries.filter(e=>e.kind===k).length]),[4,'大教堂 1']]){
 const button=document.createElement('button');button.textContent=label;button.classList.toggle('active',kind===-1);
 button.onclick=()=>{for(const e of entries)cards.get(e.id).hidden=kind!==-1&&e.kind!==kind;for(const b of document.querySelector('#filters').children)b.classList.toggle('active',b===button);};
 document.querySelector('#filters').append(button);
}
document.querySelector('#front').onclick=()=>frame('front');document.querySelector('#back').onclick=()=>frame('back');document.querySelector('#reset').onclick=()=>frame();
document.querySelector('#spin').onclick=e=>{controls.autoRotate=!controls.autoRotate;e.currentTarget.setAttribute('aria-pressed',controls.autoRotate);e.currentTarget.textContent=controls.autoRotate?'停止旋轉':'自動旋轉';};
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));resize();show(entries[0]);
new ResizeObserver(resize).observe(document.querySelector('#view'));
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
