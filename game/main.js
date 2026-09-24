import {REGIONS,TERRAIN,START,ENCOUNTERS,LOOT,WHIRLPOOLS,regionAt,dockAt,whirlpoolForce,upgradeOffer,specialtyOffer} from './archipelago-data.js';
import {createTargetStreamer} from './target-stream.js';
import { createSailController } from './sail-rig.js';
import * as THREE from 'three';
import { createShip } from '../ship-preview/ship.js';
import { sampleBoatPose, sampleWaveHeight } from '../ship-preview/waves.js';
import { createWorld } from './world.js';
import { createTargetModel } from './models.js';
import { WEAPONS, WEAPON_IDS, normalizeLoadout, weaponForSide } from './weapons.js';
import { applyEdgeFog, batchStatic } from './optimization.js';
import { mountUpgradeUI } from './interface.js';
import { Sound, Effects, spawnChest } from './feedback.js';
import { targetExplosionSize } from './combat-explosions.js';
import { stepKrakenCombat, KRAKEN_MELEE } from './kraken-combat.js';
import { PLAYER, CANNON, ENEMY_CANNON, TARGET_DEFS, WORLD_RADIUS } from './constants.js';
import { clamp, damp, distance, forward, right, nearestSide, sideOf, createBoatState, stepBoat, createVolley, dueVolleyShots } from './physics.js';

mountUpgradeUI();
document.querySelector('#dock-panel h2').id='port-title';
document.querySelector('#dock-panel .shop-list').insertAdjacentHTML('beforeend','<button id="port-special"><span></span><small></small></button><button id="dock-port-weapon">左舷配裝</button><button id="dock-starboard-weapon">右舷配裝</button>');
document.querySelector('#pause-panel').insertAdjacentHTML('beforeend','<button id="open-chart">海域航海圖</button>');
document.querySelector('#screen').insertAdjacentHTML('beforeend','<section id="map-panel" class="panel hidden"><h2>A2 環狀峽灣</h2><canvas id="world-chart" width="460" height="460" aria-label="五區航海圖"></canvas><p class="menu-note">金點：港口　紅點：敵人　青點：魚群　紫圈：漩渦<br>選擇村莊設定航標，依小地圖指引航行。</p><div id="chart-ports"></div><button id="chart-back">返回航行</button></section>');
for(const r of REGIONS)document.querySelector('#chart-ports').insertAdjacentHTML('beforeend',`<button data-port="${r.id}">${r.village} · 區域等級 ${r.tier}</button>`);
document.querySelector('#start-panel .features').innerHTML='<span>五區無縫峽灣</span><span>30 組巡弋目標</span><span>五座村莊與特色武裝</span>';
document.querySelector('#start-panel .lead').textContent='穿越 A2 環狀峽灣，探訪五座村莊、打撈零件並改裝側舷武裝。';
document.querySelector('.mission-kicker').textContent='A2 環狀峽灣 / 五港遠航';
document.querySelector('#controls-hint').textContent='W/S 航行 · A/D 轉向 · 空白 開砲 · F 帆 · M 航海圖 · Enter 港口 | 手把 A 開砲 · Y 帆 · X 港口 · View 航海圖';
const domCache=new Map();
const $=selector=>{if(!domCache.has(selector))domCache.set(selector,document.querySelector(selector));return domCache.get(selector);};
const settingsKey='age-of-pirates-settings-v1',progressKey='age-of-pirates-progress-v1';
function readStore(key,fallback){try{return {...fallback,...JSON.parse(localStorage.getItem(key)||'{}')};}catch{return {...fallback};}}
const settings=readStore(settingsKey,{volume:.65,shake:true,rumble:true,guide:true,quality:'balanced',stats:false});
const loadout=normalizeLoadout(readStore('age-of-pirates-loadout-v1',{}));
const save=readStore(progressKey,{gold:0,hull:0,speed:0,cannon:0,parts:0,armory:{}});
for(const k of ['gold','hull','speed','cannon','parts'])save[k]=Math.max(0,Number(save[k])||0);
save.armory=save.armory&&typeof save.armory==='object'?save.armory:{};
let activePort=REGIONS[0],visited=new Set(),waypoint=null;const collectedLoot=new Set();
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.1,240);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.20;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','海戰紀元遊戲畫面');$('#scene').appendChild(renderer.domElement);
const world=createWorld(scene),sound=new Sound(),effects=new Effects(scene);
renderer.shadowMap.autoUpdate=false;
let shadowTimer=0,performanceTimer=0,smoothedFps=60;
let playerBatch={before:0,after:0};
sound.setVolume(settings.volume);
const shipParts=createShip(),playerModel=shipParts.ship;scene.add(playerModel);playerModel.scale.setScalar(.72);
const sailController=createSailController(shipParts);
let boat=createBoatState(START.x,START.z,START.yaw),phase='title',previous=performance.now(),visualTime=0,gameTime=0,uiTimer=0,toastUntil=0,hitFlash=0,shakeAmount=0,side=1,manualSide=0,manualUntil=0,volley=null,projectiles=[],chests=[],kills=0,collected=0,runGold=0;
let settingsFrom='pause';let previousButtons={},lastGamepadNav=0,nextGamepadNav=0,menuIndex=0,menuMode='pointer',rumbleUntil=0;
const keys=new Set(),targets=[];
for(const def of ENCOUNTERS){
 targets.push({...def,x:def.start[0],z:def.start[1],anchorX:def.start[0],anchorZ:def.start[1],yaw:0,health:def.hp,alive:true,model:{group:new THREE.Group(),loaded:false,animate(){}},baseScale:new THREE.Vector3(1,1,1),baseY:0,patrol:0,attackAt:3,damageFlash:0});
}
const targetStreamer=createTargetStreamer(scene,targets);
const guideGeo=new THREE.BufferGeometry(),guidePositions=new Float32Array(33*3);guideGeo.setAttribute('position',new THREE.BufferAttribute(guidePositions,3).setUsage(THREE.DynamicDrawUsage));
const guide=new THREE.Line(guideGeo,new THREE.LineBasicMaterial({color:0xffd9a0,transparent:true,opacity:.54,depthWrite:false,depthTest:false}));guide.frustumCulled=false;guide.renderOrder=10;scene.add(guide);
const marker=new THREE.Mesh(new THREE.RingGeometry(1.45,1.56,40),new THREE.MeshBasicMaterial({color:0xffd591,transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false}));marker.rotation.x=-Math.PI/2;marker.renderOrder=10;marker.visible=false;scene.add(marker);
const krakenWarning=new THREE.Mesh(new THREE.RingGeometry(2,KRAKEN_MELEE.reach,48,1,-KRAKEN_MELEE.halfAngle,KRAKEN_MELEE.halfAngle*2),new THREE.MeshBasicMaterial({color:0xff6644,transparent:true,opacity:.23,side:THREE.DoubleSide,depthWrite:false}));krakenWarning.rotation.x=-Math.PI/2;krakenWarning.visible=false;krakenWarning.renderOrder=8;scene.add(krakenWarning);
const cannonballGeo=new THREE.SphereGeometry(CANNON.radius,12,9),enemyBallGeo=new THREE.SphereGeometry(.23,10,8);
const playerBallMat=new THREE.MeshStandardMaterial({color:0x242d30,metalness:.48,roughness:.40,emissive:0x5b3820,emissiveIntensity:.18});
const enemyBallMat=new THREE.MeshStandardMaterial({color:0x724747,emissive:0xa83921,emissiveIntensity:.6,roughness:.45});
const minimap=$('#minimap'),mapContext=minimap.getContext('2d');
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function persist(){localStorage.setItem(progressKey,JSON.stringify(save));}
function persistSettings(){localStorage.setItem(settingsKey,JSON.stringify(settings));}
function notify(message,duration=2.4){$('#toast').textContent=message;$('#toast').style.opacity='1';toastUntil=visualTime+duration;}
function rumble(duration=110,strong=.35){if(!settings.rumble)return;const pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);if(pad?.vibrationActuator?.playEffect)pad.vibrationActuator.playEffect('dual-rumble',{duration,strongMagnitude:strong,weakMagnitude:strong*.65}).catch(()=>{});}
function openPanel(name){
  phase=name;$('#screen').classList.remove('hidden');
  for(const id of ['start','pause','settings','dock','result','loadout','map'])$(`#${id}-panel`).classList.toggle('hidden',id!==(name==='title'?'start':name));
  const hideHud=name==='title'||name==='loadout'||(name==='settings'&&settingsFrom==='title');
  $('#hud').classList.toggle('hidden',hideHud);
  for(const id of ['side-label','reload-panel','minimap','controls-hint'])$(`#${id}`).classList.toggle('hidden',hideHud);
  $('#dock-prompt').classList.add('hidden');
  $('#target-labels').classList.add('hidden');
  $('#boundary-warning').classList.add('hidden');
  keys.clear();menuIndex=0;selectMenu(0);
}
function closePanel(){phase='playing';$('#screen').classList.add('hidden');$('#hud').classList.remove('hidden');for(const id of ['side-label','reload-panel','minimap','controls-hint'])$(`#${id}`).classList.remove('hidden');renderer.domElement.focus();}
function menuItems(){const panel=$(`#${phase==='title'?'start':phase}-panel`);if(!panel)return[];return [...panel.querySelectorAll('button, .setting')].filter(el=>!el.disabled&&el.getClientRects().length>0);}
function selectMenu(index){const items=menuItems();if(!items.length)return;menuIndex=(index+items.length)%items.length;items.forEach((el,i)=>el.classList.toggle('is-selected',menuMode==='gamepad'&&i===menuIndex));if(menuMode==='gamepad'){const target=items[menuIndex];(target.tagName==='BUTTON'?target:target.querySelector('input'))?.focus({preventScroll:true});target.scrollIntoView({block:'nearest'});}}
function pointerMenu(){menuMode='pointer';menuItems().forEach(el=>el.classList.remove('is-selected'));}
function activateMenuItem(el){if(!el)return;if(el.classList.contains('setting')){const input=el.querySelector('input[type=checkbox]');input?.click();}else if(el.tagName==='BUTTON')el.click();}
function upgrades(){boat.maxHp=PLAYER.maxHp+save.hull*25;boat.speedBonus=save.speed*.08;boat.damageBonus=save.cannon*4;}
function resetVoyage(){
  effects.clear();targetStreamer.reset();visited=new Set();collectedLoot.clear();
  krakenWarning.visible=false;for(const target of targets)target.melee=null;
  while(projectiles.length)removeProjectile(projectiles.length-1);
  for(const chest of chests)disposeChest(chest);chests=[];
  boat=createBoatState(START.x,START.z,START.yaw);upgrades();boat.hp=boat.maxHp;
  playerModel.position.set(boat.x,.27,boat.z);playerModel.rotation.set(0,boat.yaw,0,'YXZ');sailController.update(1,0);
  kills=0;collected=0;runGold=0;gameTime=0;volley=null;manualSide=0;manualUntil=0;side=1;
  for(const target of targets){target.x=target.anchorX;target.z=target.anchorZ;target.health=target.hp;target.alive=true;target.damageFlash=0;target.attackAt=2+Math.random()*2;target.model.group.visible=true;target.model.group.scale.copy(target.baseScale);target.model.group.rotation.z=0;target.model.group.position.y=target.baseY;target.sinkAt=null;}
  closePanel();notify('出航！繞過島礁，將側舷對準目標。',3);
}
function start(){sound.unlock();sound.ui();resetVoyage();}
function pause(){if(phase!=='playing')return;openPanel('pause');sound.ui();}
function resume(){if(phase==='pause'||phase==='settings'||phase==='dock'||phase==='map'){sound.ui();closePanel();}}
function openSettings(){settingsFrom=phase;openPanel('settings');$('#volume').value=Math.round(settings.volume*100);$('#volume-output').textContent=`${Math.round(settings.volume*100)}%`;$('#shake').checked=settings.shake;$('#rumble').checked=settings.rumble;$('#guide').checked=settings.guide;}
function closeSettings(){openPanel(settingsFrom);}
function inDock(){return !!dockAt(boat.x,boat.z);}
function interact(){if(phase!=='playing')return;const port=dockAt(boat.x,boat.z);if(!port)return;activePort=port;visited.add(port.id);updateDock();openPanel('dock');sound.ui();}
function currentWeapon(chosenSide){const w=weaponForSide(loadout,chosenSide),level=Math.min(3,Math.max(0,Number(save.armory[w.id])||0));return {...w,damage:w.damage+level*3,speed:w.speed*(1+level*.04),reload:w.reload*(1-level*.045)};}
function updateDock(){
 $('#port-title').textContent=activePort.village+' · 船塢';
 $('#dock-panel .dock-desc').textContent=activePort.description+'。特色：'+activePort.special+'。左搖桿選項 / A 購買 / B 離港';
 $('#dock-money').textContent=`持有 ${save.gold} 金 · ${save.parts} 零件`;
 $('#buy-repair').disabled=save.gold<15||boat.hp>=boat.maxHp;
 for(const kind of ['hull','speed','cannon']){const offer=upgradeOffer(save,activePort,kind);$(`#${kind}-level`).textContent=`${save[kind]} / ${offer.cap}`;$(`#buy-${kind}`).disabled=!offer.available||save.gold<offer.cost||save.parts<offer.parts;$(`#buy-${kind} small`).textContent=`${offer.cost} 金 · ${offer.parts} 零件`;}
 const o=specialtyOffer(save,activePort);$('#port-special span').textContent=`${activePort.special} · 強化 ${o.level} / 3`;$('#port-special small').textContent=`${o.cost} 金 · ${o.parts} 零件（首次解鎖，之後提高傷害／彈速／填裝）`;$('#port-special').disabled=!o.available||save.gold<o.cost||save.parts<o.parts;
 $('#dock-port-weapon').textContent='左舷：'+WEAPONS[loadout.port].name+' › 切換';$('#dock-starboard-weapon').textContent='右舷：'+WEAPONS[loadout.starboard].name+' › 切換';
 if(phase==='dock')selectMenu(menuIndex);
}
function buy(kind){if(phase!=='dock')return;const offer=kind==='repair'?{cost:15,parts:0,available:boat.hp<boat.maxHp}:upgradeOffer(save,activePort,kind);if(!offer.available||save.gold<offer.cost||save.parts<offer.parts)return;
 if(kind==='repair')boat.hp=Math.min(boat.maxHp,boat.hp+60);else{save[kind]++;upgrades();if(kind==='hull')boat.hp+=25;}
 save.gold-=offer.cost;save.parts-=offer.parts;persist();updateDock();sound.chest();notify(kind==='repair'?'船體已修復':'船艦改裝完成');
}
function buySpecial(){if(phase!=='dock')return;const o=specialtyOffer(save,activePort);if(!o.available||save.gold<o.cost||save.parts<o.parts)return;save.gold-=o.cost;save.parts-=o.parts;save.armory[activePort.weapon]=o.level+1;persist();updateDock();updateLoadout();sound.chest();notify(activePort.special+'強化完成，可在配裝切換');}
function openChart(){if(phase!=='playing'&&phase!=='pause')return;openPanel('map');drawMinimap($('#world-chart'));}
function showResult(won){
  phase='result';$('#result-kicker').textContent=won?'VOYAGE COMPLETE':'SHIP LOST';$('#result-title').textContent=won?'航程完成':'暮潮號沉沒';
  $('#result-description').textContent=won?'五港海域探索完成。':'返回港口整備，帶著改裝再次出航。';
  $('#result-stats').innerHTML=`擊敗目標 ${kills} / ${ENCOUNTERS.length}<br>回收戰利品 ${collected}<br>本次獲得 ${runGold} 金<br>航行時間 ${Math.floor(gameTime/60)} 分 ${Math.floor(gameTime%60)} 秒`;
  openPanel('result');sound.tone(won?523:138,.7,.12,'sine',won?784:55);
}
function toggleSails(){if(phase!=='playing')return;boat.sails=!boat.sails;sound.sail();notify(boat.sails?'展帆中 · 航速提升':'收帆中 · 轉向與操控提升',1.5);}
function setManualSide(value){manualSide=value;manualUntil=gameTime+2.8;side=value;}
function attemptFire(){if(phase!=='playing')return;if(volley&&gameTime<volley.reloadUntil){notify('加農砲填裝中',.65);return;}
  volley=createVolley(gameTime,side,currentWeapon(side));rumble(90,.32);}
function projectile(owner,x,z,dx,dz,damage,speed,life,y,color='player'){
  const geometry=color==='player'?cannonballGeo:enemyBallGeo,material=color==='player'?playerBallMat:enemyBallMat;
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;scene.add(mesh);
  const trail=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,y,z),new THREE.Vector3(x,y,z)]),new THREE.LineBasicMaterial({color:owner==='player'?0xffca73:0xf26f54,transparent:true,opacity:.56}));scene.add(trail);
  projectiles.push({owner,mesh,trail,x,z,previousX:x,previousZ:z,dx,dz,damage,speed,life,age:0,startY:y});
}
function fireCannon(index,chosenSide){
  const gunX=[1.83,.72,-.42,-1.55][index]*.72,gunZ=chosenSide*1.53*.72;
  const f=forward(boat.yaw),r=right(boat.yaw);
  const x=boat.x+f.x*gunX+r.x*gunZ,z=boat.z+f.z*gunX+r.z*gunZ;
  const angle=boat.yaw+(chosenSide===1?-Math.PI/2:Math.PI/2),scatter=(index-1.5)*.008;
  const dx=Math.cos(angle+scatter),dz=-Math.sin(angle+scatter);
  const y=playerModel.position.y+1.68*.72;
  const weapon=volley.weapon;
  projectile('player',x,z,dx,dz,weapon.damage+boat.damageBonus,weapon.speed,weapon.life,y);
  const cannon=shipParts.cannons.find(c=>c.userData.side===chosenSide&&c.userData.index===index);
  if(cannon)cannon.userData.recoil=1;
  effects.burst(x,y,z,'muzzle',12);sound.cannon();shakeAmount=Math.max(shakeAmount,.18);rumble(80,.25);
}
function enemyShoot(target){
  if(target.type==='octopus')return;
  target.model.attack?.();
  const dx=boat.x-target.x,dz=boat.z-target.z,d=Math.hypot(dx,dz)||1,spread=(Math.random()-.5)*.12;
  const angle=Math.atan2(dz,dx)+spread;
  projectile('enemy',target.x,target.z,Math.cos(angle),Math.sin(angle),ENEMY_CANNON.damage,ENEMY_CANNON.speed,ENEMY_CANNON.life,.9,target.type);
  effects.burst(target.x,.8,target.z,'muzzle',9);sound.burst(.24,.07,130,950);
}

function damagePlayer(amount,x,z,y=.7,kind='cannon'){
  if(boat.invulnerable>0||phase!=='playing')return;
  boat.hp=Math.max(0,boat.hp-Math.max(1,amount-PLAYER.armor));
  boat.invulnerable=.34;hitFlash=.55;shakeAmount=.45;
  if(kind==='cannon')effects.explosion(x,y,z,'impact');sound.damage();rumble(220,.65);
  if(boat.hp<=0)showResult(false);
}
function damageTarget(target,amount,x,z,y=.65){
  if(!target.alive)return;
  target.health=Math.max(0,target.health-amount);target.damageFlash=.28;
  sound.hit();
  if(target.health>0){effects.explosion(x,y,z,'impact');return;}
  target.alive=false;target.sinkAt=gameTime;target.sinkY=target.model.group.position.y;
  if(!target.optional)kills++;
  const chest=spawnChest(scene,target.x,target.z,visualTime);
  chest.reward=target.reward;chest.optional=!!target.optional;chests.push(chest);
  const blast=targetExplosionSize(target.model.group);
  effects.explosion(blast.center.x,blast.center.y-1.3*blast.scale,blast.center.z,'kill',blast.scale);sound.kill();shakeAmount=Math.max(shakeAmount,.30);
  notify(`${target.name} 已擊敗！寶箱落海`,2.6);
}
function segmentDistance(px,pz,x1,z1,x2,z2){
  const dx=x2-x1,dz=z2-z1,len=dx*dx+dz*dz;
  const t=len?clamp(((px-x1)*dx+(pz-z1)*dz)/len,0,1):0;
  return Math.hypot(px-x1-dx*t,pz-z1-dz*t);
}
function removeProjectile(index){
  const p=projectiles[index];scene.remove(p.mesh,p.trail);p.trail.geometry.dispose();p.trail.material.dispose();projectiles.splice(index,1);
}
function updateProjectiles(dt){
  for(let i=projectiles.length-1;i>=0;i--){
    const p=projectiles[i];p.age+=dt;p.previousX=p.x;p.previousZ=p.z;p.x+=p.dx*p.speed*dt;p.z+=p.dz*p.speed*dt;
    const flight=p.age/p.life;p.mesh.position.set(p.x,p.startY+Math.sin(Math.min(1,flight)*Math.PI)*1.0-flight*.45,p.z);
    const array=p.trail.geometry.attributes.position.array;
    array[0]=p.previousX;array[1]=p.mesh.position.y+.05;array[2]=p.previousZ;array[3]=p.x;array[4]=p.mesh.position.y;array[5]=p.z;
    p.trail.geometry.attributes.position.needsUpdate=true;
    let hit=false;
    if(p.owner==='player'){
      for(const t of targets){if(!t.alive||!t.model.loaded)continue;
        if(segmentDistance(t.x,t.z,p.previousX,p.previousZ,p.x,p.z)<t.radius+CANNON.radius){damageTarget(t,p.damage,p.x,p.z,p.mesh.position.y);hit=true;break;}
      }
    }else if(segmentDistance(boat.x,boat.z,p.previousX,p.previousZ,p.x,p.z)<PLAYER.radius+.26){damagePlayer(p.damage,p.x,p.z,p.mesh.position.y);hit=true;}
    if(!hit&&TERRAIN.some(t=>p.mesh.position.y<t.h&&Math.hypot((p.x-t.x)/t.rx,(p.z-t.z)/t.rz)<1)){effects.explosion(p.x,p.mesh.position.y,p.z,'impact');hit=true;}
    if(!hit&&p.age>=p.life){effects.water.spawn(p.x,sampleWaveHeight(p.x,p.z,visualTime,1,true),p.z);sound.burst(.32,.055,180,1600);hit=true;}
    if(!hit&&Math.hypot(p.x,p.z)>WORLD_RADIUS+10)hit=true;
    if(hit)removeProjectile(i);
  }
}
function updateTargets(dt){
  krakenWarning.visible=false;
  for(const t of targets){
    if(!t.model.loaded)continue;
    if(!t.alive){const progress=clamp((gameTime-t.sinkAt)/1.1,0,1);t.model.group.position.y=t.sinkY-progress*progress*2.4;t.model.group.rotation.z=progress*.32;t.model.group.scale.copy(t.baseScale).multiplyScalar(1-progress*.45);t.model.group.visible=progress<1;continue;}
    if(t.type==='structure')continue;
    const dx=boat.x-t.x,dz=boat.z-t.z,dist=Math.hypot(dx,dz);
    const melee=t.type==='octopus'?stepKrakenCombat(t,boat,gameTime):null;
    if(melee?.started){notify('克拉肯抬起觸手！駛離紅色揮擊區域',1.6);sound.burst(.38,.08,90,450);}
    if(melee?.strike&&!inDock()){
      const fx=melee.hit?boat.x:t.x+Math.cos(t.melee.heading)*8,fz=melee.hit?boat.z:t.z-Math.sin(t.melee.heading)*8;
      effects.water.spawn(fx,sampleWaveHeight(fx,fz,visualTime,1,true),fz);sound.burst(.40,.13,80,1000);
      if(melee.hit){damagePlayer(KRAKEN_MELEE.damage,boat.x,boat.z,.8,'tentacle');shakeAmount=Math.max(shakeAmount,.55);}
    }
    let desired;
    if(melee&&(melee.engaged||melee.locked))desired=melee.heading;
    else if(t.type!=='octopus'&&t.hostile&&dist<29){const radial=clamp((dist-12)/7,-1,1);desired=Math.atan2(-(dz*radial+dx*.8),dx*radial-dz*.8);}
    else if(t.fleeing&&dist<24)desired=Math.atan2(dz,-dx);
    else{
      t.patrol+=dt*(.12+(t.type==='school'?.11:0));
      const px=t.anchorX+Math.cos(t.patrol)*8,pz=t.anchorZ+Math.sin(t.patrol)*6;
      desired=Math.atan2(-(pz-t.z),px-t.x);
    }
    const turn=melee?.locked?0:clamp(angleDelta(desired,t.yaw),-dt*(t.fleeing?1.9:1.1),dt*(t.fleeing?1.9:1.1));t.yaw+=turn;
    const speed=melee&&(melee.engaged||melee.locked)?melee.speed:t.speed*(t.hostile&&dist<7?.48:1),step=speed*dt;
    const nx=t.x+Math.cos(t.yaw)*step,nz=t.z-Math.sin(t.yaw)*step;
    let blocked=Math.hypot(nx,nz)>WORLD_RADIUS-5;
    for(const o of world.obstacles){const rx=o.rx+t.radius*.55,rz=o.rz+t.radius*.55;if(((nx-o.x)/rx)**2+((nz-o.z)/rz)**2<1){blocked=true;break;}}
    if(blocked&&!melee?.locked)t.yaw+=Math.PI*.65*dt;else if(!blocked){t.x=nx;t.z=nz;}
    const separation=t.radius+PLAYER.radius+.5,overlap=Math.hypot(t.x-boat.x,t.z-boat.z);
    if(overlap<separation){const outward=overlap>.001?{x:(t.x-boat.x)/overlap,z:(t.z-boat.z)/overlap}:right(boat.yaw);t.x=boat.x+outward.x*separation;t.z=boat.z+outward.z*separation;}
    t.model.group.position.y=0;
    t.model.animate(visualTime+t.patrol*.3,melee?.age);
    const bob=t.model.group.position.y;
    t.model.group.position.set(t.x,(t.type==='submarine'?-.42:t.type==='shark'?-.35:.18)+bob,t.z);
    t.model.group.rotation.y=t.yaw;
    if(t.type!=='octopus'&&t.hostile&&!inDock()&&dist<22&&gameTime>=t.attackAt&&phase==='playing'){
      enemyShoot(t);t.attackAt=gameTime+ENEMY_CANNON.reload+Math.random()*.9;
    }
    t.damageFlash=Math.max(0,t.damageFlash-dt);
    t.model.group.scale.copy(t.baseScale).multiplyScalar(1+Math.sin(t.damageFlash/.28*Math.PI)*.06);
    if(t.model.waterline!=null)t.model.group.position.y=sampleWaveHeight(t.x,t.z,visualTime,1,true)-t.model.waterline*t.model.group.scale.y;
    if(melee?.warning){krakenWarning.visible=true;krakenWarning.position.set(t.x,sampleWaveHeight(t.x,t.z,visualTime,1,true)+.15,t.z);krakenWarning.rotation.z=t.melee.heading;krakenWarning.material.opacity=.14+.14*Math.min(1,melee.age/KRAKEN_MELEE.windup);}
  }
}
function updateChests(dt){
  for(const loot of LOOT){
    if(collectedLoot.has(loot.id)||chests.some(c=>c.lootId===loot.id)||Math.hypot(boat.x-loot.x,boat.z-loot.z)>58)continue;
    const chest=spawnChest(scene,loot.x,loot.z,visualTime);chest.lootId=loot.id;chest.kind=loot.kind;chest.reward=loot.amount;chest.optional=true;
    if(loot.kind==='parts')chest.group.traverse(o=>{if(o.isMesh&&o.material.transparent){o.material.color.setHex(0x4bf7d6);o.material.opacity=.32;}});
    chests.push(chest);break;
  }
  for(let i=chests.length-1;i>=0;i--){
    const c=chests[i];if(c.lootId&&Math.hypot(boat.x-c.x,boat.z-c.z)>88){disposeChest(c);chests.splice(i,1);continue;}c.update(visualTime);
    const d=Math.hypot(boat.x-c.x,boat.z-c.z);
    if(d<5&&visualTime-c.born>.65){const pull=Math.min(1,dt*4);c.x+=(boat.x-c.x)*pull;c.z+=(boat.z-c.z)*pull;c.group.position.x=c.x;c.group.position.z=c.z;}
    if(d>2.05||visualTime-c.born<.7)continue;
    disposeChest(c);chests.splice(i,1);
    if(c.lootId)collectedLoot.add(c.lootId);if(c.kind==='parts')save.parts+=c.reward;else{save.gold+=c.reward;runGold+=c.reward;}if(!c.optional)collected++;
    boat.hp=Math.min(boat.maxHp,boat.hp+8);persist();
    effects.burst(c.x,.7,c.z,'treasure',28);sound.chest();notify(`獲得 ${c.reward} ${c.kind==='parts'?'零件':'金'} · 船體修復 8`);
    if(kills===ENCOUNTERS.length)notify('全海域威脅清除！可繼續探索或返回村莊整備。',4);
  }
}
function updateGuide(){
  const near=nearestSide(boat,targets);
  if(gameTime>=manualUntil){side=near.side;manualSide=0;}
  const r=right(boat.yaw),f=forward(boat.yaw),baseX=boat.x+r.x*side*1.45,baseZ=boat.z+r.z*side*1.45;
  const positions=guide.geometry.attributes.position;
  for(let i=0;i<33;i++){
    const t=i/32,weapon=currentWeapon(side),d=2+t*(weapon.speed*weapon.life-2);
    const x=baseX+r.x*side*d+f.x*(t*t*.36),z=baseZ+r.z*side*d+f.z*(t*t*.36);
    positions.setXYZ(i,x,.72+Math.sin(t*Math.PI)*.22+sampleWaveHeight(x,z,visualTime,1,true),z);
  }
  positions.needsUpdate=true;guide.visible=phase==='playing'&&settings.guide;
  marker.visible=phase==='playing'&&!!near.target&&near.distance<34;
  if(marker.visible){marker.position.set(near.target.x,.11,near.target.z);marker.material.opacity=.32+Math.sin(visualTime*4)*.12;}
  return near;
}
function drawMinimap(canvas=minimap){
 const c=canvas.getContext('2d'),w=canvas.width,m=w/2,scale=(m-10)/210;c.clearRect(0,0,w,w);c.save();c.beginPath();c.arc(m,m,m-2,0,Math.PI*2);c.clip();c.fillStyle='#145a68';c.fillRect(0,0,w,w);
 for(const o of world.obstacles){c.fillStyle='#9caf8a';c.beginPath();c.ellipse(m+o.x*scale,m+o.z*scale,o.rx*scale,o.rz*scale,0,0,Math.PI*2);c.fill();}
 for(const r of REGIONS){c.fillStyle=visited.has(r.id)?'#80efbc':'#ffd782';c.beginPath();c.arc(m+r.dock.x*scale,m+r.dock.z*scale,4,0,Math.PI*2);c.fill();if(w>200){c.font='12px system-ui';c.fillStyle='white';c.fillText(r.village,m+r.dock.x*scale+6,m+r.dock.z*scale);}}
 for(const v of WHIRLPOOLS){c.strokeStyle='#ca9af6';c.beginPath();c.arc(m+v.x*scale,m+v.z*scale,v.radius*scale,0,Math.PI*2);c.stroke();}
 for(const t of targets){if(!t.alive)continue;c.fillStyle=t.hostile?'#ef795f':'#a5e6bf';c.beginPath();c.arc(m+t.x*scale,m+t.z*scale,2,0,Math.PI*2);c.fill();}
 for(const l of LOOT){if(collectedLoot.has(l.id))continue;c.fillStyle=l.kind==='parts'?'#6ffff1':'#ffd782';c.fillRect(m+l.x*scale-1,m+l.z*scale-1,2,2);}
 if(waypoint){c.strokeStyle='#ffe59b';c.setLineDash([3,4]);c.beginPath();c.moveTo(m+boat.x*scale,m+boat.z*scale);c.lineTo(m+waypoint.dock.x*scale,m+waypoint.dock.z*scale);c.stroke();c.setLineDash([]);}
 c.translate(m+boat.x*scale,m+boat.z*scale);c.rotate(-boat.yaw);c.fillStyle='white';c.beginPath();c.moveTo(6,0);c.lineTo(-4,-4);c.lineTo(-2,0);c.lineTo(-4,4);c.closePath();c.fill();c.restore();
}
function updateUi(near){
  $('#hp-text').textContent=`${Math.ceil(boat.hp)} / ${boat.maxHp}`;$('#hp-fill').style.width=`${boat.hp/boat.maxHp*100}%`;
  $('#sail-status').textContent=boat.sailDeployment>0&&boat.sailDeployment<1?(boat.sails?'⛵ 展帆中':'⚓ 收帆中'):(boat.sails?'⛵ 張帆 · 高速':'⚓ 收帆 · 靈巧');$('#speed-status').textContent=`${Math.abs(boat.speed).toFixed(1)} 節`;
  $('#gold-status').textContent=`☼ ${save.gold}`;$('#progress').textContent=`${kills} / ${ENCOUNTERS.length} 目標 · ${visited.size} / 5 村莊 · ${save.parts} 零件`;
  $('#objective').textContent=regionAt(boat.x,boat.z).name+(waypoint?' → '+waypoint.village:' · 探索五港');
  const port=dockAt(boat.x,boat.z);$('#dock-prompt').textContent=port?port.village+' · X / Enter 整備':'港口整備';
  $('#nearest').textContent=near.target?`最近目標：${near.target.name} · ${Math.round(near.distance)} m`:'尋找海域目標';
  $('#side-name').textContent=side===1?'右舷':'左舷';$('#side-symbol').textContent=side===1?'▶':'◀';$('#side-mode').textContent=manualSide?'手動選側':'自動選側';
  const elapsed=volley?gameTime-volley.finishedAt:0,ready=!volley||gameTime>=volley.reloadUntil;
  $('#reload-text').textContent=ready?'準備開火':volley.shotsFired<4?`${volley.shotsFired} / 4 發射中`:`填裝 ${Math.max(0,volley.reloadUntil-gameTime).toFixed(1)}s`;
  $('#reload-fill').style.width=`${ready?100:volley.shotsFired<4?volley.shotsFired*25:clamp(elapsed/volley.weapon.reload*100,0,100)}%`;
  $('#gun-state').textContent=ready?`${currentWeapon(side).name} · 四門就緒`:volley.shotsFired<4?'依序發射 · 每門間隔 0.3 秒':`${volley.weapon.name} · 填裝中`;
  $('#dock-prompt').classList.toggle('hidden',phase!=='playing'||!inDock());
  $('#hurt').style.opacity=String(hitFlash*.40);
  if(visualTime>toastUntil)$('#toast').style.opacity='0';
  drawMinimap();
  updateTargetLabels();
  const insideVortex=WHIRLPOOLS.some(v=>Math.hypot(boat.x-v.x,boat.z-v.z)<v.radius);
  if(insideVortex){$('#nearest').textContent='漩渦吸引中！張帆並朝外持續加速';}
  $('#boundary-warning').classList.toggle('hidden',phase!=='playing'||Math.hypot(boat.x,boat.z)<188);
}
function updateCamera(dt){
  const f=forward(boat.yaw),look=new THREE.Vector3(boat.x+f.x*3,0,boat.z+f.z*3);
  const desired=new THREE.Vector3(boat.x+23,34,boat.z+27);
  const factor=1-Math.exp(-2.1*dt);camera.position.lerp(desired,factor);
  if(settings.shake&&shakeAmount>.001){camera.position.x+=(Math.random()-.5)*shakeAmount;camera.position.y+=(Math.random()-.5)*shakeAmount*.7;}
  camera.lookAt(look);shakeAmount*=Math.exp(-8*dt);
}
function updatePlayerVisual(){
  sailController.update(boat.sailDeployment,gameTime);
  const pose=sampleBoatPose(boat.x,boat.z,boat.yaw,visualTime,1,true);
  playerModel.position.set(boat.x,.36+pose.height,boat.z);
  playerModel.rotation.order='YXZ';playerModel.rotation.y=boat.yaw;
  playerModel.rotation.x=clamp(pose.pitch,-.10,.10)+Math.sin(visualTime*1.8)*.008;
  playerModel.rotation.z=clamp(pose.roll,-.12,.12);
}
function inputVector(pad){
  const dead=v=>Math.abs(v)<.13?0:Math.sign(v)*(Math.abs(v)-.13)/.87;
  if(pad){return {steer:clamp(dead(pad.axes[0]||0)+(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),-1,1),throttle:clamp(-dead(pad.axes[1]||0)+(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),-1,1)};}
  return {steer:(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),throttle:(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)};
}
function disposeChest(chest){
  scene.remove(chest.group);
  chest.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(o.material.transparent)o.material.dispose();}});
}
function updateLoadout(){
  for(const key of ['port','starboard']){
    const weapon=currentWeapon(key==='port'?-1:1);
    $(`#weapon-${key}`).innerHTML=`${weapon.name}<small>四門一組 · 點擊切換下一款</small>`;
    $(`#${key}-description`).textContent=weapon.description;
    $(`#${key}-stats`).innerHTML=`<div><span>每發傷害</span><strong>${weapon.damage+save.cannon*4}</strong></div><div><span>砲彈速度</span><strong>${weapon.speed} m/s</strong></div><div><span>有效射程</span><strong>${(weapon.speed*weapon.life).toFixed(1)} m</strong></div><div><span>填裝時間</span><strong>${weapon.reload.toFixed(1)} 秒</strong></div>`;
  }
  $('#loadout-summary').textContent=`左舷：${WEAPONS[loadout.port].name}　／　右舷：${WEAPONS[loadout.starboard].name}`;
  const portColor=WEAPONS[loadout.port].color.toString(16).padStart(6,'0'),starboardColor=WEAPONS[loadout.starboard].color.toString(16).padStart(6,'0');
  document.querySelectorAll('.plan-hull i').forEach(bar=>bar.style.background=`linear-gradient(90deg,#${portColor} 0 19%,transparent 20% 80%,#${starboardColor} 81%)`);
  for(const cannon of shipParts.cannons)cannon.traverse(o=>{if(o.userData.weaponBarrel)o.material.color.setHex(weaponForSide(loadout,cannon.userData.side).color);});
}
function cycleWeapon(key){
  const ids=WEAPON_IDS.filter(id=>['standard','long','heavy'].includes(id)||save.armory[id]>0);
  loadout[key]=ids[(ids.indexOf(loadout[key])+1)%ids.length];
  localStorage.setItem('age-of-pirates-loadout-v1',JSON.stringify(loadout));updateLoadout();if(phase==='dock')updateDock();sound.ui();
}
function applyQuality(){
  const presets={low:{name:'效能優先',ratio:1,shadow:512},balanced:{name:'平衡',ratio:1.25,shadow:1024},high:{name:'高畫質',ratio:1.5,shadow:2048}};
  if(!presets[settings.quality])settings.quality='balanced';
  const preset=presets[settings.quality];
  renderer.setPixelRatio(Math.min(devicePixelRatio,preset.ratio));renderer.shadowMap.enabled=settings.quality!=='low';
  if(world.sun.shadow.mapSize.x!==preset.shadow){world.sun.shadow.map?.dispose();world.sun.shadow.map=null;world.sun.shadow.mapSize.set(preset.shadow,preset.shadow);}
  renderer.shadowMap.needsUpdate=true;
  $('#quality-button').textContent=`畫質：${preset.name}　› 點擊切換`;
  $('#batch-budget').textContent=`靜態場景：${world.batching.before} → ${world.batching.after} 個網格；船體：${playerBatch.before} → ${playerBatch.after} 個。效能優先會關閉即時陰影。`;
  $('#stats').checked=settings.stats;
}
const labelPosition=new THREE.Vector3();
function updateTargetLabels(){
  $('#target-labels').classList.toggle('hidden',phase!=='playing');
  for(const target of targets){
    if(!target.model.loaded){target.label.hidden=true;continue;}
    labelPosition.set(target.x,target.type==='ship'?5.5:3.4,target.z).project(camera);
    const px=(labelPosition.x*.5+.5)*innerWidth,py=(-labelPosition.y*.5+.5)*innerHeight;
    const underHud=(py>innerHeight-215&&(Math.abs(px-innerWidth/2)<190||px>innerWidth-215))||(py<185&&px<310)||(py<145&&px>innerWidth-310);
    const visible=target.alive&&!underHud&&distance(boat,target)<38&&Math.abs(labelPosition.x)<.96&&Math.abs(labelPosition.y)<.78&&Math.abs(labelPosition.z)<1;
    target.label.hidden=!visible;if(!visible)continue;
    target.label.style.transform=`translate(${(labelPosition.x*.5+.5)*innerWidth}px,${(-labelPosition.y*.5+.5)*innerHeight}px)`;
    target.label.classList.toggle('hit',target.damageFlash>0);target.healthFill.style.transform=`scaleX(${target.health/target.hp})`;
    target.healthText.textContent=`${Math.ceil(target.health)} / ${target.hp}`;
  }
}
function gamepadUpdate(){
  const pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);
  if(!pad){previousButtons={};return null;}
  const pressed=index=>!!pad.buttons[index]?.pressed;
  const edge=index=>pressed(index)&&!previousButtons[index];
  if(phase==='playing'){
    if((pad.axes[2]||0)>.45)setManualSide(1);else if((pad.axes[2]||0)<-.45)setManualSide(-1);
    if(edge(8))openChart();if(edge(0))attemptFire();if(edge(3))toggleSails();if(edge(9))pause();if(edge(2))interact();
  }else{
    const up=(pad.axes[1]||0)<-.55||pressed(12)||((phase==='loadout'||phase==='map')&&((pad.axes[0]||0)<-.55||pressed(14))),down=(pad.axes[1]||0)>.55||pressed(13)||(phase==='loadout'&&((pad.axes[0]||0)>.55||pressed(15)));
    if((up||down)&&visualTime>nextGamepadNav){menuMode='gamepad';selectMenu(menuIndex+(down?1:-1));nextGamepadNav=visualTime+.19;}
    if(!up&&!down)nextGamepadNav=0;
    if(edge(0))activateMenuItem(menuItems()[menuIndex]);
    if(edge(1)||edge(9)){if(phase==='pause')resume();else if(phase==='settings')closeSettings();else if(phase==='dock'||phase==='map')closePanel();else if(phase==='loadout')openPanel('title');}
    const selected=menuItems()[menuIndex];if(selected?.querySelector('input[type=range]')){
      const axis=pad.axes[0]||0;if(Math.abs(axis)>.45&&visualTime>lastGamepadNav){const input=selected.querySelector('input');input.value=clamp(Number(input.value)+Math.sign(axis)*5,0,100);input.dispatchEvent(new Event('input'));input.blur();selected.classList.remove('is-selected');lastGamepadNav=visualTime+.12;}
    }
  }
  previousButtons=Object.fromEntries(pad.buttons.map((_,i)=>[i,pressed(i)]));return pad;
}
function frame(now){
  const actualDt=Math.max(.001,(now-previous)/1000),dt=Math.min(.05,actualDt);previous=now;visualTime+=dt;
  smoothedFps=damp(smoothedFps,1/actualDt,2,dt);
  const pad=gamepadUpdate();
  if(phase==='playing'){
    gameTime+=dt;targetStreamer.update(boat);stepBoat(boat,inputVector(pad),dt,world.obstacles);
    let vortexDamage=0;for(const v of WHIRLPOOLS)vortexDamage+=whirlpoolForce(boat,v,dt);if(vortexDamage>0){boat.hp=Math.max(0,boat.hp-vortexDamage);hitFlash=Math.max(hitFlash,.15);if(boat.hp<=0)showResult(false);}
    updateTargets(dt);
    for(const index of dueVolleyShots(volley,gameTime))fireCannon(index,volley.side);
    updateProjectiles(dt);updateChests(dt);hitFlash=Math.max(0,hitFlash-dt);
    const near=updateGuide();uiTimer-=dt;if(uiTimer<=0){updateUi(near);uiTimer=.08;}
  }else{guide.visible=false;marker.visible=false;}
  world.update(visualTime,dt,boat);updatePlayerVisual();updateCamera(dt);effects.update(phase==='playing'?dt:0,camera);
  world.occlusion.update(camera,renderer,playerModel.position,dt);
  for(const cannon of shipParts.cannons){cannon.userData.recoil=Math.max(0,(cannon.userData.recoil||0)-dt*4);cannon.position.z=-cannon.userData.side*Math.sin(cannon.userData.recoil*Math.PI*.5)*.13;}
  shadowTimer-=dt;if(shadowTimer<=0){renderer.shadowMap.needsUpdate=true;shadowTimer=settings.quality==='high'?.033:.10;}
  renderer.render(scene,camera);requestAnimationFrame(frame);
  performanceTimer-=dt;if(performanceTimer<=0){performanceTimer=.5;$('#performance').textContent=`${Math.round(smoothedFps)} FPS · 區塊 ${world.stats().loaded}/5 · 近敵 ${targetStreamer.count()} · ${renderer.info.render.calls} draws · ${Math.round(renderer.info.render.triangles/1000)}k 三角形`;$('#performance').classList.toggle('hidden',!settings.stats);}
}

$('#port-special').addEventListener('click',buySpecial);
$('#dock-port-weapon').addEventListener('click',()=>cycleWeapon('port'));$('#dock-starboard-weapon').addEventListener('click',()=>cycleWeapon('starboard'));
$('#open-chart').addEventListener('click',openChart);$('#chart-back').addEventListener('click',closePanel);
for(const button of document.querySelectorAll('[data-port]'))button.addEventListener('click',()=>{waypoint=REGIONS.find(r=>r.id===button.dataset.port);closePanel();notify('航標：'+waypoint.village);});
$('#start-button').addEventListener('click',start);
$('#loadout-button').addEventListener('click',()=>{updateLoadout();openPanel('loadout');});
$('#loadout-back').addEventListener('click',()=>openPanel('title'));
$('#title-settings').addEventListener('click',openSettings);
for(const key of ['port','starboard'])$(`#weapon-${key}`).addEventListener('click',()=>cycleWeapon(key));
for(const id of ['return-title','result-title-button'])$(`#${id}`).addEventListener('click',()=>{updateLoadout();openPanel('title');});
$('#quality-button').addEventListener('click',()=>{const modes=['balanced','high','low'];settings.quality=modes[(modes.indexOf(settings.quality)+1)%modes.length];applyQuality();persistSettings();});
$('#stats').addEventListener('change',event=>{settings.stats=event.target.checked;persistSettings();});
$('#resume-button').addEventListener('click',resume);
$('#settings-button').addEventListener('click',openSettings);
$('#restart-button').addEventListener('click',start);
$('#settings-back').addEventListener('click',closeSettings);
$('#dock-back').addEventListener('click',resume);
$('#result-restart').addEventListener('click',start);
$('#dock-prompt').addEventListener('click',interact);
for(const button of document.querySelectorAll('[data-buy]'))button.addEventListener('click',()=>buy(button.dataset.buy));
$('#volume').addEventListener('input',event=>{settings.volume=Number(event.target.value)/100;$('#volume-output').textContent=`${event.target.value}%`;sound.setVolume(settings.volume);persistSettings();});
for(const id of ['shake','rumble','guide'])$(`#${id}`).addEventListener('change',event=>{settings[id]=event.target.checked;persistSettings();});
window.addEventListener('keydown',event=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)||(phase==='playing'&&event.code==='Enter'))event.preventDefault();
  if(phase==='playing'){
    if(event.code==='KeyM'&&!event.repeat)openChart();else if(event.code==='Escape')pause();else if(event.code==='KeyF'&&!event.repeat)toggleSails();
    else if(event.code==='KeyQ')setManualSide(-1);else if(event.code==='KeyE')setManualSide(1);
    else if(event.code==='Space'&&!event.repeat)attemptFire();else if(event.code==='Enter')interact();
  }else if(event.code==='Escape'){if(phase==='settings')closeSettings();else if(phase==='pause'||phase==='dock'||phase==='map')closePanel();else if(phase==='loadout')openPanel('title');}
  else if(['ArrowDown','ArrowUp'].includes(event.code)||(phase==='loadout'&&['ArrowLeft','ArrowRight'].includes(event.code))){menuMode='gamepad';selectMenu(menuIndex+(['ArrowDown','ArrowRight'].includes(event.code)?1:-1));}
  else if(event.code==='Space'&&!event.repeat)activateMenuItem(event.target.closest?.('button,.setting')||menuItems()[menuIndex]);
  keys.add(event.code);
});
window.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',()=>{keys.clear();if(phase==='playing')pause();sound.setMuted(true);});
window.addEventListener('focus',()=>{previous=performance.now();sound.setMuted(false);});
renderer.domElement.addEventListener('pointerdown',event=>{if(phase==='playing'&&event.button===0)attemptFire();});
renderer.domElement.addEventListener('contextmenu',event=>event.preventDefault());
$('#screen').addEventListener('pointermove',pointerMenu);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);applyQuality();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();if(phase==='playing')pause();sound.setMuted(true);}else{previous=performance.now();sound.setMuted(false);}});
window.gameDebug=()=>({phase,x:boat.x,z:boat.z,yaw:boat.yaw,speed:boat.speed,hp:boat.hp,sails:boat.sails,sailDeployment:boat.sailDeployment,side,shots:volley?.shotsFired||0,reloadUntil:volley?.reloadUntil||0,time:gameTime,kills,collected,chests:chests.length,targets:targets.map(t=>({id:t.id,x:t.x,z:t.z,hp:t.health,alive:t.alive}))});
shipParts.sailGroup.userData.dynamic=true;
for(const cannon of shipParts.cannons){cannon.userData.dynamic=true;cannon.traverse(o=>{if(o.userData.weaponBarrel)o.material=o.material.clone();});}
playerBatch=batchStatic(playerModel);
for(const target of targets){
  target.baseScale=target.model.group.scale.clone();target.baseY=target.model.group.position.y;
  const label=document.createElement('div');label.className='target-label';label.hidden=true;
  label.innerHTML='<span></span><div class="health-track"><i></i></div><small></small>';
  label.querySelector('span').textContent=target.name;target.label=label;target.healthFill=label.querySelector('i');target.healthText=label.querySelector('small');$('#target-labels').appendChild(label);
}
applyQuality();updateLoadout();
openPanel('title');playerModel.position.set(boat.x,.38,boat.z);camera.position.set(boat.x+16,24,boat.z+19);requestAnimationFrame(frame);
