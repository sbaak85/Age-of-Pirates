import * as THREE from 'three';
import {KRAKEN_SPAWNS,KRAKEN_EXCLUSION_ZONES} from './kraken-population.js';

export function createKrakenDistributionPreview(){
 const group=new THREE.Group();group.visible=false;
 for(const zone of KRAKEN_EXCLUSION_ZONES){
  const line=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(zone.points.map(([x,z])=>new THREE.Vector3(x,1,z))),new THREE.LineBasicMaterial({color:0xffe33b,transparent:true,depthWrite:false,depthTest:false}));
  line.renderOrder=30;group.add(line);
  const shape=new THREE.Shape(zone.points.map(([x,z])=>new THREE.Vector2(x,-z)));
  const fill=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:0xffd943,transparent:true,opacity:.10,depthWrite:false,depthTest:false}));
  fill.rotation.x=-Math.PI/2;fill.position.y=.8;fill.renderOrder=20;group.add(fill);
 }
 KRAKEN_SPAWNS.forEach((spawn,i)=>{
  const [x,z]=spawn.start,ring=new THREE.Mesh(new THREE.RingGeometry(5.4,6.7,48),new THREE.MeshBasicMaterial({color:0xff413e,side:THREE.DoubleSide,transparent:true,depthWrite:false,depthTest:false}));
  ring.rotation.x=-Math.PI/2;ring.position.set(x,1.2,z);ring.renderOrder=35;group.add(ring);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');
  ctx.font='bold 42px sans-serif';ctx.textAlign='center';ctx.lineWidth=7;ctx.strokeStyle='#14313a';ctx.fillStyle='#fff4da';
  const label=`${i+1} · ${spawn.location}`;ctx.strokeText(label,256,48);ctx.fillText(label,256,48);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:false}));
  sprite.position.set(x,9,z-12);sprite.scale.set(120,22.5,1);sprite.renderOrder=36;group.add(sprite);
 });
 return group;
}
