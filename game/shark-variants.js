import * as THREE from 'three';
export const SHARK_VARIANTS=[{id:'granite',name:'礁岩巨顎',back:0x577589,belly:0xe5e3ce,width:1, gape:1},{id:'azure',name:'碧海獵手',back:0x237d93,belly:0xf0e9cc,width:.88,gape:.72}];
export function createSharkVariant(index=0){
 const style=SHARK_VARIANTS[index],group=new THREE.Group();group.name=style.name;if(index===1)group.scale.set(1.08,.87,.93);const pectorals=[];
 const material=c=>new THREE.MeshStandardMaterial({color:c,roughness:.48,metalness:0});
 const skin=material(style.back),belly=material(style.belly),inside=material(0x341f2d),gum=material(0x975965),ivory=material(0xfff0cf),black=material(0x081720);
 const W=style.width;
 function mesh(geo,mat,parent=group){const m=new THREE.Mesh(geo,mat);parent.add(m);return m;}
 function ball(p,s,mat,parent=group){const m=mesh(new THREE.SphereGeometry(1,24,16),mat,parent);m.position.set(...p);m.scale.set(...s);return m;}
 function surface(fn,nu,nv,mat,parent=group){const p=[],ix=[];for(let u=0;u<=nu;u++)for(let v=0;v<=nv;v++)p.push(...fn(u/nu,v/nv));for(let u=0;u<nu;u++)for(let v=0;v<nv;v++){const a=u*(nv+1)+v,b=a+nv+1;ix.push(a,b,a+1,b,b+1,a+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();const m=mesh(g,mat,parent);mat.side=THREE.DoubleSide;return m;}
 function tube(points,r,mat,parent=group){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),48,r,8,false),mat,parent);}
 // Continuous trunk with a broad shoulder, narrowing smoothly toward the caudal peduncle.
 const sections=[[-3.4,.12,.13],[-2.9,.19,.22],[-2.3,.35,.38],[-1.6,.64,.65],[-.8,.89,.86],[0,1.03,.99],[.65,.99,.96]];
 function radii(x){let i=0;while(i<sections.length-2&&x>sections[i+1][0])i++;const a=sections[i],b=sections[i+1],t=(x-a[0])/(b[0]-a[0]);return [THREE.MathUtils.lerp(a[1],b[1],t),THREE.MathUtils.lerp(a[2],b[2],t)*W];}
 const body=surface((u,v)=>{const x=-3.4+4.05*u,[h,w]=radii(x),a=v*Math.PI*2;return [x,Math.sin(a)*h,Math.cos(a)*w];},72,48,skin);
 const colors=[];const pa=body.geometry.attributes.position;for(let i=0;i<pa.count;i++){const y=pa.getY(i),c=new THREE.Color(style.back).lerp(new THREE.Color(style.belly),THREE.MathUtils.smoothstep(-y,.16,.46));colors.push(c.r,c.g,c.b);}body.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));body.material=skin.clone();body.material.color.set(0xffffff);body.material.vertexColors=true;
 function width(u){return (.96*Math.sqrt(Math.max(0,1-u*u)))*W;}
 function lip(u){return -.055*Math.sin(u*Math.PI*.7);}
 // The head is an open upper shell: no solid ellipsoid occupies the oral cavity.
 const head=surface((u,v)=>{const a=v*Math.PI;return [.65+2*u,lip(u)+Math.sin(a)*(.99*(1-.40*u))*Math.sqrt(1-u*u),Math.cos(a)*width(u)];},48,36,skin);
 surface((u,v)=>{const z=(v*2-1)*width(u);return [.65+2*u,lip(u)+.13*Math.sin(v*Math.PI)*(1-u),z];},40,28,inside);
 const jaw=new THREE.Group();group.add(jaw);jaw.position.x=.65;
 const lowerY=u=>-style.gape*.67*Math.sin(u*Math.PI*.55);
 surface((u,v)=>{const a=v*Math.PI;return [2*u,lowerY(u)-Math.sin(a)*(.99-.56*u)*Math.sqrt(1-u*u),Math.cos(a)*width(u)];},48,32,belly,jaw);
 surface((u,v)=>[2*u,lowerY(u)-.14*Math.sin(v*Math.PI)*(1-u), (v*2-1)*width(u)],40,28,inside,jaw);
 // Recessed throat closes the back of the cavity; rims and teeth follow the same U curves.
 ball([.68,-.21,0],[.12,.55,.84*W],inside);
 for(const side of [-1,1]){
  const upper=[],lower=[];for(let j=0;j<=32;j++){const u=j/32;upper.push([.65+2*u,lip(u),side*width(u)]);lower.push([2*u,lowerY(u),side*width(u)]);}
  tube(upper,.042,gum);tube(lower,.042,gum,jaw);
  for(let k=0;k<13;k++){
   const u=.13+k*.063,w=width(u),size=.12+.095*Math.sin(u*Math.PI);
   // Broad triangular enamel blades, with roots embedded inside the gum and tips inward.
   function tooth(parent,x,y,z,up){const g=new THREE.BufferGeometry();const inward=-side*.07;g.setAttribute('position',new THREE.Float32BufferAttribute([x-.075,y,z,x+.075,y,z,x+.018,y+up*size,z+inward,x,y,z-side*.065],3));g.setIndex([0,1,2,0,3,1,0,2,3,1,3,2]);g.computeVertexNormals();const m=mesh(g,ivory,parent);m.name='嵌入牙齦的牙齒';}
   tooth(group,.65+2*u,lip(u)+.012,side*(w-.035),-1);
   tooth(jaw,2*u,lowerY(u)-.012,side*(w-.035),1);
  }
  // Eyes sit in sculpted orbital pads above the rear corners of the mouth.
  ball([1.22,.43,side*.81*W],[.32,.20,.15],skin);
  ball([1.33,.40,side*.918*W],[.125,.12,.058],black);
  ball([1.37,.445,side*.967*W],[.029,.029,.014],ivory);
  const brow=ball([1.32,.54,side*.87*W],[.35,.09,.125],skin);brow.rotation.z=-.16;
  ball([2.24,.19,side*.41*W],[.075,.025,.027],black);
  for(let k=0;k<5;k++){const x=.30-k*.19,[h,w]=radii(x);const pts=[];for(let j=0;j<=10;j++){const a=-.48+j*.091;pts.push([x-.055*Math.sin(j/10*Math.PI),Math.sin(a)*h,side*(Math.cos(a)*w+.007)]);}tube(pts,.016,material(0x294550));}
 }
 // The front incisors turn across the muzzle instead of continuing as side-facing blades.
 for(let k=-2;k<=2;k++){
  const z=k*.115*W,u=Math.sqrt(1-Math.pow(z/(.96*W),2));
  for(const lower of [false,true]){
   const x=2*u+(lower?0:.65)-.028,y=lower?lowerY(u):lip(u),direction=lower?1:-1;
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([x,y,z-.052*W,x,y,z+.052*W,x-.07,y+direction*.16,z,x-.065,y,z],3));g.setIndex([0,1,2,0,3,1,0,2,3,1,3,2]);g.computeVertexNormals();mesh(g,ivory,lower?jaw:group);
  }
 }
 // Curved, lenticular fins. The root has volume and each tip tapers to a rounded edge.
 function fin(name,start,tip,chord,mat,parent=group){const s=new THREE.Vector3(...start),e=new THREE.Vector3(...tip);const f=surface((u,v)=>{const center=s.clone().lerp(e,u);center.x+=.22*Math.sin(u*Math.PI);const c=chord*Math.pow(1-u,.72)+.012;const a=v*Math.PI*2;return [center.x+Math.cos(a)*c*.5,center.y+(Math.abs(e.z-s.z)>.5?Math.sin(a)*.10*(1-u):0),center.z+(Math.abs(e.z-s.z)>.5?0:Math.sin(a)*.13*(1-u))];},24,20,mat,parent);f.name=name;return f;}
 fin('主背鰭',[-.65,.74,0],[-1.05,index===1?1.78:2.12,0],1.36,skin);
 for(const side of [-1,1]){const pf=fin('胸鰭',[-.10,-.30,side*.7*W],[-1.42,-.63,side*(index===1?2.42:2.12)],1.15,skin);pectorals.push([pf,side]);fin('腹鰭',[-1.95,-.30,side*.24],[-2.35,-.51,side*.75],.62,belly);}
 fin('第二背鰭',[-2.47,.25,0],[-2.7,.67,0],.48,skin);
 const tail=new THREE.Group();tail.position.x=-3.3;group.add(tail);const fluke=new THREE.Group();tail.add(fluke);
 ball([-.18,0,0],[.45,.16,.16],skin,fluke);
 fin('上尾葉',[-.18,0,0],[-.88,1.24,0],.60,skin,fluke);fin('下尾葉',[-.18,0,0],[-.76,-.84,0],.52,skin,fluke);
 // Normalize nose-to-tail length before applying the requested 1.5 size ratio.
 const bounds=new THREE.Box3().setFromObject(group);group.scale.multiplyScalar((index===0?9:6)/(bounds.max.x-bounds.min.x));
 const rest=body.geometry.attributes.position.array.slice();
 function animate(t,mode='cruise'){const speed=mode==='burst'?7:3.3;const phase=t*speed;const p=body.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=rest[i*3],weight=Math.max(0,(-x+.2)/3.6);p.setZ(i,rest[i*3+2]+Math.sin(phase+x*.9)*weight*weight*.25);}p.needsUpdate=true;body.geometry.computeVertexNormals();tail.position.z=Math.sin(phase-3.3*.9)*.24;tail.rotation.y=Math.cos(phase-2.8)*.28;fluke.rotation.y=Math.sin(phase-3.1)*.18;jaw.rotation.z=-.018*(.5+.5*Math.sin(t*1.6));pectorals.forEach(([f,s])=>f.rotation.x=s*Math.sin(t*1.5)*.025);group.position.y=Math.sin(t*1.5)*.065;group.rotation.x=Math.sin(t*1.1)*.025;}
 return {group,body,tail,fluke,jaw,animate,style};
}




