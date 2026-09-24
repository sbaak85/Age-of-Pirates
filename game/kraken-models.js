import * as THREE from 'three';
export const KRAKEN_STYLES=[
 {name:'① 赤潮克拉肯',skin:0xa7344e,belly:0xe79b78,spot:0x61254a,eye:0xffc04c,head:[1.72,1.6,1.42],length:6.2,thick:.57,curl:1.2},
 {name:'② 紫礁魅影',skin:0x7052aa,belly:0xd8a4d8,spot:0x423260,eye:0xffd05a,head:[1.22,1.95,1.15],length:7.0,thick:.40,curl:1.9},
 {name:'③ 深淵冠王',skin:0x236d79,belly:0x83c1bc,spot:0x133b52,eye:0xffa02c,head:[1.3,2.3,1.15],length:6.4,thick:.60,curl:1.35},
];
const Y=new THREE.Vector3(0,1,0),down=new THREE.Vector3(0,-1,0),dummy=new THREE.Object3D();
const sphere=new THREE.SphereGeometry(1,32,24);
function ellipsoid(parent,material,pos,scale){const m=new THREE.Mesh(sphere,material);m.position.set(...pos);m.scale.set(...scale);parent.add(m);return m;}
function curveMesh(parent,pts,r,mat){const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,24,r,8,false),mat);parent.add(mesh);return mesh;}
const cupGeometry=new THREE.LatheGeometry([[0,0],[.6,0],[.88,.15],[1,.35],[.96,.55],[.74,.62],[.60,.44],[.35,.22],[0,.20]].map(p=>new THREE.Vector2(...p)),12);

export function createKraken(index,{seaPose=false}={}){
 const cfg=KRAKEN_STYLES[index],group=new THREE.Group(),body=new THREE.Group();group.add(body);
 const skin=new THREE.MeshPhysicalMaterial({color:cfg.skin,roughness:.48,clearcoat:.32,clearcoatRoughness:.35});
 const skinVertex=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.48,clearcoat:.28,clearcoatRoughness:.4});
 const underside=new THREE.MeshStandardMaterial({color:cfg.belly,roughness:.65});
 const dark=new THREE.MeshStandardMaterial({color:cfg.spot,roughness:.62});
 const horn=new THREE.MeshStandardMaterial({color:index===2?0xb1cbbd:0xd9a18b,roughness:.64});
 const headGeometry=sphere.clone(),p=headGeometry.attributes.position;
 for(let i=0;i<p.count;i++){const y=p.getY(i),w=.85+.2*y; p.setXYZ(i,p.getX(i)*w,p.getY(i),p.getZ(i)*(1+.08*y)+.20*y*y);}
 headGeometry.computeVertexNormals();const head=new THREE.Mesh(headGeometry,skin);head.position.set(0,2.3,-.2);head.scale.set(...cfg.head);body.add(head);
 ellipsoid(body,skin,[0,1.05,.4],[1.36,.78,1.28]);
 // Raised eye sockets, separate wet eyeballs and upper lids form a readable face.
 const eyes=[];
 for(const side of [-1,1]){
   const socket=new THREE.Group();socket.position.set(side*.76,2.15,1.0);socket.rotation.y=side*.35;body.add(socket);
   ellipsoid(socket,skin,[0,0,-.12],[.57,.55,.3]);
   const eyeball=ellipsoid(socket,new THREE.MeshPhysicalMaterial({color:cfg.eye,roughness:.25,clearcoat:1}),[0,0,.12],[.35,.33,.21]);
   const pupil=ellipsoid(socket,new THREE.MeshStandardMaterial({color:0x101722,roughness:.27}),[0,0,.32],[index===1?.10:.065,.24,.035]);
   ellipsoid(socket,new THREE.MeshBasicMaterial({color:0xfff9db}),[-.09,.11,.354],[.047,.055,.02]);
   const brow=curveMesh(socket,[[side*.43,.23,.05],[side*.15,.37,.19],[-side*.25,.18,.22]],.14,skin);
   eyes.push({socket,eyeball,pupil,brow});
 }
 curveMesh(body,[[-.46,1.44,1.47],[0,1.30,1.56],[.46,1.44,1.47]],.035,dark);
 for(const side of [-1,1])curveMesh(body,[[side*.22,2.75,1],[side*.4,3.0,.95],[side*.7,3.12,.83]],.045,dark);
 // Small surface markings follow the mantle, shared draw call.
 const spots=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),dark,70);body.add(spots);
 let seed=733+index;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<70;i++){const u=rand()*Math.PI*2,y=rand()*1.8-.85,r=Math.sqrt(1-y*y),w=.85+.2*y;dummy.position.set(Math.cos(u)*r*w*cfg.head[0],2.3+y*cfg.head[1],-.2+(Math.sin(u)*r*(1+.08*y)+.2*y*y)*cfg.head[2]);const size=.04+rand()*.08;dummy.scale.setScalar(size);dummy.updateMatrix();spots.setMatrixAt(i,dummy.matrix);}
 if(index!==1){
   for(let i=0;i<(index===2?7:5);i++){
     const spike=new THREE.Mesh(new THREE.ConeGeometry(index===2?.22:.15,index===2?.85:.43,7),horn);
     const a=(i/((index===2?7:5)-1)-.5)*2.2;spike.position.set(Math.sin(a)*1.0,(index===2?4.35:3.25)+Math.cos(a)*.5,-.30);spike.rotation.z=-a*.6;body.add(spike);
   }
 }
 if(index===2){
   for(let i=0;i<5;i++){const plate=ellipsoid(body,dark,[0,2.5+i*.34,-.35],[1.22-i*.14,.17,1.06-i*.09]);plate.rotation.x=-.1;}
 }
 const arms=[],ringCount=44,sides=14,suckersPerArm=34;
 const cups=new THREE.InstancedMesh(cupGeometry,underside,8*suckersPerArm);cups.instanceMatrix.setUsage(THREE.DynamicDrawUsage);cups.frustumCulled=false;group.add(cups);
 const skinColor=new THREE.Color(cfg.skin),bellyColor=new THREE.Color(cfg.belly),color=new THREE.Color();
 for(let arm=0;arm<8;arm++){
   const geometry=new THREE.BufferGeometry(),positions=new Float32Array((ringCount+1)*(sides+1)*3),normals=new Float32Array(positions.length),colors=new Float32Array(positions.length),indices=[];
   for(let r=0;r<ringCount;r++)for(let k=0;k<sides;k++){const a=r*(sides+1)+k,b=a+sides+1;indices.push(a,a+1,b,a+1,b+1,b);}
   geometry.setIndex(indices);geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3).setUsage(THREE.DynamicDrawUsage));
   for(let r=0;r<=ringCount;r++)for(let k=0;k<=sides;k++){const a=k/sides*Math.PI*2;const ventral=THREE.MathUtils.smoothstep(Math.cos(a),.25,.70);color.copy(skinColor).lerp(bellyColor,ventral*.85);color.multiplyScalar(1-.07*Math.sin(r*.63+arm));color.toArray(colors,(r*(sides+1)+k)*3);}
   geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));const mesh=new THREE.Mesh(geometry,skinVertex);mesh.frustumCulled=false;group.add(mesh);
   arms.push({mesh,positions,normals,curve:new THREE.CatmullRomCurve3(Array.from({length:9},()=>new THREE.Vector3())),samples:[]});
 }
 const tangent=new THREE.Vector3(),normal=new THREE.Vector3(),binormal=new THREE.Vector3(),prevT=new THREE.Vector3(),q=new THREE.Quaternion(),radial=new THREE.Vector3(),point=new THREE.Vector3();
 function update(t,mode='auto'){
   const phase=mode==='attack'?t%4:mode==='swim'?0:t%12;
   const attacking=mode==='attack'||(mode==='auto'&&phase>=7);
   const attackTime=mode==='attack'?phase:phase-7;
   const wind=attacking?Math.sin(Math.min(1,attackTime/1.4)*Math.PI*.5)*(1-THREE.MathUtils.smoothstep(attackTime,1.4,1.75)):0;
   const strike=attacking?Math.sin(THREE.MathUtils.smoothstep(attackTime,1.4,1.9)*Math.PI):0;
   const swim=mode==='swim'||(mode==='auto'&&phase>3&&phase<7);
   const breath=Math.sin(t*1.3)*.035;body.position.y=Math.sin(t*1.15)*.09;body.scale.set(1+breath,1-breath*.6,1+breath);
   body.rotation.x=(swim?Math.sin(t*2)*.035:0)-wind*.07+strike*.10;
   eyes.forEach((e,i)=>{const blink=Math.pow(Math.max(0,Math.cos(t*.8+i*.06)),30);e.eyeball.scale.y=.33*(1-blink*.86);e.pupil.scale.y=.24*(1-blink*.86);e.socket.rotation.y=(i===0?-1:1)*.35+Math.sin(t*.7)*.035;});
   for(let ai=0;ai<8;ai++){
     const arm=arms[ai],a=ai/8*Math.PI*2+.22,front=Math.cos(a)>.6,side=Math.sin(a),forward=Math.cos(a),length=cfg.length*(.84+.13*Math.sin(ai*2.4));
     const lift=(front?1.8:1.1)+(index===1?.9:.55)*Math.sin(ai*1.7)+(index===2?.5:0)+((front?wind*2.4-strike*2.0:0));
     const wave=Math.sin(t*(swim?2.4:1.1)-ai*.8);
     const radialDistances=[.85,1.65,length*.48,length*.75,length*.94,length*.96,length*.85,length*.73,length*.76];
     const heights=[.7,.45,.28,lift*.5,lift,lift+cfg.curl*.65,lift+cfg.curl, lift+cfg.curl*.8,lift+cfg.curl*.53];
     for(let j=0;j<9;j++){
       const s=j/8,r=radialDistances[j],twist=Math.sin(t*1.2-ai+j*.8)*.14*s+(swim?wave*.3*s:0);
       const surfaceLift=seaPose?THREE.MathUtils.smoothstep(s,.25,.7)*1.35:0;
       arm.curve.points[j].set(side*r+forward*twist,Math.max(.12,heights[j]+surfaceLift+Math.sin(t*1.4-ai-s*3)*s*.2),forward*r-side*twist);
     }
     arm.curve.updateArcLengths();
     for(let r=0;r<=ringCount;r++){
       const s=r/ringCount;arm.curve.getPointAt(s,point);arm.curve.getTangentAt(s,tangent);
       if(r===0){normal.copy(down).addScaledVector(tangent,-down.dot(tangent)).normalize();}else {q.setFromUnitVectors(prevT,tangent);normal.applyQuaternion(q).normalize();}
       prevT.copy(tangent);binormal.crossVectors(tangent,normal).normalize();
       const radius=cfg.thick*Math.pow(1-s,.72)+.025;
       arm.samples[r]={p:point.clone(),n:normal.clone(),b:binormal.clone(),radius};
       for(let k=0;k<=sides;k++){const angle=k/sides*Math.PI*2;radial.copy(normal).multiplyScalar(Math.cos(angle)).addScaledVector(binormal,Math.sin(angle));const offset=(r*(sides+1)+k)*3;
         arm.positions[offset]=point.x+radial.x*radius;arm.positions[offset+1]=point.y+radial.y*radius;arm.positions[offset+2]=point.z+radial.z*radius;radial.toArray(arm.normals,offset);
       }
     }
     for(let j=0;j<17;j++)for(let row=0;row<2;row++){
       const s=.13+j/17*.79,sample=arm.samples[Math.round(s*ringCount)],angle=row===0?-.38:.38;
       radial.copy(sample.n).multiplyScalar(Math.cos(angle)).addScaledVector(sample.b,Math.sin(angle));dummy.position.copy(sample.p).addScaledVector(radial,sample.radius*.97);dummy.quaternion.setFromUnitVectors(Y,radial);
       const size=(.145*(1-s)+.027)*(1+.07*Math.sin(j*4+ai));dummy.scale.set(size,size*.7,size);dummy.updateMatrix();cups.setMatrixAt(ai*suckersPerArm+j*2+row,dummy.matrix);
     }
     arm.mesh.geometry.attributes.position.needsUpdate=true;arm.mesh.geometry.attributes.normal.needsUpdate=true;
   }
   cups.instanceMatrix.needsUpdate=true;
   return attacking?'蓄力 · 觸手拍擊':swim?'巡弋 · 觸手划水':'待機 · 呼吸與捲動';
 }
 update(.5);return {group,update};
}
