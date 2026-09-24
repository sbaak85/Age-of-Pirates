import * as THREE from 'three';
import { explosionBFragment } from './explosion-b-volume.js';
import { explosionCFragment } from './explosion-c-volume.js';

const CONFIG={impact:{limit:8,life:1.5,referenceY:.65,size:[4.8,3.87,4.8],center:2.065,chunks:12,sparks:32,shader:explosionCFragment},kill:{limit:3,life:4.2,referenceY:1.1,size:[14,11.87,14],center:6.065,chunks:32,sparks:100,shader:explosionBFragment}};
export const IMPACT_SCALE=4.5;
export const MIN_KILL_SCALE=2;
// Match the main fireball's roughly six-unit peak diameter, not its empty
// raymarch bounding box or the radius reached by flying debris.
export function targetExplosionSize(model){
  model.updateWorldMatrix(true,true);
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const scale=Math.max(MIN_KILL_SCALE,Math.max(size.x,size.y,size.z)/6);
  return {scale,center};
}
const vertexShader=`varying vec3 vWorld;void main(){vWorld=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
function gameShader(source){
  // Local-space density and first occupied depth keep effects attached to their
  // impact position and avoid testing the distant back face against the hull.
  return source.replace('uniform float uTime;','uniform float uTime;uniform mat4 uToClip;')
    .replace('void main(){','void main(){bool depthSet=false;')
    .replace(/if\((density|d)>\.01(2)?\)\{/,'$& if(!depthSet){vec4 clip=uToClip*vec4(p,1.);gl_FragDepth=clip.z/clip.w*.5+.5;depthSet=true;}')
    .replace(/gl_FragColor=vec4\(sum.rgb\/max\(sum.a,.001\),sum.a\);/,`gl_FragColor=vec4(sum.rgb/max(sum.a,.001),sum.a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    `);
}

export class CombatExplosions {
  constructor(scene){
    this.scene=scene;this.slots=[];this.serial=0;this.dummy=new THREE.Object3D();this.eye=new THREE.Vector3();this.viewProjection=new THREE.Matrix4();
    const rock=new THREE.DodecahedronGeometry(1,0),ring=new THREE.RingGeometry(.94,1,48),haloGeometry=new THREE.TorusGeometry(1,.018,6,96);
    for(const [kind,c]of Object.entries(CONFIG)){
      const box=new THREE.BoxGeometry(...c.size).translate(0,c.center,0);
      for(let i=0;i<c.limit;i++){
        const group=new THREE.Group();group.visible=false;scene.add(group);
        const material=new THREE.ShaderMaterial({vertexShader,fragmentShader:gameShader(c.shader),side:THREE.BackSide,transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uEye:{value:new THREE.Vector3()},uToClip:{value:new THREE.Matrix4()}}});
        const volume=new THREE.Mesh(box,material);group.add(volume);
        const debrisMaterial=new THREE.MeshStandardMaterial({color:0x302323,roughness:.8,metalness:.22,emissive:0xff4308});
        const debris=new THREE.InstancedMesh(rock,debrisMaterial,c.chunks);debris.frustumCulled=false;debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(debris);
        const positions=new Float32Array(c.sparks*6),colors=new Float32Array(c.sparks*6),geometry=new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3).setUsage(THREE.DynamicDrawUsage));
        const sparks=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));sparks.frustumCulled=false;group.add(sparks);
        const shock=new THREE.Mesh(ring,new THREE.MeshBasicMaterial({color:0xffc289,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));shock.rotation.x=-Math.PI/2;shock.position.y=c.referenceY;group.add(shock);
        const halo=kind==="kill"?new THREE.Mesh(haloGeometry,new THREE.MeshBasicMaterial({color:0xffa323,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false})):null; if(halo){halo.rotation.x=Math.PI/2;group.add(halo);}
        this.slots.push({kind,c,group,volume,debris,sparks,shock,halo,positions,colors,age:0,active:false,serial:0,chunks:[],embers:[]});
      }
    }
    // A fixed light count avoids shader recompilation for every shell impact.
    this.lights=Array.from({length:2},()=>{const light=new THREE.PointLight(0xff982e,0,15,2);scene.add(light);return light;});
  }
  spawn(kind,x,y,z,scale=kind==='impact'?IMPACT_SCALE:MIN_KILL_SCALE){
    if(kind==='kill')scale=Math.max(MIN_KILL_SCALE,scale);
    const slots=this.slots.filter(s=>s.kind===kind);
    const s=slots.find(s=>!s.active)||slots.reduce((a,b)=>a.serial<b.serial?a:b);
    s.active=true;s.age=0;s.serial=++this.serial;s.group.scale.setScalar(scale);s.group.position.set(x,y-s.c.referenceY*scale,z);s.group.visible=true;
    const small=kind==='impact';
    s.chunks=Array.from({length:s.c.chunks},()=>{const a=Math.random()*Math.PI*2,speed=small?1+Math.random()*2.5:2+Math.random()*6;return {vx:Math.cos(a)*speed,vz:Math.sin(a)*speed,vy:small?1.5+Math.random()*3:3+Math.random()*9,size:small?.025+Math.random()**2*.075:.045+Math.random()**2*.21,spin:Math.random()*8};});
    s.embers=Array.from({length:s.c.sparks},()=>{const a=Math.random()*Math.PI*2,speed=small?1+Math.random()*3.5:2+Math.random()*9;return{vx:Math.cos(a)*speed,vz:Math.sin(a)*speed,vy:small?1+Math.random()*4:2+Math.random()*12,life:small?.18+Math.random()*.4:.5+Math.random()*1.6};});
  }
  clear(){for(const s of this.slots){s.active=false;s.group.visible=false;}for(const l of this.lights)l.intensity=0;}
  update(dt,camera){
    camera.updateMatrixWorld();this.viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    const candidates=[];
    for(const s of this.slots){
      if(!s.active)continue;s.age+=dt;const t=Math.max(.001,s.age),small=s.kind==='impact';
      if(t>=s.c.life){s.active=false;s.group.visible=false;continue;}
      s.group.updateMatrixWorld(true);
      s.volume.material.uniforms.uTime.value=t;
      s.volume.material.uniforms.uEye.value.copy(camera.position);s.group.worldToLocal(s.volume.material.uniforms.uEye.value);
      s.volume.material.uniforms.uToClip.value.multiplyMatrices(this.viewProjection,s.group.matrixWorld);
      s.debris.material.emissiveIntensity=.9*Math.exp(-t*2.4);
      s.chunks.forEach((c,i)=>{
        const h=s.c.referenceY,hit=(c.vy+Math.sqrt(c.vy*c.vy+19.6*h))/9.8;
        let y=h+c.vy*t-4.9*t*t,travel=t;
        if(t>hit){const b=t-hit;y=.15+Math.max(0,c.vy*.24*b-4.9*b*b);travel=hit+(1-Math.exp(-b*3))*.45;}
        this.dummy.position.set(c.vx*travel,y,c.vz*travel);this.dummy.rotation.set(t*c.spin,t*c.spin*.7,c.spin);
        const size=c.size*(1-THREE.MathUtils.smoothstep(t,small?.7:3.4,s.c.life));this.dummy.scale.set(size*.65,size*1.5,size*.85);this.dummy.updateMatrix();s.debris.setMatrixAt(i,this.dummy.matrix);
      });s.debris.instanceMatrix.needsUpdate=true;
      s.embers.forEach((e,i)=>{for(let end=0;end<2;end++){const q=Math.max(0,t-end*.025),k=i*6+end*3; s.positions[k]=e.vx*q;s.positions[k+1]=Math.max(.14,s.c.referenceY+e.vy*q-4*q*q);s.positions[k+2]=e.vz*q;const b=t<e.life?(1-t/e.life)*(end?.7:3):0;s.colors[k]=b;s.colors[k+1]=b*.48;s.colors[k+2]=b*.08;}});
      s.sparks.geometry.attributes.position.needsUpdate=true;s.sparks.geometry.attributes.color.needsUpdate=true;
      s.shock.scale.setScalar(small?.2+t*5:1+t*13);s.shock.material.opacity=Math.max(0,small?.6-t*2.8:.8-t*1.4);
      if(s.halo){s.halo.position.y=1.1+t*1.25;s.halo.scale.setScalar(1+Math.min(t,1.3)*5);s.halo.material.opacity=(1-THREE.MathUtils.smoothstep(t,.25,1.05))*.85;}
      const intensity=small?650*Math.exp(-t*14)+45*Math.exp(-t*7):1800*Math.exp(-t*4)+200*Math.exp(-t*1.8);
      candidates.push({s,intensity});
    }
    candidates.sort((a,b)=>b.intensity-a.intensity);
    this.lights.forEach((l,i)=>{const item=candidates[i];l.intensity=item?.intensity||0;if(item){const scale=item.s.group.scale.x;l.position.copy(item.s.group.position).y+=(item.s.c.referenceY+.3)*scale;l.distance=15*scale;}});
  }
}
