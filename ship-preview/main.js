import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createShip } from './ship.js';
import { createIsland } from './island.js';
import { createOcean } from './ocean.js';

const loading = document.querySelector('#loading');
const islandMode = new URLSearchParams(location.search).get('view') !== 'ship';
document.querySelector('#waves').hidden=!islandMode;
if(islandMode) {
  document.title='珊瑚灣 · 立體海島預覽';
  document.querySelector('h1').innerHTML='珊瑚灣<span>CORALHAVEN</span>';
  document.querySelector('.eyebrow').innerHTML='<span class="sigil">✦</span> AGE OF PIRATES <span class="division">/</span> WORLD STUDY';
  document.querySelector('.intro').textContent='海岸聚落 · 環礁小島';
  document.querySelector('.overline').textContent='ISLAND / 001';
  document.querySelector('.manifest').setAttribute('aria-label','島嶼設計');
  document.querySelector('.manifest p').innerHTML='層疊岩台與燈塔<br>淺海珊瑚與島礁<br>立體海浪與岸沫';
  document.querySelector('#view .label').textContent='單獨看船';
  loading.textContent='正在準備海島…';
} else document.querySelector('#view .label').textContent='查看小島';
try {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x17454f);
  scene.fog = new THREE.FogExp2(0x17454f, islandMode?.007:.024);
  const camera = new THREE.PerspectiveCamera(islandMode?40:34, innerWidth / innerHeight, .1, 200);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = islandMode?1.08:1.25;
  document.querySelector('#viewer').appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', `${islandMode?'珊瑚灣海島':'暮潮號'} 3D 模型；按住左鍵拖曳旋轉，滾輪縮放`);
  renderer.domElement.tabIndex = 0;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(.35, 2.9, 0);
  controls.enableDamping = true;
  controls.dampingFactor = .07;
  controls.enablePan = false;
  controls.minDistance = islandMode?14:10;
  controls.maxDistance = islandMode?65:32;
  controls.minPolarAngle = .16;
  controls.maxPolarAngle = Math.PI * (islandMode?.46:.52);
  controls.rotateSpeed = .65;
  controls.zoomSpeed = .75;
  controls.autoRotateSpeed = .30; // One full orbit in approximately 200 seconds.
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: null };
  function home() {
    const scale = innerWidth / innerHeight < 1 ? 1.32 : 1;
    controls.target.set(islandMode?0:.35, islandMode?2.1:2.9, islandMode?.7:0);
    camera.position.set((islandMode?23:12.8) * scale, (islandMode?26:13.8) * scale, (islandMode?30:15.3) * scale);
    controls.update();
  }
  home();
  scene.add(new THREE.HemisphereLight(0xc4edf1, 0x786043, islandMode?1.55:2.2));
  const sun = new THREE.DirectionalLight(0xffe2ac, islandMode?3.1:3.8);
  sun.position.set(islandMode?-8:1, islandMode?25:12, islandMode?16:8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, islandMode?{left:-19,right:19,top:18,bottom:-18,near:.5,far:65}:{ left: -9, right: 9, top: 10, bottom: -8, near: .5, far: 36 });
  sun.shadow.normalBias = .04;
  sun.shadow.bias = -.00015;
  sun.shadow.radius = 3;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x94dfeb, 2.2);rim.position.set(-6,7,-7);scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffc483, .65);fill.position.set(7,3,-3);scene.add(fill);
  const { ship, sailGroup, cannons } = createShip();
  scene.add(ship);
  let islandWorld=null;
  if(islandMode) {
    islandWorld=createIsland();scene.add(islandWorld.island);
    ship.scale.setScalar(.56);ship.position.set(4.7,.32,8.7);ship.rotation.y=-.12;
    const floorGeo=new THREE.PlaneGeometry(140,140,80,80);floorGeo.rotateX(-Math.PI/2);
    const verts=floorGeo.attributes.position,colors=[];
    for(let i=0;i<verts.count;i++) {
      const r=Math.hypot(verts.getX(i),verts.getZ(i));
      verts.setY(i,-1.28-Math.max(0,r-12)*.38);
      const c=new THREE.Color(0xd7cb99).lerp(new THREE.Color(0x25646c),THREE.MathUtils.smoothstep(r,9,29));colors.push(c.r,c.g,c.b);
    }
    floorGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));floorGeo.computeVertexNormals();
    const floor=new THREE.Mesh(floorGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));floor.receiveShadow=true;scene.add(floor);
  }

  const ocean=islandMode?createOcean(islandWorld.reefGroups):null;
  if(ocean)scene.add(ocean.foam);
  // The separate ship inspection view retains its quiet studio water backdrop.
  const water = ocean?.surface ?? new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.ShaderMaterial({
    transparent:islandMode,depthWrite:!islandMode,
    uniforms: { time: { value: 0 }, island: { value: islandMode?1:0 } },
    vertexShader: `varying vec3 pos; void main(){ vec4 world=modelMatrix*vec4(position,1.);pos=world.xyz;gl_Position=projectionMatrix*viewMatrix*world; }`,
    fragmentShader: `varying vec3 pos; uniform float time; uniform float island;
      void main(){
        float d=length(pos.xz*.10);
        vec3 col=mix(vec3(.012,.095,.10),vec3(.007,.022,.028),smoothstep(.0,3.6,d));
        float wave=sin(pos.x*2.1+sin(pos.z*.9+time*.16)*1.8+time*.12)*sin(pos.z*2.2-pos.x*.45-time*.13);
        float glint=pow(max(wave,0.),18.)*.006;
        col+=glint*(1.-smoothstep(4.,18.,length(pos.xz)));
        float alpha=1.;
        if(island>.5){
          float radius=length(pos.xz);
          float deep=smoothstep(9.,28.,radius);
          col=mix(vec3(.012,.28,.26),vec3(.005,.065,.09),deep);
          float ripple=sin(pos.x*3.4+sin(pos.z*1.7+time*.4))*sin(pos.z*3.8+sin(pos.x*1.4-time*.35));
          col+=pow(max(ripple,0.),12.)*.035*(1.-deep);
          alpha=mix(.49,.94,deep);
        }
        gl_FragColor=vec4(col,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  water.rotation.x = islandMode?0:-Math.PI/2;water.position.y=islandMode?0:-1.09;scene.add(water);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.ShadowMaterial({opacity:.24}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=-1.075;shadow.receiveShadow=true;if(!islandMode)scene.add(shadow);
  // Very restrained water ripples and a compass-like exhibition ring.
  const ripples = new THREE.Group();if(!islandMode)scene.add(ripples);
  for(let i=0;i<3;i++) {
    const points=[];
    for(let j=0;j<=128;j++){const a=j/128*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*(4.7+i*.36),-1.062,Math.sin(a)*(2.2+i*.25)));}
    const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x8ac8bb,transparent:true,opacity:.085-i*.016}));ripples.add(l);
  }

  const rotateButton=document.querySelector('#rotate');
  const sailsButton=document.querySelector('#sails');
  const wavesButton=document.querySelector('#waves');
  wavesButton.addEventListener('click',()=>{
    if(!ocean)return;
    ocean.setEnabled(!ocean.enabled);
    wavesButton.setAttribute('aria-pressed',String(ocean.enabled));
    wavesButton.querySelector('.label').textContent=ocean.enabled?'海浪：開':'海浪：關';
  });
  const buttons=[...document.querySelectorAll('button')].filter(b=>!b.hidden&&!b.disabled);
  document.querySelector('#view').addEventListener('click',()=>{location.search=islandMode?'?view=ship':'?view=island';});
  let autoRotate=true, dragging=false, resumeAt=0, selected=0, mode='pointer';
  const select=(i) => { selected=(i+buttons.length)%buttons.length; buttons.forEach((b,k)=>b.classList.toggle('is-selected',mode!=='pointer'&&k===selected)); };
  function toggleRotation() {
    autoRotate=!autoRotate;
    rotateButton.setAttribute('aria-pressed',String(autoRotate));
    rotateButton.querySelector('.label').textContent=autoRotate?'暫停自轉':'開始自轉';
    rotateButton.querySelector('.icon').textContent=autoRotate?'Ⅱ':'▷';
  }
  rotateButton.addEventListener('click',toggleRotation);
  document.querySelector('#reset').addEventListener('click',()=>{home();resumeAt=performance.now()+1800;});
  sailsButton.addEventListener('click',()=>{
    sailGroup.visible=!sailGroup.visible;
    sailsButton.setAttribute('aria-pressed',String(sailGroup.visible));
    sailsButton.querySelector('.label').textContent=sailGroup.visible?'收起船帆':'展開船帆';
  });
  controls.addEventListener('start',()=>{dragging=true;mode='pointer';select(selected);});
  controls.addEventListener('end',()=>{dragging=false;resumeAt=performance.now()+2500;});
  document.addEventListener('pointerdown',()=>{mode='pointer';select(selected);});
  buttons.forEach((b,i)=>b.addEventListener('focus',()=>{if(mode==='keyboard')select(i);}));
  function orbit(dx,dy,zoom=0) {
    const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    spherical.theta-=dx;
    spherical.phi=THREE.MathUtils.clamp(spherical.phi+dy,controls.minPolarAngle,controls.maxPolarAngle);
    spherical.radius=THREE.MathUtils.clamp(spherical.radius+zoom,controls.minDistance,controls.maxDistance);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    resumeAt=performance.now()+2500;
  }
  document.addEventListener('keydown',e=>{
    mode='keyboard';
    if(e.code==='Tab') {select(selected);return;}
    if(e.code==='Space'&&e.target.tagName!=='BUTTON'){e.preventDefault();if(!e.repeat)toggleRotation();}
    if(e.code==='KeyR')home();
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)) {
      e.preventDefault();
      if(e.target.tagName==='BUTTON') {select(selected+(e.code==='ArrowLeft'||e.code==='ArrowUp'?-1:1));buttons[selected].focus();}
      else orbit(e.code==='ArrowLeft'?.065:e.code==='ArrowRight'?-.065:0,e.code==='ArrowUp'?-.055:e.code==='ArrowDown'?.055:0);
    }
  });
  let previousA=false,previousNav=0,nextNav=0;
  function gamepad(dt,now) {
    const pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);
    if(!pad){previousA=false;previousNav=0;return;}
    document.querySelector('#pad-hint').textContent='手把：左搖桿選單 · A 確認 · 右搖桿旋轉 · LT / RT 縮放';
    const axis=v=>Math.abs(v)>.22?v:0;
    const nav=axis(pad.axes[0])||axis(pad.axes[1]);
    const direction=Math.sign(nav);
    if(direction&&(direction!==previousNav||now>nextNav)) {
      mode='gamepad';select(selected+direction);nextNav=now+(direction!==previousNav?380:180);
    }
    previousNav=direction;
    const a=!!pad.buttons[0]?.pressed;
    if(a&&!previousA) {mode='gamepad';select(selected);buttons[selected].click();}
    previousA=a;
    const rx=axis(pad.axes[2]||0),ry=axis(pad.axes[3]||0);
    const zoom=(pad.buttons[6]?.value||0)-(pad.buttons[7]?.value||0);
    if(rx||ry||Math.abs(zoom)>.1) {mode='pointer';select(selected);orbit(-rx*dt*1.5,ry*dt*1.3,zoom*dt*6);}
  }
  let previous=performance.now(),elapsed=0,frameTotal=0,frameCount=0;
  renderer.setAnimationLoop(now=>{
    const rawDt=(now-previous)/1000;
    const dt=Math.min(rawDt,.05);previous=now;elapsed+=Math.min(rawDt,.1);
    gamepad(dt,now);
    controls.autoRotate=autoRotate&&!dragging&&now>resumeAt;
    controls.update(dt);
    if(ocean)ocean.update(elapsed,dt,ship);
    else water.material.uniforms.time.value=now/1000;
    islandWorld?.update(now/1000);
    renderer.render(scene,camera);
    // Read-only diagnostics for local verification; not a benchmark promise.
    frameTotal+=rawDt;frameCount++;
    if(frameTotal>=3){
      renderer.domElement.dataset.fps=(frameCount/frameTotal).toFixed(1);
      renderer.domElement.dataset.drawCalls=String(renderer.info.render.calls);
      renderer.domElement.dataset.triangles=String(renderer.info.render.triangles);
      renderer.domElement.dataset.boatHeight=ship.position.y.toFixed(4);
      renderer.domElement.dataset.waveTime=elapsed.toFixed(2);
      frameTotal=0;frameCount=0;
    }
  });
  window.addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  });
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();loading.hidden=false;loading.textContent='顯示連線中斷，請重新整理預覽。';});
  loading.hidden=true;
  window.shipPreview={scene,camera,controls,renderer,ship,sailGroup,cannons,getState:()=>({autoRotate,dragging,sailsVisible:sailGroup.visible,selected,mode,azimuth:controls.getAzimuthalAngle(),distance:controls.getDistance()})};
  window.islandPreview=islandWorld;
  window.oceanPreview=ocean;
} catch(error) {
  console.error(error);
  loading.textContent='無法啟動 3D 預覽，請確認瀏覽器的 WebGL 2 與硬體加速已啟用。';
}
