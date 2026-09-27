import * as T from 'three';
import {HARBOR_FOUNDATION_TOP,MAIN_WALKWAY_ROUTES,harborFoundationSignedDistance,islandHeight,walkwaySegmentLevel} from './fjord-island-study.js';

const TREAD=new T.MeshStandardMaterial({color:0xbac1b8,roughness:1,flatShading:true});
const LANDING=new T.MeshStandardMaterial({color:0xd4d0bd,roughness:1,flatShading:true});
const RAIL=new T.MeshStandardMaterial({color:0x9fa9a4,roughness:1,flatShading:true});
const EARTH=new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,side:T.DoubleSide});
const unitBox=new T.BoxGeometry(1,1,1);
const stepWidth=3.05;

function block(parent,name,x,bottom,z,width,height,depth,material){
 const mesh=new T.Mesh(new T.BoxGeometry(width,height,depth),material);
 mesh.name=name;mesh.position.set(x,bottom+height/2,z);
 mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function rod(parent,name,from,to,radius){
 const a=new T.Vector3(...from),b=new T.Vector3(...to),axis=b.clone().sub(a);
 const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,axis.length(),6),RAIL);
 mesh.name=name;mesh.position.copy(a.add(b).multiplyScalar(.5));
 mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis.normalize());
 mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function makeEmbankment(parent,a,b,supportY){
 const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);
 const nx=Math.cos(angle),nz=-Math.sin(angle),sections=Math.ceil(length/2.15);
 const offsets=[-5,-1.7,1.7,5],positions=[],colors=[],indices=[];
 const low=new T.Color(0x71877b),high=new T.Color(0x687985);
 for(let j=0;j<=sections;j++){
  const t=j/sections,x=a[0]+dx*t,z=a[1]+dz*t,level=walkwaySegmentLevel(a,b,t);
  for(let k=0;k<offsets.length;k++){
   const px=x+nx*offsets[k],pz=z+nz*offsets[k];
   const py=k===0||k===3?supportY(px,pz)+.045:level-.19;
   positions.push(px,py,pz);
   const c=low.clone().lerp(high,Math.max(0,Math.min(1,(py-9)/22)));
   c.multiplyScalar(k===0||k===3?.93:1);
   colors.push(c.r,c.g,c.b);
  }
  if(j)for(let k=0;k<3;k++){
   const row=(j-1)*4, next=j*4;
   indices.push(row+k,next+k,row+k+1,row+k+1,next+k,next+k+1);
  }
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const embankment=new T.Mesh(geometry,EARTH);
 embankment.name='石階下方隨山坡收邊的岩土路基';
 embankment.castShadow=embankment.receiveShadow=true;parent.add(embankment);
 return indices.length/3;
}
function makeFlight(parent,route,a,b,index,supportY){
 const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
 const flat=Math.min(.9,length*.17);
 const count=Math.ceil(Math.max(length/.57,Math.abs(b[2]-a[2])/.17*length/(length-2*flat)));
 const treadRun=length/count,angle=Math.atan2(dx,dz);
 const flight=new T.InstancedMesh(unitBox,TREAD,count);
 flight.name=`${route.name}・第 ${index} 段石階`;
 flight.castShadow=flight.receiveShadow=true;
 const dummy=new T.Object3D();
 for(let i=0;i<count;i++){
  const t=(i+.5)/count,x=a[0]+dx*t,z=a[1]+dz*t;
  const level=walkwaySegmentLevel(a,b,t),top=level+.2;
  const bottom=Math.min(supportY(x,z)-.28,top-.28);
  dummy.position.set(x,(top+bottom)/2,z);
  dummy.rotation.set(0,angle,0);
  dummy.scale.set(stepWidth,top-bottom,treadRun+.055);
  dummy.updateMatrix();flight.setMatrixAt(i,dummy.matrix);
  flight.setColorAt(i,new T.Color(i%7===0?0xd5d1be:i%3===0?0xb2bbb3:0xc1c4b6));
 }
 flight.instanceMatrix.needsUpdate=true;
 flight.userData={from:route.from,to:route.to,run:treadRun,riseLimit:.17,grade:Math.abs(b[2]-a[2])/(length-2*flat),count};
 const earthTriangles=makeEmbankment(parent,a,b,supportY);
 parent.add(flight);
 if(flight.userData.grade>.26){
  for(const side of[-1,1]){
   const railPoints=[];
   const sections=Math.ceil(length/3.8);
   for(let j=0;j<=sections;j++){
    const t=j/sections,x=a[0]+dx*t,z=a[1]+dz*t;
    const level=walkwaySegmentLevel(a,b,t);
    const offset=(stepWidth/2+.22)*side;
    const rx=x+Math.cos(angle)*offset,rz=z-Math.sin(angle)*offset;
    rod(parent,'石階扶手立柱',[rx,level+.1,rz],[rx,level+1.03,rz],.095);
    railPoints.push([rx,level+1.01,rz]);
   }
   for(let j=1;j<railPoints.length;j++)rod(parent,'沿坡石質扶手',railPoints[j-1],railPoints[j],.115);
  }
 }
 return {count,treadRun,grade:flight.userData.grade,earthTriangles};
}

export function createFjordIslandWalkways(land){
 const build=buildFjordIslandWalkways(land);let step;
 do{step=build.next();}while(!step.done);
 return step.value;
}
export function* buildFjordIslandWalkways(land){
 const root=new T.Group();root.name='主島民居平台・相連的山坡石階';
 const ray=new T.Raycaster();
 if(land)land.updateMatrixWorld(true);
 const supportY=(x,z)=>{
  if(harborFoundationSignedDistance(x,z)>=0)return HARBOR_FOUNDATION_TOP;
  if(!land)return islandHeight(x,z);
  ray.set(new T.Vector3(x,100,z),new T.Vector3(0,-1,0));
  return ray.intersectObject(land)[0]?.point.y??islandHeight(x,z);
 };
 const landings=new Set();let stepCount=0,minRun=Infinity,maxGrade=0,earthTriangles=0;
 for(const route of MAIN_WALKWAY_ROUTES){
  const path=new T.Group();path.name=route.name;root.add(path);
  for(let i=1;i<route.points.length;i++){
   const result=makeFlight(path,route,route.points[i-1],route.points[i],i,supportY);
   stepCount+=result.count;minRun=Math.min(minRun,result.treadRun);maxGrade=Math.max(maxGrade,result.grade);
   earthTriangles+=result.earthTriangles;yield;
  }
  for(const [x,z,level] of route.points){
   const key=`${x},${z}`;
   if(landings.has(key))continue;
   landings.add(key);
   const top=level+.2,bottom=Math.min(supportY(x,z)-.28,top-.28);
   block(root,'折返與平台接頭・平整石台',x,bottom,z,3.75,top-bottom,3.75,LANDING);
  }
 }
 root.userData={previewOnly:true,routeCount:MAIN_WALKWAY_ROUTES.length,stepCount,minRun,maxGrade,landingCount:landings.size,earthTriangles};
 return root;
}
