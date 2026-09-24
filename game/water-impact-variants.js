import * as THREE from 'three';

export const WATER_VARIANTS=[
  {name:'① 水冠衝擊',height:2.6,width:1.35,spread:2.8,jets:9,jetWidth:.36,profile:0},
  {name:'② 高壓水柱',height:6.2,width:.95,spread:1.4,jets:5,jetWidth:.34,profile:1},
  {name:'③ 厚浪翻湧',height:4.1,width:1.85,spread:2.2,jets:6,jetWidth:.46,profile:2},
  {name:'④ 放射爆濺',height:3.2,width:1.05,spread:4.3,jets:10,jetWidth:.38,profile:3},
];
const UP=new THREE.Vector3(0,1,0);
const dummy=new THREE.Object3D();
const bottomColor=new THREE.Color('#1385a2'),topColor=new THREE.Color('#dcfffc'),color=new THREE.Color();

// Closed deformable meshes carry thickness, silhouettes and true 3D lighting.
// No camera-facing splash cards or sprite sheet animation.
function tube(material,rings=20,sides=16){
  const geometry=new THREE.BufferGeometry(),vertices=(rings+1)*(sides+1),position=new Float32Array(vertices*3),colors=new Float32Array(vertices*3),indices=[];
  for(let y=0;y<rings;y++)for(let x=0;x<sides;x++){const a=y*(sides+1)+x,b=a+sides+1;indices.push(a,a+1,b,b,a+1,b+1);}
  geometry.setIndex(indices);geometry.setAttribute('position',new THREE.BufferAttribute(position,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3).setUsage(THREE.DynamicDrawUsage));
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
  const tangent=new THREE.Vector3(),axis=new THREE.Vector3(),binormal=new THREE.Vector3(),point=new THREE.Vector3(),next=new THREE.Vector3();
  return {mesh,update(path,radius,time){
    for(let y=0;y<=rings;y++){
      const s=y/rings;path(s,point);path(Math.min(1,s+.002),next);
      if(s===1){path(s-.002,next);tangent.subVectors(point,next);}else tangent.subVectors(next,point);
      tangent.normalize();axis.crossVectors(tangent,Math.abs(tangent.y)>.95?new THREE.Vector3(1,0,0):UP).normalize();binormal.crossVectors(tangent,axis);
      const r=(s===0||s===1)?.001:radius(s);
      for(let x=0;x<=sides;x++){
        const angle=x/sides*Math.PI*2,wobble=1+.10*Math.sin(angle*5+s*17-time*7)+.05*Math.sin(angle*3-s*24+time*9),k=(y*(sides+1)+x)*3;
        position[k]=point.x+(axis.x*Math.cos(angle)+binormal.x*Math.sin(angle))*r*wobble;
        position[k+1]=point.y+(axis.y*Math.cos(angle)+binormal.y*Math.sin(angle))*r*wobble;
        position[k+2]=point.z+(axis.z*Math.cos(angle)+binormal.z*Math.sin(angle))*r*wobble;
        const foam=THREE.MathUtils.smoothstep(s+.055*Math.sin(angle*5+s*20-time*4),.55,.94);
        color.copy(bottomColor).lerp(topColor,foam);color.toArray(colors,k);
      }
    }
    geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;geometry.computeVertexNormals();
  }};
}

export function createWaterImpact(index,{surfaces=true}={}){
  const cfg=WATER_VARIANTS[index],group=new THREE.Group();
  const water=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.23,metalness:.05,clearcoat:1,clearcoatRoughness:.17});
  const core=tube(water,26,24);group.add(core.mesh);
  const jets=Array.from({length:cfg.jets},()=>{const jet=tube(water,16,12);group.add(jet.mesh);return jet;});
  const sphere=new THREE.SphereGeometry(1,10,7),foamMat=new THREE.MeshStandardMaterial({color:0xe6fff6,roughness:.64});
  const droplets=new THREE.InstancedMesh(sphere,new THREE.MeshPhysicalMaterial({color:0x8ce4ed,roughness:.21,clearcoat:1}),42);droplets.frustumCulled=false;group.add(droplets);
  const foam=new THREE.InstancedMesh(sphere,foamMat,64);foam.frustumCulled=false;group.add(foam);
  const rings=Array.from({length:3},()=>{const m=new THREE.Mesh(new THREE.TorusGeometry(1,.027,6,96),new THREE.MeshBasicMaterial({color:0xc2f7ef,transparent:true,depthWrite:false,opacity:0}));m.rotation.x=-Math.PI/2;m.position.y=.045;group.add(m);return m;});
  const crater=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:0x094659,transparent:true,depthWrite:false,opacity:0}));crater.rotation.x=-Math.PI/2;crater.position.y=.016;group.add(crater);
  let lastTime=-1,foamSeeds=[],dropSeeds=[];
  function scatter(){
    foamSeeds=Array.from({length:64},()=>({angle:Math.random()*Math.PI*2,radial:.55+Math.random()*1.1,speed:.65+Math.random()*1.15,size:.045+Math.random()**1.5*.17,stretch:.65+Math.random()*1.3,rotation:Math.random()*Math.PI*2,phase:Math.random()*6.28,delay:Math.random()*.15,jet:Math.floor(Math.random()*cfg.jets),along:.48+Math.random()*.49}));
    dropSeeds=Array.from({length:42},()=>({angle:Math.random()*Math.PI*2,speed:.4+Math.random()*.95,up:.75+Math.random()*.65,size:.035+Math.random()**1.4*.11,delay:.04+Math.random()*.18,stretch:1+Math.random()*1.2}));
  }
  scatter();
  function pathFor(j,s,t,grow,out){const a=j/cfg.jets*Math.PI*2+.13*Math.sin(j*4),radial=.3+cfg.spread*Math.pow(s,1.35)*grow;
    const arch=cfg.profile===3?Math.sin(s*Math.PI*.83):Math.sin(s*Math.PI*.60);
    out.set(Math.cos(a)*radial,cfg.height*(cfg.profile===1?.62:1)*arch*grow*(.85+.12*Math.sin(j*7))+.04,Math.sin(a)*radial);return out;}
  return {group,surfaceMeshes:[core.mesh,...jets.map(j=>j.mesh)],update(t){
    if(t<lastTime)scatter();lastTime=t;
    const grow=(1-Math.exp(-t*12))*(1-THREE.MathUtils.smoothstep(t,.65,1.8)),fade=1-THREE.MathUtils.smoothstep(t,1.35,2.4);
    group.visible=t>0&&t<2.4;core.mesh.visible=surfaces&&grow>.001;
    const coreH=cfg.height*(cfg.profile===0?.48:cfg.profile===3?.55:1);
    if(surfaces)core.update((s,out)=>out.set(Math.sin(s*4+t*2)*s*.16, .02+s*coreH*grow,Math.sin(s*5-t)*s*.13),s=>{
      const profile=cfg.profile===2?(.38+.65*Math.sin(s*Math.PI)):(cfg.profile===1?(.55+.38*Math.sin(s*Math.PI*.8)):(.95-.5*s));
      return cfg.width*profile*Math.pow(Math.sin(Math.PI*s),.28)*grow;
    },t);
    jets.forEach((jet,j)=>{jet.mesh.visible=surfaces&&grow>.001;if(surfaces)jet.update((s,out)=>pathFor(j,s,t,grow,out),s=>cfg.jetWidth*(1-s*.62)*Math.pow(Math.sin(Math.PI*s),.25)*grow,t+j);});
    for(let i=0;i<42;i++){
      const seed=dropSeeds[i],a=seed.angle,speed=cfg.spread*seed.speed,q=Math.max(0,t-seed.delay),y=.3+(cfg.height*seed.up+1.8)*q-6.2*q*q;
      dummy.position.set(Math.cos(a)*speed*q,Math.max(.02,y),Math.sin(a)*speed*q);dummy.rotation.set(.2*a,0,a);
      const size=y>0&&t>seed.delay?seed.size*fade:0;dummy.scale.set(size,size*(seed.stretch+Math.max(0,1-t)*.8),size);dummy.updateMatrix();droplets.setMatrixAt(i,dummy.matrix);
    }droplets.instanceMatrix.needsUpdate=true;
    const point=new THREE.Vector3();
    for(let i=0;i<64;i++){
      const seed=foamSeeds[i],age=Math.max(0,t-seed.delay);
      if(i<32){const a=seed.angle+Math.sin(t*1.4+seed.phase)*.045,r=cfg.width*seed.radial+age*seed.speed;
        dummy.position.set(Math.cos(a)*r,.045+Math.sin(t*3+seed.phase)*.018,Math.sin(a)*r);
        dummy.scale.set(seed.size*seed.stretch,seed.size*.36,seed.size).multiplyScalar(fade*(1-Math.exp(-age*15)));
      }else{pathFor(seed.jet,seed.along,t,grow,point);dummy.position.copy(point);const r=seed.size*.75*grow;dummy.scale.set(r*seed.stretch,r*.8,r);}
      dummy.rotation.set(0,seed.rotation+t*.12*Math.sin(seed.phase),0);dummy.updateMatrix();foam.setMatrixAt(i,dummy.matrix);
    }foam.instanceMatrix.needsUpdate=true;
    rings.forEach((r,i)=>{const age=t-i*.14;r.visible=age>0;r.scale.setScalar(.55+Math.max(0,age)*(3.1+i*.35));r.material.opacity=Math.max(0,.5-age*.24)*(1-i*.18);});
    crater.scale.setScalar(.15+(1-Math.exp(-t*15))*cfg.width);crater.material.opacity=Math.max(0,.5-t*.6);
  }};
}
