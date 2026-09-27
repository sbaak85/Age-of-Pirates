import * as T from 'three';
import {createFjordIslandStudy} from './fjord-island-study.js';
import {createFjordIslandHarbor,ISLAND_STATUE_POSITION} from './fjord-island-harbor.js';
import {createFjordIslandCastle} from './fjord-island-castle.js';
import {buildFjordIslandWalkways} from './fjord-island-walkways.js';
import {createFjordIslandVillage} from './fjord-island-village.js';
import {createGrandGate} from './fjord-grand-gate.js';
import {createPoseidon6K} from './poseidon-form-6k.js';
import {FJORD_ISLAND,FJORD_ISLAND_CENTER} from './fjord-island-placement.js';
import {batchStatic} from './optimization.js';

// The preview and playable map assemble the same authored parts. Preview-only
// plot outlines and water planes deliberately stay in the study page.
export function createFjordIslandWorld(){
 const build=buildFjordIslandWorld();let step;
 do{step=build.next();}while(!step.done);
 return step.value;
}
export function* buildFjordIslandWorld(){
 const root=new T.Group();root.name='蒼壁峽灣・主專案島嶼';
 const terrain=createFjordIslandStudy();root.add(terrain.group);yield;
 const harbor=createFjordIslandHarbor();root.add(harbor);yield;
 const castle=createFjordIslandCastle();root.add(castle);yield;
 const walkways=yield* buildFjordIslandWalkways(terrain.land);root.add(walkways);
 const village=createFjordIslandVillage(terrain.land,terrain.sideIsland);root.add(village.root);yield;
 const gate=createGrandGate();gate.name='蒼壁峽灣・海上拱門';gate.position.set(0,.6,61);root.add(gate);
 const statueIslet=new T.Group();statueIslet.name='波賽頓雕像與礁台';statueIslet.position.set(ISLAND_STATUE_POSITION.x,0,ISLAND_STATUE_POSITION.z);root.add(statueIslet);
 const stone=new T.MeshStandardMaterial({color:0x97a4a2,roughness:1});
 const pale=new T.MeshStandardMaterial({color:0xd7d2bb,roughness:1});
 const plinth=new T.Mesh(new T.CylinderGeometry(5.1,5.8,3.3,20),stone);plinth.name='海神礁台';plinth.position.y=1.58;plinth.castShadow=plinth.receiveShadow=true;statueIslet.add(plinth);
 const rim=new T.Mesh(new T.CylinderGeometry(4.9,5.1,.4,20),pale);rim.name='海神礁台頂環';rim.position.y=3.44;rim.castShadow=true;statueIslet.add(rim);
 const statue=createPoseidon6K();statue.name='波賽頓雕像';statue.scale.setScalar(1.25);statue.position.y=3.64;statueIslet.add(statue);
 // The residential district is thousands of tiny static meshes. Preserve
 // instanced stair treads while consolidating the fixed architecture.
 for(const part of[harbor,castle,village.root,gate]){batchStatic(part);yield;}
 root.position.set(FJORD_ISLAND_CENTER.x,0,FJORD_ISLAND_CENTER.z);
 root.rotation.y=FJORD_ISLAND.rotation;
 root.userData={region:'fjord',houseCount:village.root.userData.houseCount,terrainTriangles:terrain.group.userData.terrainTriangles+walkways.userData.earthTriangles};
 return {root,terrain:terrain.group,land:terrain.land,sideIsland:terrain.sideIsland,harborFoundation:terrain.harborFoundation,harbor,castle,walkways,village:village.root,gate,statueIslet,statue};
}
