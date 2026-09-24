import * as THREE from 'three';
import { createGameKraken } from './game-kraken.js';

const M=(color,roughness=.72,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness,side:THREE.DoubleSide});
const wood=M(0x95552e),lightWood=M(0xce9252),darkWood=M(0x533222),brass=M(0xd5ac60,.35,.55),iron=M(0x364b50,.5,.4),cream=M(0xe8d6aa),glass=M(0x54c7ce,.15,.28);
function add(group,geometry,material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
function box(group,w,h,d,x,y,z,material){return add(group,new THREE.BoxGeometry(w,h,d),material,x,y,z);}
function rod(group,a,b,r,material){const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b),diff=bb.clone().sub(aa);const m=add(group,new THREE.CylinderGeometry(r*.86,r,diff.length(),9),material);m.position.copy(aa).add(bb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.normalize());return m;}
function ellipsoid(group,x,y,z,sx,sy,sz,material,detail=2){const m=add(group,new THREE.IcosahedronGeometry(1,detail),material,x,y,z);m.scale.set(sx,sy,sz);return m;}
function triangular(group,pts,material){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts.flat(),3));g.setIndex([0,1,2,2,1,3]);g.computeVertexNormals();return add(group,g,material);}
function makeSail(group,color,x,y,width,height){
  const cloth=M(color,.94),verts=[],uvs=[],indices=[],n=10;
  for(let row=0;row<=n;row++)for(let col=0;col<=n;col++){
    const u=col/n,v=row/n;
    verts.push(x+.24*Math.sin(Math.PI*u)*Math.sin(Math.PI*v),y-height*v,(u-.5)*width*(1-.14*v));uvs.push(u,1-v);
    if(row<n&&col<n){const k=row*(n+1)+col;indices.push(k,k+1,k+n+1,k+1,k+n+2,k+n+1);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();add(group,geo,cloth);
  rod(group,[x,y+.04,-width*.54],[x,y+.04,width*.54],.07,lightWood);
  for(const side of [-1,1])rod(group,[x,y-height,side*width*.42],[x+.1,1.05,side*.80],.016,cream);
}
function pirateShip(color){
  const group=new THREE.Group(),hull=M(0x8c482d),strake=M(0xa66039),sail=M(color,.94);
  const stations=[[-2.45,.43],[-1.8,.88],[-.8,1.03],[.6,1.02],[1.75,.73],[2.53,.08]],verts=[],idx=[];
  for(let i=0;i<stations.length;i++){
    const [x,w]=stations[i];for(const side of [-1,1])for(const level of [0,1])verts.push(x,level?.74:-.5,side*w*(level?1:.52));
    if(i<stations.length-1)for(const sideIndex of [0,2]){
      const a=i*4+sideIndex,b=(i+1)*4+sideIndex;idx.push(a,b,a+1,b,b+1,a+1);
    }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();add(group,geo,hull);
  box(group,4.3,.13,1.58,-.05,.74,0,lightWood);
  for(const side of [-1,1]){
    for(let i=0;i<5;i++){const x=-1.8+i*.85;box(group,.70,.045,.055,x,.27,side*.9,strake);box(group,.035,.27,.035,x,.91,side*.88,lightWood);}
    rod(group,[-2.2,1.07,side*.76],[1.75,1.07,side*.72],.048,lightWood);
    for(const x of [-1.45,-.25,.95]){const cannon=add(group,new THREE.CylinderGeometry(.13,.17,.55,10),iron,x,.78,side*.88);cannon.rotation.x=Math.PI/2;}
  }
  box(group,.85,.65,1.25,-1.9,1.07,0,darkWood);box(group,.96,.12,1.4,-1.9,1.46,0,lightWood);
  for(const z of [-.4,0,.4])box(group,.035,.34,.18,-2.34,1.1,z,brass);
  for(const [x,h] of [[-.65,3.9],[1.05,3.2]]){rod(group,[x,.82,0],[x,h,0],.10,wood);makeSail(group,color,x,h-.65,x<0?1.95:1.45,x<0?1.68:1.35);for(const s of [-1,1])rod(group,[x,h-.2,0],[x-.75,1.03,s*.84],.018,cream);}
  rod(group,[1.6,.96,0],[3.22,1.44,0],.055,lightWood);
  const flag=triangular(group,[[-.65,3.97,0],[-1.27,3.99,.02],[-1.04,3.78,.05],[-.65,3.78,0]],sail);
  group.userData.flag=flag;
  return {group,animate(t){group.position.y=Math.sin(t*1.1)*.055;}};
}
function shark(){
  const group=new THREE.Group(),body=M(0x416c7d),belly=M(0xb8c8bb),dark=M(0x213e48);
  ellipsoid(group,0,0,0,1.68,.44,.56,body,3);
  ellipsoid(group,.22,-.2,0,1.17,.25,.46,belly,2);
  const nose=add(group,new THREE.ConeGeometry(.36,.72,12),body,1.65,.01,0);nose.rotation.z=-Math.PI/2;
  triangular(group,[[-.2,.32,-.06],[-.60,1.03,0],[-.85,.27,.07],[.1,.36,.07]],body);
  for(const side of [-1,1]){triangular(group,[[.2,-.04,side*.4],[-.7,-.18,side*1.12],[-.7,-.19,side*.35],[.2,-.05,side*.41]],body);ellipsoid(group,1.0,.10,side*.44,.055,.055,.055,dark,1);for(let i=0;i<3;i++)box(group,.035,.20,.018,.35-i*.12,-.04,side*.53,dark);}
  const tail=new THREE.Group();tail.position.x=-1.63;group.add(tail);
  rod(tail,[0,0,0],[-.56,0,0],.16,body);
  triangular(tail,[[-.53,0,0],[-.95,.7,0],[-.86,0,.02],[-.58,-.03,.01]],body);
  triangular(tail,[[-.53,0,0],[-.78,-.58,0],[-.88,0,.02],[-.58,.03,.01]],body);
  return {group,animate(t){tail.rotation.y=Math.sin(t*8)*.31;group.rotation.z=Math.sin(t*2.3)*.025;}};
}
function octopus(){
  const group=new THREE.Group(),purple=M(0x91506c),underside=M(0xc8808e),eye=M(0xffd3a2),pupil=M(0x17262d);
  ellipsoid(group,0,.55,0,1.15,1.28,.95,purple,3);
  ellipsoid(group,.52,-.32,0,.72,.42,.70,purple,2);
  for(const side of [-1,1]){ellipsoid(group,.85,.78,side*.45,.25,.28,.22,eye,2);ellipsoid(group,1.03,.78,side*.48,.08,.12,.09,pupil,2);}
  const tentacles=[];
  for(let i=0;i<8;i++){
    const pivot=new THREE.Group();pivot.rotation.y=i*Math.PI/4;group.add(pivot);pivot.position.y=-.25;
    let previous=[0,0,0];
    for(let k=0;k<5;k++){
      const next=[.55+k*.35,-.12-Math.sin(k*.7+i)*.22,.15*Math.sin(k*.9+i)];
      rod(pivot,previous,next,.19-k*.03,purple);previous=next;
      if(k>0)for(const s of [-1,1])ellipsoid(pivot,next[0],next[1]-.11,next[2]+s*.09,.065,.035,.065,underside,1);
    }
    tentacles.push(pivot);
  }
  return {group,animate(t){for(let i=0;i<tentacles.length;i++){tentacles[i].rotation.z=Math.sin(t*1.6+i*1.2)*.15;tentacles[i].rotation.x=Math.sin(t*1.3+i)*.12;}group.position.y=Math.sin(t*1.2)*.13;}};
}
function goldenSchool(){
  const group=new THREE.Group(),gold=M(0xe5aa42,.42,.25),pale=M(0xffde78,.55,.1),dark=M(0x2d4235);const fish=[];
  for(let i=0;i<9;i++){
    const child=new THREE.Group();group.add(child);child.position.set((i%3-1)*.68,(i%2)*.13,(Math.floor(i/3)-1)*.62);child.scale.setScalar(.6+(i%3)*.12);
    ellipsoid(child,0,0,0,.47,.20,.17,i%2?gold:pale,2);
    triangular(child,[[-.32,0,0],[-.66,.24,0],[-.65,-.23,0],[-.32,0,.04]],gold);
    triangular(child,[[-.05,.13,0],[-.26,.4,0],[.23,.16,0],[-.05,.14,.02]],gold);
    for(const s of [-1,1])ellipsoid(child,.28,.05,s*.14,.022,.026,.02,dark,1);
    fish.push(child);
  }
  return {group,animate(t){fish.forEach((f,i)=>{f.position.y=(i%2)*.13+Math.sin(t*3+i*.8)*.12;f.rotation.y=Math.sin(t*5+i)*.16;});}};
}
function submarine(){
  const group=new THREE.Group(),copper=M(0x9c6339,.4,.45),gold=M(0xd9ad5a,.3,.55),teal=M(0x2d9da3,.2,.3),dark=M(0x334e54,.5,.4);
  ellipsoid(group,0,0,0,2.0,.55,.62,copper,3);
  for(const x of [-1.35,-.48,.62,1.43]){const band=add(group,new THREE.TorusGeometry(.55,.06,8,20),gold,x,0,0);band.rotation.y=Math.PI/2;}
  const front=add(group,new THREE.SphereGeometry(.42,18,12),teal,1.78,0,0);front.scale.x=.7;
  for(const s of [-1,1]){for(const x of [-.9,.3,.95]){const p=add(group,new THREE.CylinderGeometry(.13,.13,.08,12),teal,x,0,s*.62);p.rotation.x=Math.PI/2;const rim=add(group,new THREE.TorusGeometry(.14,.028,6,16),gold,x,0,s*.68);rim.rotation.y=0;}}
  ellipsoid(group,-.18,.52,0,.46,.42,.40,teal,2);
  rod(group,[-.15,.83,0],[-.15,1.40,0],.07,gold);rod(group,[-.15,1.40,0],[.2,1.40,0],.06,gold);
  for(const s of [-1,1])triangular(group,[[-.45,-.25,s*.5],[-1.15,-.48,s*1.2],[.56,-.42,s*.95],[.45,-.29,s*.52]],dark);
  const propeller=new THREE.Group();group.add(propeller);propeller.position.x=-1.96;
  const shaft=add(propeller,new THREE.CylinderGeometry(.08,.08,.4,8),gold,-.1,0,0);shaft.rotation.z=Math.PI/2;
  for(let i=0;i<4;i++){const blade=box(propeller,.045,.58,.14,-.34,.3,0,gold);blade.rotation.x=i*Math.PI/2;blade.position.y=Math.cos(i*Math.PI/2)*.29;blade.position.z=Math.sin(i*Math.PI/2)*.29;}
  return {group,animate(t){propeller.rotation.x=t*9;group.position.y=Math.sin(t*1.5)*.1;}};
}
export function createTargetModel(def){
  switch(def.type){case 'ship':return pirateShip(def.color);case 'shark':return shark();case 'octopus':return createGameKraken();case 'school':return goldenSchool();case 'submarine':return submarine();default:return pirateShip(def.color);}
}
export function createChest(){
  const group=new THREE.Group();group.name='Treasure chest';
  box(group,.92,.40,.59,0,.24,0,wood);
  box(group,.98,.24,.65,0,.59,0,lightWood);
  for(const z of [-.27,.27]){box(group,.08,.70,.08,0,.38,z,brass);for(const x of [-.34,.34])box(group,.055,.67,.065,x,.38,z,brass);}
  for(const x of [-.36,.36]){box(group,.055,.6,.70,x,.42,0,brass);}
  box(group,.15,.22,.05,.02,.47,.36,brass);
  const lock=add(group,new THREE.TorusGeometry(.05,.014,6,10),darkWood,.02,.48,.39);lock.rotation.y=.05;
  const glow=add(group,new THREE.SphereGeometry(.67,12,8),new THREE.MeshBasicMaterial({color:0xf9b855,transparent:true,opacity:.09,depthWrite:false}),0,.32,0);glow.castShadow=false;
  return group;
}
