import * as THREE from 'three';

const material=new Map();
function mat(color){if(!material.has(color))material.set(color,new THREE.MeshStandardMaterial({color,roughness:.94,flatShading:true}));return material.get(color);}
function box(root,name,x,y,z,w,h,d,color){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;}
function span(root,name,a,b,y,width,height,color){const length=Math.hypot(b[0]-a[0],b[1]-a[1]);const o=box(root,name,(a[0]+b[0])/2,y,(a[1]+b[1])/2,width,height,length,color);o.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);return o;}

// Read each placed home's actual mesh extent. The fjord town places homes in
// this local coordinate system; their parent rotation is deliberately excluded.
function homeFootprints(homes){return homes.map(home=>{
 home.updateWorldMatrix(true,true);const inverse=home.matrixWorld.clone().invert(),bounds=new THREE.Box3();
 home.traverse(mesh=>{if(!mesh.isMesh)return;mesh.geometry.computeBoundingBox();
  const local=new THREE.Box3().copy(mesh.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));bounds.union(local);
 });
 return {x:home.position.x,z:home.position.z,c:Math.cos(home.rotation.y),s:Math.sin(home.rotation.y),scale:home.scale.x,
  minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z};
});}
function nearHome(x,z,homes,margin){return homes.some(h=>{
 const dx=x-h.x,dz=z-h.z,lx=(h.c*dx-h.s*dz)/h.scale,lz=(h.s*dx+h.c*dz)/h.scale,clear=margin/h.scale;
 return lx>=h.minX-clear&&lx<=h.maxX+clear&&lz>=h.minZ-clear&&lz<=h.maxZ+clear;
});}

const GRID=1.1,GRID_X=-55,GRID_Z=-52,NX=101,NZ=84;
const gridKey=(i,j)=>j*NX+i;
function makeRouter(heightAt,homes,width,allowNarrowWater=false){
 const cache=new Map(),clearance=width/2+.22;
 const node=(i,j)=>{if(i<0||i>=NX||j<0||j>=NZ)return null;const key=gridKey(i,j);if(cache.has(key))return cache.get(key);
  const x=GRID_X+i*GRID,z=GRID_Z+j*GRID,ground=heightAt(x,z);
  const nearLand=ground>=2||allowNarrowWater&&[[2.6,0],[-2.6,0],[0,2.6],[0,-2.6]].some(([dx,dz])=>heightAt(x+dx,z+dz)>=2);
  const result=nearLand&&!nearHome(x,z,homes,clearance)?{i,j,x,z,y:Math.max(2.1,ground),ground,key}:null;
  cache.set(key,result);return result;};
 const nearest=([x,z])=>{const ci=Math.round((x-GRID_X)/GRID),cj=Math.round((z-GRID_Z)/GRID),targetY=heightAt(x,z);let best=null,score=Infinity;
  for(let radius=0;radius<=10;radius++)for(let di=-radius;di<=radius;di++)for(let dj=-radius;dj<=radius;dj++){
   if(Math.max(Math.abs(di),Math.abs(dj))!==radius)continue;const n=node(ci+di,cj+dj);if(!n)continue;
   const value=Math.hypot(n.x-x,n.z-z)+Math.abs(n.y-targetY)*.8;
   if(value<score){best=n;score=value;}
  }
  return best;};
 // A small binary heap keeps route searches cheap even when 38 dense homes
 // occupy the cliffs. Height changes are allowed, then built as real stairs.
 const push=(heap,item)=>{heap.push(item);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p].f<=item.f)break;heap[i]=heap[p];i=p;}heap[i]=item;};
 const pop=heap=>{const top=heap[0],tail=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=tail.f)break;heap[i]=heap[c];i=c;}heap[i]=tail;}return top;};
 function segment(a,b,padding=13){const start=nearest(a),goal=nearest(b);if(!start||!goal)return [];
  const minX=Math.min(a[0],b[0])-padding,maxX=Math.max(a[0],b[0])+padding,minZ=Math.min(a[1],b[1])-padding,maxZ=Math.max(a[1],b[1])+padding;
  const open=[],gScore=new Map([[start.key,0]]),came=new Map(),closed=new Set();push(open,{n:start,f:Math.hypot(start.x-goal.x,start.z-goal.z)});
  while(open.length){const {n}=pop(open);if(closed.has(n.key))continue;closed.add(n.key);
   if(n.key===goal.key){const path=[n];let key=n.key;while(came.has(key)){key=came.get(key);path.push(cache.get(key));}return path.reverse();}
   for(const di of[-1,0,1])for(const dj of[-1,0,1]){if(!di&&!dj)continue;const next=node(n.i+di,n.j+dj);if(!next||closed.has(next.key)||next.x<minX||next.x>maxX||next.z<minZ||next.z>maxZ)continue;
    if(di&&dj&&(!node(n.i+di,n.j)||!node(n.i,n.j+dj)))continue;
    const cost=Math.hypot(di,dj)*GRID+Math.abs(next.y-n.y)*.75,score=gScore.get(n.key)+cost;
    if(score>=(gScore.get(next.key)??Infinity))continue;
    came.set(next.key,n.key);gScore.set(next.key,score);push(open,{n:next,f:score+Math.hypot(next.x-goal.x,next.z-goal.z)});
   }
  }
  return [];
 }
 return path=>{const sections=[],failedRoutes=[];let current=[];for(let k=1;k<path.length;k++){
  let segmentPath=segment(path[k-1],path[k]);if(!segmentPath.length)segmentPath=segment(path[k-1],path[k],25);
  if(!segmentPath.length){if(current.length>1)sections.push(current);current=[];failedRoutes.push([path[k-1],path[k]]);continue;}
  current.push(...(current.length?segmentPath.slice(1):segmentPath));
 }if(current.length>1)sections.push(current);return {sections,failedRoutes};};
}
function samplePath(points,from,to,distance){let remaining=distance;
 for(let i=from+1;i<=to;i++){const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.z-a.z);if(remaining<=length||i===to){const t=length?Math.min(1,remaining/length):0;return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,yaw:Math.atan2(b.x-a.x,b.z-a.z)};}remaining-=length;}
 return {x:points[to].x,z:points[to].z,yaw:0};}
function stoneStairs(group,points,from,to,width,low=points[from].y,high=points[to].y){
 if(to<=from)return [];let length=0;for(let i=from+1;i<=to;i++)length+=Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z);
 if(length<.1)return [];const count=Math.max(6,Math.ceil(length/.45),Math.ceil(Math.abs(high-low)/.24)),run=length/count,bottom=Math.min(low,high)-.12,steps=[];
 for(let i=0;i<count;i++){const at=samplePath(points,from,to,(i+.5)*run),top=low+(high-low)*(i+1)/count;
  const step=box(group,'貼岩接層石階',at.x,(bottom+top)/2,at.z,width,top-bottom,run+.07,i%4?0xc8c4af:0xd8cfb9);step.rotation.y=at.yaw;steps.push(step);
 }
 return steps;
}
// The paving follows each terrace. Where its height jumps, a run of grounded
// steps spans several metres across the cliff face and meets both street ends.
function streetSection(group,points,width){
 const covered=new Set();for(let i=1;i<points.length;i++)if(Math.abs(points[i].y-points[i-1].y)>.35){
  const from=Math.max(0,i-2),to=Math.min(points.length-1,i+2);stoneStairs(group,points,from,to,width);for(let k=from+1;k<=to;k++)covered.add(k);
 }
 for(let i=1;i<points.length;i++){if(covered.has(i))continue;const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.z-a.z),yaw=Math.atan2(b.x-a.x,b.z-a.z),x=(a.x+b.x)/2,z=(a.z+b.z)/2,y=Math.max(a.y,b.y);
  const o=box(group,'沿岩台石板街巷',x,y+.095,z,width,.19,length+.08,i%5?0xc3c0ab:0xd5ccb5);o.rotation.y=yaw;
  if(i%4===0){const seam=box(group,'石街砌縫',x,y+.198,z,width-.18,.012,.035,0x89918b);seam.rotation.y=yaw;}
 }
}
function street(group,path,heightAt,homes,width=1.65){let routed=makeRouter(heightAt,homes,width)(path);
 if(routed.failedRoutes.length&&width>.95){width=.95;routed=makeRouter(heightAt,homes,width)(path);}
 for(const points of routed.sections)streetSection(group,points,width);
 return routed.failedRoutes;
}
function rampart(group,path,heightAt,homes){for(let k=1;k<path.length;k++){
 const a=path[k-1],b=path[k],length=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.ceil(length/3);
 for(let i=0;i<count;i++){const t=(i+.5)/count,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,y=heightAt(x,z);if(y<2.5)continue;
  const ta=[a[0]+(b[0]-a[0])*i/count,a[1]+(b[1]-a[1])*i/count],tb=[a[0]+(b[0]-a[0])*(i+1)/count,a[1]+(b[1]-a[1])*(i+1)/count];
  if([ta,[x,z],tb].some(p=>nearHome(p[0],p[1],homes,.8)))continue;
  span(group,'貼岩岸層級城牆',ta,tb,y+1.07,.52,2.14,0xb5b3a4);
  for(const q of[.16,.66]){const u=(i+q)/count,m=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];const merlon=box(group,'城牆雉堞',m[0],y+2.37,m[1],.68,.64,.75,0xd7d0b7);merlon.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);}
 }
}}
function stairs(group,start,end,from,to,width,homes,heightAt,allowNarrowWater=false){const route=makeRouter(heightAt,homes,width,allowNarrowWater)([start,end]);
 const points=route.sections[0];if(points?.length>1){const treads=stoneStairs(group,points,0,points.length-1,width,from,to);
  // The short west-side inlet has a stone-pier bridge below its stair run.
  // Each visible pier reaches the waterbed instead of leaving steps airborne.
  for(let i=0;i<treads.length;i++)if(heightAt(treads[i].position.x,treads[i].position.z)<2&&(i%2===0||i===treads.length-1)){
   const p=treads[i].position,underside=Math.min(from,to)-.12,height=underside+.46;
   box(group,'側峽接岸橋柱',p.x,-.4+height/2,p.z,.62,height,.62,0xaaa99a);
  }
 }
 return route.failedRoutes;
}
function cypress(group,x,z,y,r=1){box(group,'庭院樹幹',x,y+.85,z,.2,1.7,.2,0x6d684f);const foliage=new THREE.Mesh(new THREE.ConeGeometry(.56*r,3.7*r,7),mat(0x3f6657));foliage.name='岩台柏樹';foliage.position.set(x,y+2.8*r,z);foliage.castShadow=true;group.add(foliage);}
function olive(group,x,z,y,scale=1){
 const trunk=box(group,'老橄欖樹幹',x,y+.87*scale,z,.29*scale,1.74*scale,.32*scale,0x74674e);
 trunk.rotation.z=.11;
 for(const [dx,dz,h,r,color] of[[-.62,-.2,1.95,.86,0x6c8765],[.58,.06,2.18,.95,0x7f936f],[.05,.5,2.48,.92,0x829b76]]){
  const canopy=new THREE.Mesh(new THREE.IcosahedronGeometry(r*scale,1),mat(color));
  canopy.name='海崖橄欖樹冠';canopy.position.set(x+dx*scale,y+h*scale,z+dz*scale);
  canopy.scale.y=.73;canopy.castShadow=canopy.receiveShadow=true;group.add(canopy);
 }
}
function scrub(group,x,z,y,scale=1){
 for(const [dx,dz,r,c] of[[-.32,.08,.53,0x5e785d],[.21,-.18,.49,0x748a64],[.38,.3,.38,0x879966]]){
  const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(r*scale,0),mat(c));
  bush.name='斷崖灌木';bush.position.set(x+dx*scale,y+.22*scale,z+dz*scale);
  bush.scale.y=.58;bush.castShadow=true;group.add(bush);
 }
}

export function createFjordStreets(heightAt,homes=[]){const group=new THREE.Group();group.name='順地形街巷・階梯・防禦牆';const footprints=homeFootprints(homes),failedRoutes=[];
 const west=[[-34,-26],[-33,-17],[-34,-7],[-33,4],[-31,15]],east=[[33,-27],[33,-18],[32,-9],[31,-1]];
 for(const route of[west,east,[[-42,-26],[-41,-15],[-42,-4],[-40,8],[-36,17]],[[42,-26],[41,-16],[41,-7]],[[28,18],[30,24],[27,30]]])failedRoutes.push(...street(group,route,heightAt,footprints));
 for(const route of[[[-42,-15],[-34,-17]],[[-40,8],[-33,4]],[[41,-16],[33,-18]],[[-32,-36],[-24,-34],[-20,-29]],[[32,-36],[24,-34],[20,-29]]])failedRoutes.push(...street(group,route,heightAt,footprints,1.5));
 rampart(group,[[-27,-26],[-28,-16],[-29,-6],[-29,7],[-26,18]],heightAt,footprints);
 rampart(group,[[26,-27],[28,-17],[28,-6]],heightAt,footprints);
 for(const [a,b,w,water]of[[[-23,-20],[-33,-20],1.7,true],[[23,-20],[33,-19],1.7,false]]){
  const lo=2.15,hi=Math.max(3,heightAt(...b));failedRoutes.push(...stairs(group,a,b,lo,hi,w,footprints,heightAt,water));
 }
 for(const [x,z]of[[-43,-36],[-39,-3],[-37,16],[-29,-31],[39,-34],[40,-5],[31,23]]){const y=heightAt(x,z);if(y>2&&!nearHome(x,z,footprints,1.15))cypress(group,x,z,y,.8+(Math.abs(x+z)%3)*.12);}
 // Sparse salt-tolerant greenery follows the usable upper rock. The outline
 // remains readable from a boat, while the settlement no longer sits on bare stone.
 for(const [x,z,s]of[[-47,-35,1],[-51,-20,.82],[-52,-8,.9],[-49,8,.95],[-45,19,.86],[-32,27,.75],
  [-31,-46,.8],[-9,-48,.87],[16,-48,.9],[38,-40,.8],[48,-28,.78],[50,-17,.9],[48,-5,.8],[39,31,.75]]){
  const y=heightAt(x,z);if(y>2.6&&!nearHome(x,z,footprints,2.2))olive(group,x,z,y,s);
 }
 for(const [x,z]of[[-46,-39],[-49,-32],[-52,-25],[-53,-16],[-51,-2],[-47,13],[-39,25],[-35,29],
  [-38,-43],[-26,-47],[-18,-49],[1,-50],[28,-47],[36,-42],[44,-35],[49,-24],[51,-11],[47,0],
  [40,19],[36,33],[26,34],[23,-32],[-22,-32]]){
  const y=heightAt(x,z);if(y>2.6&&!nearHome(x,z,footprints,1.5))scrub(group,x,z,y,.7+(Math.abs(x*7+z*3)%5)*.075);
 }
 group.userData={routeFailures:failedRoutes.length,failedRoutes,houseFootprints:footprints.length};
 return group;
}
