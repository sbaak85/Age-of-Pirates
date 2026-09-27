import * as T from 'three';
import {createPoseidon3K} from './poseidon-form-3k.js';
const V=p=>new T.Vector3(...p);
function geometry(v,f){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v.flat(),3));g.setIndex(f.flat());g.computeVertexNormals();return g;}
function replace(root,name,g,newName=name){const m=root.getObjectByName(name);m.geometry.dispose();m.geometry=g;m.name=newName;m.material.flatShading=false;return m;}
function remove(root,...names){for(const name of names){const m=root.getObjectByName(name);if(m){root.remove(m);m.geometry.dispose();m.material.dispose();}}}
function ringsGeometry(rows,caps=true){const n=rows[0].length,v=rows.flat(),f=[];for(let j=0;j<rows.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n;f.push([a,b,a+n],[b,b+n,a+n]);}if(caps)for(let i=1;i<n-1;i++){f.push([0,i+1,i]);const a=(rows.length-1)*n;f.push([a,a+i,a+i+1]);}return geometry(v,f);}
function sweep(points,widths,depths,steps,n=14){const path=new T.CatmullRomCurve3(points.map(V),false,'centripetal');const profile=new T.CatmullRomCurve3(widths.map((w,i)=>new T.Vector3(w,depths[i],0)),false,'catmullrom',.3);return Array.from({length:steps+1},(_,i)=>{const t=i/steps,p=path.getPoint(t),d=path.getTangent(t),u=new T.Vector3(0,0,1).cross(d).normalize(),v=d.clone().cross(u),s=profile.getPoint(t);return Array.from({length:n},(_,j)=>p.clone().addScaledVector(u,Math.cos((j+.5)*Math.PI*2/n)*s.x).addScaledVector(v,Math.sin((j+.5)*Math.PI*2/n)*s.y).toArray());});}
function joinShoulders(root){
 const torso=root.getObjectByName('連續胸背與腰胯'),g=torso.geometry,n=20,v=Array.from({length:g.attributes.position.count},(_,i)=>[g.attributes.position.getX(i),g.attributes.position.getY(i),g.attributes.position.getZ(i)]),f=[];
 const holes=[{lo:3,hi:7,j0:11,j1:14,side:1},{lo:13,hi:17,j0:11,j1:14,side:-1}];
 for(let j=0;j<15;j++)for(let i=0;i<n;i++){if(holes.some(h=>j>=h.j0&&j<h.j1&&i>=h.lo&&i<h.hi))continue;const a=j*n+i,b=j*n+(i+1)%n;f.push([a,b,a+n],[b,b+n,a+n]);}
 for(const h of holes){const b=[];for(let i=h.lo;i<h.hi;i++)b.push(h.j0*n+i);for(let j=h.j0;j<h.j1;j++)b.push(j*n+h.hi);for(let i=h.hi;i>h.lo;i--)b.push(h.j1*n+i);for(let j=h.j1;j>h.j0;j--)b.push(j*n+h.lo);
 const left=h.side<0,points=left?[[-1.58,8.65,-.02],[-1.87,8.47,.02],[-1.98,8.05,.06],[-2.01,7.69,.11],[-2.07,7.38,.19],[-2.2,7.37,.27],[-2.4,7.5,.34],[-2.67,7.79,.44],[-2.85,7.95,.48]]:[[1.58,8.65,-.04],[1.85,8.48,-.01],[1.94,8.08,.01],[1.85,7.72,.03],[1.88,7.26,.1],[1.86,6.98,.16],[1.79,6.57,.3],[1.73,6.02,.43]],width=left?[.52,.58,.52,.44,.37,.38,.42,.3,.25]:[.52,.57,.52,.42,.33,.35,.34,.23],depth=left?[.55,.59,.54,.45,.38,.38,.4,.29,.26]:[.55,.59,.54,.44,.36,.35,.33,.24];
 const rows=sweep(points,width,depth,16,b.length),first=rows[0];let best={cost:Infinity,shift:0,dir:1};for(const dir of [1,-1])for(let shift=0;shift<b.length;shift++){let cost=0;for(let i=0;i<b.length;i++)cost+=V(v[b[i]]).distanceToSquared(V(first[(shift+dir*i+b.length)%b.length]));if(cost<best.cost)best={cost,shift,dir};}
 const ordered=rows.map(row=>row.map((_,i)=>row[(best.shift+best.dir*i+b.length)%b.length]));
 // Two smooth shoulder transition rings, sharing the torso's exact boundary vertices.
 const rootCenter=V(left?[-1.48,8.57,-.025]:[1.48,8.57,-.05]);
 const mid=ordered[0].map((p,i)=>{const q=V(v[b[i]]).lerp(V(p),.52);const bulge=q.clone().sub(rootCenter).normalize().multiplyScalar(.09);return q.add(bulge).toArray();});
 let previous=b;for(const row of [mid,...ordered]){const ids=row.map(p=>{v.push(p);return v.length-1;});for(let i=0;i<b.length;i++){const k=(i+1)%b.length;f.push([previous[i],previous[k],ids[i]],[previous[k],ids[k],ids[i]]);}previous=ids;}
 for(let i=1;i<previous.length-1;i++)f.push([previous[0],previous[i],previous[i+1]]);
 }
 // Relax the attachment strip and adjacent shoulder vertices together, avoiding pinched fans.
 const neighbors=Array.from({length:v.length},()=>new Set());for(const tri of f)for(let k=0;k<3;k++){neighbors[tri[k]].add(tri[(k+1)%3]);neighbors[tri[k]].add(tri[(k+2)%3]);}
 const weights=v.map(p=>Math.max(T.MathUtils.smoothstep(Math.abs(p[0]),.95,1.4)*T.MathUtils.smoothstep(p[1],7.65,8.1)*(1-T.MathUtils.smoothstep(p[1],9.0,9.3)),.65*T.MathUtils.smoothstep(Math.abs(p[0]),1.55,1.9)*T.MathUtils.smoothstep(p[1],6.05,6.4)*(1-T.MathUtils.smoothstep(p[1],8.0,8.3))));
 for(let it=0;it<24;it++)for(const lambda of [.48,-.5]){const next=v.map((p,i)=>{const w=weights[i];if(!w||!neighbors[i].size)return p;const mean=new T.Vector3();for(const k of neighbors[i])mean.add(V(v[k]));mean.divideScalar(neighbors[i].size);return V(p).lerp(mean,lambda*w).toArray();});for(let i=0;i<v.length;i++)v[i]=next[i];}
 replace(root,'連續胸背與腰胯',geometry(v,f),'胸背肩肘共頂點連續曲面');remove(root,'外張持戟臂','垂落臂肩峰至腕');
}
function sculptFace(root){
 const rows=[],N=36,M=18;
 const profiles=[[9.7,.35,.35,.24],[9.9,.45,.39,.22],[10.1,.54,.44,.19],[10.3,.57,.46,.13],[10.5,.56,.44,.09],[10.7,.54,.42,.05],[10.95,.49,.38,0],[11.15,.37,.3,-.02]];
 const gaussian=(x,y,cx,cy,sx,sy)=>Math.exp(-1*((x-cx)/sx)**2-((y-cy)/sy)**2);
 for(let j=0;j<=M;j++){const y=9.7+j/M*1.45;let k=0;while(k<profiles.length-2&&profiles[k+1][0]<y)k++;const a=profiles[k],b=profiles[k+1],t=(y-a[0])/(b[0]-a[0]),rx=T.MathUtils.lerp(a[1],b[1],t),rz=T.MathUtils.lerp(a[2],b[2],t),cz=T.MathUtils.lerp(a[3],b[3],t);
 rows.push(Array.from({length:N},(_,i)=>{const ang=i/N*Math.PI*2,x=Math.sin(ang)*rx;let z=cz+Math.cos(ang)*rz;if(Math.cos(ang)>0){
 // Broad cheekbones, recessed sockets, knitted brow and continuous nasal bridge.
 z+=.10*gaussian(Math.abs(x),y,.35,10.23,.16,.14);
 z-=.14*gaussian(Math.abs(x),y,.25,10.4,.15,.095);
 z+=.13*gaussian(Math.abs(x),y,.23,10.53,.22,.075);
 z+=.19*gaussian(x,y,0,10.36,.095,.24)+.27*gaussian(x,y,0,10.15,.10,.085);
 z+=.11*gaussian(Math.abs(x),y,.12,10.12,.07,.05);
 z+=.045*gaussian(x,y,0,9.98,.24,.055);
 }return[x-.12,y,z];}));}
 replace(root,'下頷顴骨與額頭',ringsGeometry(rows),'連續眉眼顴骨鼻翼');remove(root,'壓低眉骨','壓低眉骨','深眼窩','深眼窩','鼻樑與鼻翼');
 // Inset carved eyes, restrained lids rather than black triangular stickers.
 const face=root.getObjectByName('連續眉眼顴骨鼻翼');root.updateMatrixWorld(true);const ray=new T.Raycaster();
 for(const sign of[-1,1]){const cx=-.12+sign*.255,cy=10.393,ev=[],ef=[];
 const sample=(x,y)=>{ray.set(new T.Vector3(x,y,2),new T.Vector3(0,0,-1));return ray.intersectObject(face)[0]?.point.z??.45;};
 ev.push([cx,cy,sample(cx,cy)+.009]);
 for(let i=0;i<12;i++){const a=i*Math.PI/6,dx=Math.cos(a)*.12,dy=Math.sin(a)*.03+sign*dx*.16,x=cx+dx,y=cy+dy;ev.push([x,y,sample(x,y)+.008]);}
 for(let i=0;i<12;i++)ef.push([0,1+i,1+(i+1)%12]);
 const eye=new T.Mesh(geometry(ev,ef),new T.MeshStandardMaterial({color:0x777f73,roughness:1,side:T.DoubleSide}));eye.name='內嵌杏形眼裂';root.add(eye);}
 // A rounded jaw-to-beard transition replaces the hard upper beard ledge.
 const br=[];for(let j=0;j<8;j++){const t=j/7,y=9.04+t*1.0,w=.055+.43*Math.sin(t*Math.PI*.58)-.07*T.MathUtils.smoothstep(t,.75,1),d=.095+.21*Math.sin(t*Math.PI*.8),z=.53+.065*Math.sin(t*Math.PI)-.17*T.MathUtils.smoothstep(t,.75,1);br.push(Array.from({length:14},(_,i)=>{const a=i/14*Math.PI*2;return[-.12+Math.sin(a)*w,y,z+Math.cos(a)*d];}));}
 replace(root,'長鬚主體',ringsGeometry(br)); // Flowing moustache ties the nose and mouth to the long beard.
 const mat=root.getObjectByName('長鬚主體').material;
 for(const s of[-1,1]){const rows=sweep([[-.12+s*.035,10.04,.77],[-.12+s*.18,9.99,.82],[-.12+s*.32,9.91,.81],[-.12+s*.39,9.79,.74]],[.075,.09,.08,.03],[.05,.07,.065,.025],5,6);const m=new T.Mesh(ringsGeometry(rows),mat.clone());m.name='唇鬚與頰鬚銜接';m.castShadow=m.receiveShadow=true;root.add(m);}
}
export function createPoseidon6K(){const root=createPoseidon3K();root.name='Poseidon / face and continuous joints 6K';joinShoulders(root);sculptFace(root);
 for(const[name,p,w,d]of[
 ['右側承重腿',[[.68,.68,.08],[.7,1.37,.05],[.7,2.15,.07],[.67,2.72,.12],[.64,3.03,.18],[.58,3.37,.16],[.48,4.18,.04],[.43,5.25,-.02]],[.3,.37,.46,.4,.4,.48,.65,.62],[.36,.4,.49,.43,.46,.52,.64,.6]],
 ['左側前踏腿',[[-.8,.68,.54],[-.86,1.39,.6],[-1.01,2.15,.71],[-1,2.68,.8],[-.98,2.98,.81],[-.87,3.35,.73],[-.65,4.2,.35],[-.46,5.3,.02]],[.3,.35,.45,.4,.4,.49,.63,.6],[.36,.4,.48,.44,.47,.53,.64,.6]]])replace(root,name,ringsGeometry(sweep(p,w,d,13,14)));
 replace(root,'厚實頸部',ringsGeometry(sweep([[-.04,9.13,-.07],[-.08,9.43,-.04],[-.13,9.89,.04]],[.51,.44,.41],[.45,.42,.38],6,12)));
 replace(root,'握戟手掌',ringsGeometry(sweep([[-2.86,7.77,.48],[-2.92,7.99,.5],[-2.91,8.19,.49]],[.29,.33,.25],[.31,.33,.26],5,10)));
 replace(root,'垂落手掌',ringsGeometry(sweep([[1.73,6.02,.43],[1.76,5.76,.5],[1.67,5.49,.58]],[.24,.27,.19],[.24,.23,.16],5,10)));
 root.userData={status:'face-and-joints-review',approved:false,baseline:'3062 triangle substantial form',targetTriangles:6000};return root;}







