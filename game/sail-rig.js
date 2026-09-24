import * as THREE from 'three';
import {sailPoint,sailEase} from './sail-motion.js';
export function createSailController(parts){
  const {sailGroup,sailRig,jib,jibEdge}=parts;
  sailGroup.userData.dynamic=true;
  const ropeMaterial=new THREE.MeshStandardMaterial({color:0xc5a976,roughness:.92});
  const up=new THREE.Vector3(0,1,0),start=new THREE.Vector3(),end=new THREE.Vector3(),direction=new THREE.Vector3(),point={};
  for(const rig of sailRig){
    rig.cloth.frustumCulled=false;
    rig.edges=rig.edges.map(mesh=>{
      mesh.frustumCulled=false;
      const base=mesh.geometry.attributes.position.array.slice();
      return {mesh,base};
    });
    for(const sheet of rig.sheets)sheet.length=sheet.mesh.geometry.parameters.height;
    rig.ties=[];
    for(const u of [.12,.37,.63,.88]){
      const tie=new THREE.Mesh(new THREE.TorusGeometry(1,.11,6,20),ropeMaterial);
      tie.position.set(rig.x+.12,rig.top-.095,(u-.5)*rig.width);
      tie.castShadow=true;sailGroup.add(tie);rig.ties.push(tie);
    }
  }
  // Subdivide the triangular jib so it gathers into folds along its diagonal stay.
  const vertices=[],indices=[],uv=[],n=18,rows=[];
  for(let i=0;i<=n;i++){
    rows.push(vertices.length/3);
    for(let j=0;j<=n-i;j++){
      const b=i/n,c=j/n,a=1-b-c;
      vertices.push(a*1.82+b*4.88+c*2.31,a*5.25+b*2.57+c*2.48,.04+.32*Math.sin(Math.PI*c)*Math.sin(Math.PI*b));uv.push(b, a);
    }
  }
  for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){
    const a=rows[i]+j,b=rows[i+1]+j;
    indices.push(a,b,a+1);if(j<n-i-1)indices.push(a+1,b,b+1);
  }
  jib.geometry.dispose();jib.geometry=new THREE.BufferGeometry();
  jib.geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));jib.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));jib.geometry.setIndex(indices);
  const jibItems=[jib,jibEdge].map(mesh=>{mesh.frustumCulled=false;return {mesh,base:mesh.geometry.attributes.position.array.slice()};});
  let lastProgress=-1,lastTime=-1;
  return {update(progress,time){
    if(progress===lastProgress&&(time===lastTime||progress===0))return;
    lastProgress=progress;lastTime=time;
    for(const rig of sailRig){
      const positions=rig.cloth.geometry.attributes.position,uvs=rig.cloth.geometry.attributes.uv;
      for(let i=0;i<positions.count;i++){
        sailPoint(rig,uvs.getX(i),1-uvs.getY(i),progress,time,point);positions.setXYZ(i,point.x,point.y,point.z);
      }
      positions.needsUpdate=true;rig.cloth.geometry.computeVertexNormals();
      for(const {mesh,base} of rig.edges){
        const pos=mesh.geometry.attributes.position;
        for(let i=0;i<pos.count;i++){
          const k=i*3,v=THREE.MathUtils.clamp((rig.top-base[k+1])/rig.height,0,1);
          const u=base[k+2]>0?1:0;
          sailPoint(rig,u,v,progress,time,point);
          pos.setXYZ(i,point.x+base[k]-rig.x-.14,point.y+(base[k+1]-rig.top+v*rig.height),point.z+base[k+2]-(u-.5)*rig.width*(1-.18*v));
        }
        pos.needsUpdate=true;mesh.geometry.computeVertexNormals();
      }
      for(const {side,mesh,length} of rig.sheets){
        sailPoint(rig,side>0?1:0,1,progress,time,point);start.set(point.x,point.y,point.z);end.set(rig.x+.5,1.65,side*1.24);
        direction.subVectors(end,start);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.scale.y=direction.length()/length;mesh.quaternion.setFromUnitVectors(up,direction.normalize());
      }
      const tightening=1-sailEase(Math.min(1,progress/.45));
      for(const tie of rig.ties){const r=.015+(.105+rig.height*.027)*.65*tightening;tie.scale.set(r,r,r);}
    }
    const p=sailEase(progress);
    for(const {mesh,base} of jibItems){
      const pos=mesh.geometry.attributes.position;
      for(let i=0;i<pos.count;i++){
        const k=i*3,x=base[k],y=base[k+1],z=base[k+2];
        const t=THREE.MathUtils.clamp(((x-1.82)*3.06+(y-5.25)*-2.68)/16.546,0,1);
        const lateral=(x-1.82)*.659+(y-5.25)*.752;
        const a=lateral*5.6,r=.072*(1+.18*Math.sin(t*48));
        const foldedX=1.82+3.06*t+Math.cos(a)*r*.659,foldedY=5.25-2.68*t+Math.cos(a)*r*.752;
        pos.setXYZ(i,foldedX*(1-p)+x*p,foldedY*(1-p)+y*p,(.04+Math.sin(a)*r)*(1-p)+z*p);
      }
      pos.needsUpdate=true;mesh.geometry.computeVertexNormals();
    }
  }};
}
