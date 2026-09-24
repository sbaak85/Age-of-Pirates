import * as THREE from 'three';
import { createChest } from './models.js';
import { CombatExplosions, IMPACT_SCALE, MIN_KILL_SCALE } from './combat-explosions.js';
import { WaterImpactPool } from './water-impact-pool.js';

export class Sound {
  constructor(){this.context=null;this.master=null;this.volume=.65;this.muted=false;this.noise=null;}
  unlock(){
    if(this.context){this.context.resume();return;}
    const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
    this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=this.muted?0:this.volume;this.master.connect(this.context.destination);
    const rate=this.context.sampleRate,length=Math.round(rate*.8),buffer=this.context.createBuffer(1,length,rate),data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/length*3);this.noise=buffer;
  }
  setVolume(value){this.volume=value;if(this.master)this.master.gain.value=this.muted?0:value;}
  setMuted(value){this.muted=value;this.setVolume(this.volume);}
  tone(freq,duration,volume=.1,type='sine',end=freq){
    if(!this.context)return;const c=this.context,t=c.currentTime,o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g).connect(this.master);o.start(t);o.stop(t+duration+.02);
  }
  burst(duration=.3,volume=.15,low=100,high=2400){
    if(!this.context)return;const c=this.context,t=c.currentTime,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
    source.buffer=this.noise;filter.type='bandpass';filter.Q.value=.46;filter.frequency.setValueAtTime(high,t);filter.frequency.exponentialRampToValueAtTime(low,t+duration);
    gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    source.connect(filter).connect(gain).connect(this.master);source.start(t);source.stop(t+duration);
  }
  cannon(){this.tone(110,.39,.19,'sawtooth',35);this.burst(.38,.23,90,950);}
  hit(){this.tone(180,.23,.12,'triangle',50);this.burst(.22,.14,140,1500);}
  damage(){this.tone(105,.37,.16,'sawtooth',32);this.burst(.27,.16,80,700);}
  kill(){this.burst(.55,.22,60,1200);this.tone(270,.42,.12,'triangle',55);}
  chest(){this.tone(523,.18,.09,'sine',660);setTimeout(()=>this.tone(784,.28,.09,'sine',988),110);}
  sail(){this.tone(392,.14,.05,'sine',523);}
  ui(){this.tone(620,.075,.028,'sine',780);}
}

export class Effects {
  constructor(scene){
    this.combat=new CombatExplosions(scene);
    this.water=new WaterImpactPool(scene);
    this.scene=scene;this.count=560;this.particles=Array.from({length:this.count},()=>({life:0}));this.cursor=0;
    const geometry=new THREE.BufferGeometry(),positions=new Float32Array(this.count*3),colors=new Float32Array(this.count*3);
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3).setUsage(THREE.DynamicDrawUsage));
    geometry.setDrawRange(0,this.count);
    this.geometry=geometry;this.positions=positions;this.colors=colors;
    const material=new THREE.PointsMaterial({size:.32,transparent:true,opacity:.92,vertexColors:true,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
    this.points=new THREE.Points(geometry,material);this.points.frustumCulled=false;this.points.renderOrder=12;scene.add(this.points);
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d'),grad=ctx.createRadialGradient(32,32,0,32,32,31);
    grad.addColorStop(0,'rgba(255,255,255,1)');grad.addColorStop(.28,'rgba(255,238,184,.93)');grad.addColorStop(.65,'rgba(255,148,57,.35)');grad.addColorStop(1,'rgba(255,130,50,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);
    this.flashTexture=new THREE.CanvasTexture(canvas);
    this.sprites=[];this.rings=[];
  }
  particle(x,y,z,vx,vy,vz,life,color,size=1){
    const p=this.particles[this.cursor];Object.assign(p,{x,y,z,vx,vy,vz,life,maxLife:life,size,color:new THREE.Color(color)});this.cursor=(this.cursor+1)%this.count;
  }
  burst(x,y,z,kind='impact',count=18){
    const palette=kind==='water'?[0xcdf9ef,0x66bbcc,0xffffff]:kind==='treasure'?[0xffe286,0xeec054,0xffffff]:[0xfff0a8,0xffb251,0xf46d41,0x5b6260];
    for(let i=0;i<count;i++){
      const a=Math.random()*Math.PI*2,speed=(.8+Math.random()*2.8)*(kind==='muzzle'?.7:1),up=Math.random()*2.2;
      this.particle(x,y,z,Math.cos(a)*speed,up,Math.sin(a)*speed,.35+Math.random()*.7,palette[i%palette.length]);
    }
    if(kind==='impact'||kind==='muzzle')this.flash(x,y,z,kind==='muzzle'?.85:1.5,kind==='muzzle'?.17:.28);
    if(kind==='impact'||kind==='water')this.ring(x,z,kind==='impact'?0:.08,kind==='impact'?0xffc671:0xd9f9f4);
  }
  flash(x,y,z,size,life){const material=new THREE.SpriteMaterial({map:this.flashTexture,color:0xffe7a1,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});const sprite=new THREE.Sprite(material);sprite.position.set(x,y,z);sprite.scale.setScalar(size);sprite.renderOrder=12;this.scene.add(sprite);this.sprites.push({sprite,life,maxLife:life,size});}
  ring(x,z,y,color){const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false});const ring=new THREE.Mesh(new THREE.RingGeometry(.20,.26,24),material);ring.rotation.x=-Math.PI/2;ring.position.set(x,y+.035,z);ring.renderOrder=12;this.scene.add(ring);this.rings.push({ring,life:.42});}
  explosion(x,y,z,kind='impact',scale=kind==='impact'?IMPACT_SCALE:MIN_KILL_SCALE){
    if(kind==='kill')scale=Math.max(MIN_KILL_SCALE,scale);
    this.combat.spawn(kind,x,y,z,scale);
    this.flash(x,y,z,(kind==='kill'?2.5:.7)*scale,kind==='kill'?.23:.10);
  }
  clear(){
    this.combat.clear();this.water.clear();for(const p of this.particles)p.life=0;
    for(const p of this.sprites){this.scene.remove(p.sprite);p.sprite.material.dispose();}this.sprites=[];
    for(const p of this.rings){this.scene.remove(p.ring);p.ring.geometry.dispose();p.ring.material.dispose();}this.rings=[];
  }
  update(dt,camera){
    this.combat.update(dt,camera);
    this.water.update(dt,camera);
    const pos=this.positions,col=this.colors;
    for(let i=0;i<this.count;i++){
      const p=this.particles[i],o=i*3;
      if(p.life>0){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vx*=Math.exp(-1.8*dt);p.vz*=Math.exp(-1.8*dt);p.vy-=3.0*dt;
        const fade=Math.max(0,p.life/p.maxLife);pos[o]=p.x;pos[o+1]=p.y;pos[o+2]=p.z;col[o]=p.color.r*fade;col[o+1]=p.color.g*fade;col[o+2]=p.color.b*fade;
      }else{pos[o+1]=-1000;col[o]=col[o+1]=col[o+2]=0;}
    }
    this.geometry.attributes.position.needsUpdate=true;this.geometry.attributes.color.needsUpdate=true;
    for(let i=this.sprites.length-1;i>=0;i--){const p=this.sprites[i];p.life-=dt;p.sprite.material.opacity=Math.max(0,p.life/p.maxLife);p.sprite.scale.setScalar(p.size*(1.1-p.life/p.maxLife*.3));if(p.life<=0){this.scene.remove(p.sprite);p.sprite.material.dispose();this.sprites.splice(i,1);}}
    for(let i=this.rings.length-1;i>=0;i--){const p=this.rings[i];p.life-=dt;p.ring.scale.setScalar(1+(1-p.life/.42)*5);p.ring.material.opacity=Math.max(0,p.life/.42*.5);if(p.life<=0){this.scene.remove(p.ring);p.ring.geometry.dispose();p.ring.material.dispose();this.rings.splice(i,1);}}
  }
}

export function spawnChest(scene,x,z,time){
  const group=createChest();group.position.set(x,.28,z);group.scale.setScalar(.001);scene.add(group);
  return {group,x,z,born:time,alive:true,update(now){
    const age=now-time;
    const pop=Math.min(1,age/.62),overshoot=1+Math.sin(pop*Math.PI)*.22;
    group.scale.setScalar(Math.max(.001,pop*overshoot));
    group.position.y=.30+Math.sin(Math.min(1,age/.8)*Math.PI)*.82+Math.sin(age*2.2)*.08;
    group.rotation.y=age*.72;
  }};
}
