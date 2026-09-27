import * as T from 'three';
import {createFjordCitadel} from './fjord-citadel.js';
import {BUILDING_TERRACES,HARBOR_FOUNDATION_TOP,castleApproachAxis,islandHeight} from './fjord-island-study.js';

export const ISLAND_CASTLE_SCALE={horizontal:1.17,vertical:1.32};
const castlePlot=BUILDING_TERRACES.find(plot=>plot.name==='主堡用地');
export const ISLAND_CASTLE_POSITION={x:castlePlot.x,y:castlePlot.y,z:castlePlot.z};
const PALE=new T.MeshStandardMaterial({color:0xded9c7,roughness:1,flatShading:true});
const STONE=new T.MeshStandardMaterial({color:0xa9b3ad,roughness:1,flatShading:true});
const BLUE=new T.MeshStandardMaterial({color:0x214f68,roughness:1,flatShading:true,side:T.DoubleSide});
const GOLD=new T.MeshStandardMaterial({color:0xcdb67c,roughness:.68,metalness:.22,side:T.DoubleSide});

function part(parent,name,geometry,material,x,y,z){
 const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);
 mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function block(parent,name,x,bottom,z,width,height,depth,material=PALE){
 return part(parent,name,new T.BoxGeometry(width,height,depth),material,x,bottom+height/2,z);
}
function rod(parent,name,from,to,radius,material=PALE){
 const a=new T.Vector3(...from),b=new T.Vector3(...to),axis=b.clone().sub(a);
 const mesh=part(parent,name,new T.CylinderGeometry(radius,radius,axis.length(),6),material,...a.add(b).multiplyScalar(.5).toArray());
 mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis.normalize());return mesh;
}

function ceremonialStair(root){
 const stairs=new T.Group();stairs.name='主堡城門至內港・依山雕出的儀式石階';root.add(stairs);
 const frontZ=ISLAND_CASTLE_POSITION.z+10.56*ISLAND_CASTLE_SCALE.horizontal;
 const harborZ=-11.2,steps=104;
 const crest=ISLAND_CASTLE_POSITION.y+1.08*ISLAND_CASTLE_SCALE.vertical;
 const foot=HARBOR_FOUNDATION_TOP+.22;
 const landings=new Set([32,33,34,35,68,69,70,71]);
 const riser=(crest-foot)/(steps-1-landings.size);
 const treadRun=(harborZ-frontZ)/steps;
 const sidePoints=[[],[]];
 let descended=0;
 for(let i=0;i<steps;i++){
  const z=frontZ+(harborZ-frontZ)*(i+.5)/steps;
  if(i>0&&!landings.has(i))descended++;
  const top=crest-descended*riser;
  const axis=castleApproachAxis(z),x=axis.x,width=5.5+3.8*i/(steps-1);
  const ground=islandHeight(x,z);
  const bottom=Math.min(ground-.45,top-.32);
  block(stairs,'鑿入岩坡的寬石階',x,bottom,z,width,top-bottom,treadRun+.045,i%8===0?PALE:STONE);
  if(i%8===0||i===steps-1){
   for(const [side,points]of[[-1,sidePoints[0]],[1,sidePoints[1]]]){
    const railX=x+side*(width/2+.28);
    block(stairs,'階梯側欄石柱',railX,top-.35,z,.62,1.28,.62,PALE);
    points.push([railX,top+.83,z]);
   }
  }
 }
 for(const points of sidePoints)for(let i=1;i<points.length;i++)rod(stairs,'隨坡連續的石欄扶手',points[i-1],points[i],.17,PALE);
 block(stairs,'階梯腳與碼頭地坪接合石',castleApproachAxis(harborZ).x,HARBOR_FOUNDATION_TOP-.18,harborZ+.34,9.35,.18,.72,PALE);
 for(const side of[-1,1]){
  const x=castleApproachAxis(harborZ).x+side*5.15;
  block(stairs,'港口通往王城的階梯門柱',x,HARBOR_FOUNDATION_TOP,harborZ+.55,1.38,3.15,1.38,STONE);
  block(stairs,'階梯門柱石冠',x,HARBOR_FOUNDATION_TOP+3.15,harborZ+.55,1.73,.32,1.73,PALE);
 }
 stairs.userData={landingZ:frontZ,harborZ,steps,harborHeight:HARBOR_FOUNDATION_TOP,riser,treadRun,restLandingCount:2};
 return stairs;
}

function heraldry(root){
 const regalia=new T.Group();regalia.name='蒼壁王城・海軍旗與鎏金紋章';
 regalia.position.set(ISLAND_CASTLE_POSITION.x,ISLAND_CASTLE_POSITION.y,ISLAND_CASTLE_POSITION.z);
 regalia.scale.set(ISLAND_CASTLE_SCALE.horizontal,ISLAND_CASTLE_SCALE.vertical,ISLAND_CASTLE_SCALE.horizontal);
 root.add(regalia);
 for(const x of[-11.7,11.7]){
  block(regalia,'垂掛於海向城牆的長旗',x,3.4,9.91,1.35,3.15,.075,BLUE);
  block(regalia,'海軍長旗鎏金邊',x,3.4,9.99,1.38,.12,.08,GOLD);
  part(regalia,'海神三叉戟旗徽',new T.CylinderGeometry(.085,.085,1.45,6),GOLD,x,5.14,10.07);
  for(const dx of[-.31,0,.31]){
   const tine=part(regalia,'三叉戟鎏金叉尖',new T.ConeGeometry(.12,.47,5),GOLD,x+dx,6.01-(dx? .13:0),10.07);
   tine.rotation.z=dx<0?-.27:dx>0?.27:0;
  }
 }
 block(regalia,'城門上方藍色大盾',0,9.22,10.24,1.55,1.85,.12,BLUE);
 block(regalia,'大盾金色縱飾',0,9.65,10.33,.17,1.24,.1,GOLD);
 block(regalia,'大盾金色橫飾',0,10.02,10.33,1.05,.16,.1,GOLD);
 for(const [x,z,base]of[[-16.55,7.3,15.92],[16.58,7.35,15.95],[-11.5,-7.16,18.33],[11.5,-7.2,25.35]]){
  const spire=part(regalia,'塔頂鎏金海星尖飾',new T.ConeGeometry(.25,.95,6),GOLD,x,base+.5,z);
  spire.rotation.y=Math.PI/6;
  part(regalia,'塔尖金珠',new T.SphereGeometry(.22,8,5),GOLD,x,base+1.01,z);
 }
 for(const [x,z,y,size]of[[-4.68,-5.56,31.4,1],[11.5,-7.2,25.3,.8],[-16.55,7.3,16.15,.72]]){
  rod(regalia,'城堡高塔旗桿',[x,y,z],[x,y+4.0*size,z],.075*size,GOLD);
  const flag=new T.Shape();flag.moveTo(0,0);flag.lineTo(2.6*size,-.15*size);
  flag.lineTo(2.15*size,-.68*size);flag.lineTo(2.5*size,-1.28*size);
  flag.lineTo(0,-1.1*size);flag.closePath();
  part(regalia,'海軍藍色燕尾旗',new T.ShapeGeometry(flag),BLUE,x,y+3.42*size,z+.1);
  part(regalia,'旗桿鎏金頂珠',new T.SphereGeometry(.18*size,8,5),GOLD,x,y+4.0*size,z);
 }
 return regalia;
}

export function createFjordIslandCastle(){
 const root=new T.Group();root.name='新主島・蒼壁峽灣主堡';
 const citadel=createFjordCitadel();citadel.name='蒼壁主堡・高塔與雙層城牆';
 citadel.position.set(ISLAND_CASTLE_POSITION.x,ISLAND_CASTLE_POSITION.y,ISLAND_CASTLE_POSITION.z);
 citadel.scale.set(ISLAND_CASTLE_SCALE.horizontal,ISLAND_CASTLE_SCALE.vertical,ISLAND_CASTLE_SCALE.horizontal);
 root.add(citadel);
 ceremonialStair(root);
 heraldry(root);
 root.userData={previewOnly:true,footprint:{width:39.1*ISLAND_CASTLE_SCALE.horizontal,depth:22.27*ISLAND_CASTLE_SCALE.horizontal},
  groundY:ISLAND_CASTLE_POSITION.y,highestRoofY:ISLAND_CASTLE_POSITION.y+31.43*ISLAND_CASTLE_SCALE.vertical};
 return root;
}
