import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createFjordIslandStudy,BUILDING_TERRACES,HARBOR_FOUNDATION_COAST,HARBOR_FOUNDATION_TOP} from './fjord-island-study.js';
import {createGrandGate} from './fjord-grand-gate.js';
import {createPoseidon6K} from './poseidon-form-6k.js';
import {createFjordIslandHarbor,ISLAND_STATUE_POSITION} from './fjord-island-harbor.js';
import {createFjordIslandCastle} from './fjord-island-castle.js';
import {createFjordIslandWalkways} from './fjord-island-walkways.js';
import {createFjordIslandVillage} from './fjord-island-village.js';

const viewport=document.querySelector('#viewport');
const scene=new T.Scene();scene.background=new T.Color(0x9ebec5);scene.fog=new T.Fog(0x9ebec5,420,750);
const camera=new T.PerspectiveCamera(43,1,.5,900);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;viewport.append(renderer.domElement);
scene.add(new T.HemisphereLight(0xcde6e9,0x4c5864,1.55));
const sun=new T.DirectionalLight(0xffebc8,2.2);sun.position.set(-100,155,90);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-135,right:135,top:135,bottom:-135,near:1,far:350});sun.shadow.bias=-.00013;sun.shadow.normalBias=.06;scene.add(sun);
const fill=new T.DirectionalLight(0x75b4c3,.55);fill.position.set(65,45,-100);scene.add(fill);
const {group,land,sideIsland}=createFjordIslandStudy();scene.add(group);
const harbor=createFjordIslandHarbor();scene.add(harbor);
const castle=createFjordIslandCastle();scene.add(castle);
const walkways=createFjordIslandWalkways(land);scene.add(walkways);
const village=createFjordIslandVillage(land,sideIsland);scene.add(village.root);
const plotOutlines=new T.Group();plotOutlines.name='預覽用・建築預留地輪廓';
const houseLineMaterial=new T.LineBasicMaterial({color:0xf4b4a5,transparent:true,opacity:.88,depthTest:true});
const castleLineMaterial=new T.LineBasicMaterial({color:0xffdc79,transparent:true,opacity:.94,depthTest:true});
const harborLineMaterial=new T.LineBasicMaterial({color:0xf1a4c2,transparent:true,opacity:.94,depthTest:true});
for(const plot of BUILDING_TERRACES){
 const ring=[];
 for(let i=0;i<48;i++){
  const angle=i*Math.PI*2/48,c=Math.cos(angle),s=Math.sin(angle);
  ring.push(new T.Vector3(plot.x+plot.rx*Math.sign(c)*Math.sqrt(Math.abs(c))*.86,plot.y+.16,plot.z+plot.rz*Math.sign(s)*Math.sqrt(Math.abs(s))*.86));
 }
 const line=new T.LineLoop(new T.BufferGeometry().setFromPoints(ring),plot.name==='主堡用地'?castleLineMaterial:houseLineMaterial);
 line.name=`${plot.name} · ${plot.y} U`;
 plotOutlines.add(line);
}
const harborOutline=new T.LineLoop(new T.BufferGeometry().setFromPoints(HARBOR_FOUNDATION_COAST.map(([x,z])=>new T.Vector3(x,HARBOR_FOUNDATION_TOP+.18,z))),harborLineMaterial);
harborOutline.name='內港・人工石造平坦地基';plotOutlines.add(harborOutline);
scene.add(plotOutlines);
const seabed=new T.Mesh(new T.PlaneGeometry(1400,1400),new T.MeshStandardMaterial({color:0x426c76,roughness:1}));seabed.name='延伸海床';seabed.rotation.x=-Math.PI/2;seabed.position.y=-6.34;scene.add(seabed);
const water=new T.Mesh(new T.PlaneGeometry(1400,1400),new T.MeshStandardMaterial({color:0x126782,roughness:.39,metalness:.04,transparent:true,opacity:.74,depthWrite:false}));water.name='半透明海平面';water.rotation.x=-Math.PI/2;water.position.y=.015;water.receiveShadow=true;water.renderOrder=2;scene.add(water);
const gate=createGrandGate();gate.position.set(0,.6,61);scene.add(gate);
const statueIslet=new T.Group();statueIslet.name='前移的波賽頓雕像與礁台';statueIslet.position.set(ISLAND_STATUE_POSITION.x,0,ISLAND_STATUE_POSITION.z);scene.add(statueIslet);
const plinth=new T.Mesh(new T.CylinderGeometry(5.1,5.8,3.3,20),new T.MeshStandardMaterial({color:0x97a4a2,roughness:1}));plinth.name='海神礁台';plinth.position.set(0,1.58,0);plinth.castShadow=plinth.receiveShadow=true;statueIslet.add(plinth);
const rim=new T.Mesh(new T.CylinderGeometry(4.9,5.1,.4,20),new T.MeshStandardMaterial({color:0xd7d2bb,roughness:1}));rim.position.set(0,3.44,0);rim.castShadow=true;statueIslet.add(rim);
const statue=createPoseidon6K();statue.name='波賽頓雕像';statue.scale.setScalar(1.25);statue.position.set(0,3.64,0);statueIslet.add(statue);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=35;controls.maxDistance=475;controls.maxPolarAngle=Math.PI*.49;
const presets={castle:{p:[52,68,52],t:[2,30,-45]},waterline:{p:[22,9,43],t:[0,24,-43]},harbor:{p:[53,47,28],t:[0,5,-23]},harborTop:{p:[5,160,-2],t:[5,0,-2]},hero:{p:[225,178,345],t:[27,23,-31]},front:{p:[24,80,390],t:[24,23,-31]},plots:{p:[88,137,238],t:[-4,21,-27]},top:{p:[39,410,-29],t:[39,0,-29]},west:{p:[-265,114,55],t:[-35,22,-30]},westHomes:{p:[-152,88,61],t:[-73,20,-19]},eastHomes:{p:[131,66,70],t:[56,15,-10]},rear:{p:[72,147,-345],t:[24,20,-52]},channel:{p:[143,121,186],t:[135,20,-20]}};
function view(id){const {p,t}=presets[id];camera.position.set(...p);controls.target.set(...t);controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===id)));}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
document.querySelector('#water').onchange=e=>water.visible=e.target.checked;
document.querySelector('#wire').onchange=e=>{land.material.wireframe=e.target.checked;sideIsland.material.wireframe=e.target.checked;};
document.querySelector('#plots').onchange=e=>plotOutlines.visible=e.target.checked;
const terrainTriangleCount=group.userData.terrainTriangles+walkways.userData.earthTriangles;
document.querySelector('#count').textContent=`地形與階梯岩土路基 ${terrainTriangleCount.toLocaleString()} 三角形 / 上限 30,000`;
const mainPlots=BUILDING_TERRACES.filter(p=>p.island==='main'),sidePlots=BUILDING_TERRACES.filter(p=>p.island==='side');
const castlePlot=mainPlots.find(p=>p.name==='主堡用地');
document.querySelector('#plot-list').textContent=`主島民居用地 ${mainPlots.length-1} 塊（面積 +25%） · 主堡 ${castlePlot.rx*2} × ${castlePlot.rz*2} U · 離島住宅用地 ${sidePlots.length} 塊`;
document.querySelector('#walkway-count').textContent=`主島 ${walkways.userData.routeCount} 條步行路線 · ${walkways.userData.stepCount} 級石階 · 最窄踏面 ${walkways.userData.minRun.toFixed(2)} U`;
document.querySelector('#village-count').textContent=`希臘式山城平房 ${village.root.userData.houseCount} 棟 · 主島 ${village.root.userData.mainCount} 棟 · 離島 ${village.root.userData.sideCount} 棟`;
document.querySelector('#hud-summary').textContent=`依山建造的希臘式住宅 · 地形 ${terrainTriangleCount.toLocaleString()} 面`;
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}new ResizeObserver(resize).observe(viewport);resize();view('plots');document.body.dataset.ready='true';
function frame(){controls.update();renderer.render(scene,camera);requestAnimationFrame(frame);}frame();
