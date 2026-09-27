import * as T from 'three';
import {FJORD_LANDS,FJORD_TERRACES,FJORD_COAST_APRONS} from './fjord-layout.js';

// Faceted rock bands share the same footprint data as collision and building
// placement. There is no texture or dense terrain grid to stream at runtime.
const cliffMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,side:T.DoubleSide});
const rock=[0x3e5c6c,0x4f6b79,0x68818b,0x516f7d,0x748a91,0x87979a].map(c=>new T.Color(c));
const shelfRock=[0x486575,0x587482,0x6c8590,0x5a7784,0x798e96,0x8c9b9d].map(c=>new T.Color(c));

const noise=(a,b)=>{const v=Math.sin(a*12.9898+b*78.233)*43758.5453;return v-Math.floor(v);};
function outline(points){const result=[];for(let i=0;i<points.length;i++){
 const a=points[i],b=points[(i+1)%points.length],distance=Math.hypot(b[0]-a[0],b[1]-a[1]);
 // The authored shoreline remains exact at the top and for collisions. The
 // extra stations let its lower face slope and fracture on a broader scale.
 const steps=Math.max(2,Math.ceil(distance/4));
 for(let k=0;k<steps;k++){const t=k/steps;result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
 }return result;}

function makeCliff(layer,isLand,seed){
 const original=outline(layer.points),n=original.length;
 const center=layer.points.reduce((v,p)=>(v[0]+=p[0],v[1]+=p[1],v),[0,0]).map(v=>v/layer.points.length);
 const bottom=isLand?-2.4:layer.baseHeight-.06,top=layer.height,span=top-bottom;
 const levels=isLand?[
 [bottom,1.042],[0,1.018],[bottom+span*.35,1.014],[bottom+span*.68,1.008],[top-.22,1.002],[top,1]
 ]:[
  [bottom,.963],[bottom+span*.12,.968],[bottom+span*.39,.977],[bottom+span*.72,.986],[top-.12,.995],[top,1]
 ];
 const vertices=[],colors=[],indices=[],palette=isLand?rock:shelfRock;
 for(let j=0;j<levels.length;j++)for(let i=0;i<n;i++){
  const [levelY,scale]=levels[j],p=original[i],radial=Math.hypot(p[0]-center[0],p[1]-center[1])||1;
  // Keep the waterline and buildable cap exact. Below each cap the broken
  // strata pitch toward the sea instead of forming vertical, even-height bars.
  const face=j>1&&j<levels.length-1;
  const displacement=face?(noise(seed*11+i,j*7)-.5)*(i%2?1.45:.8):0;
  const factor=j===levels.length-1?1:isLand?scale+displacement/radial:Math.min(.999,scale+displacement/radial);
  const y=levelY+(face?(noise(seed*23+i*.71,j*9)-.5)*(isLand?.9:Math.min(.38,span*.2)):0);
  vertices.push(center[0]+(p[0]-center[0])*factor,y,center[1]+(p[1]-center[1])*factor);
  const shade=1+(noise(i+seed*31,j+2)-.5)*.22;
  const c=palette[j].clone().multiplyScalar(shade);colors.push(c.r,c.g,c.b);
 }
 for(let j=0;j<levels.length-1;j++)for(let i=0;i<n;i++){
  const a=j*n+i,b=j*n+(i+1)%n,c=(j+1)*n+i,d=(j+1)*n+(i+1)%n;
  indices.push(a,c,b,b,c,d);
 }
 const topStart=(levels.length-1)*n;
 const triangles=T.ShapeUtils.triangulateShape(original.map(p=>new T.Vector2(p[0],p[1])),[]);
 for(const tri of triangles){let [a,b,c]=tri;
  const ab=original[b],aa=original[a],ac=original[c];
  const ny=(ab[1]-aa[1])*(ac[0]-aa[0])-(ab[0]-aa[0])*(ac[1]-aa[1]);
  if(ny<0)[b,c]=[c,b];
  indices.push(topStart+a,topStart+b,topStart+c);
 }
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 geo.setIndex(indices);geo.computeVertexNormals();
 const mesh=new T.Mesh(geo,cliffMaterial);
 mesh.name=`蒼壁層疊海崖・${layer.id}`;
 mesh.castShadow=mesh.receiveShadow=true;
 mesh.userData={land:layer.land??layer.id,level:layer.height,kind:isLand?'shore':'terrace'};
 return mesh;
}

// Angular faces break the even horizontal contour bands. Every vertex stays
// on the landward side of its top outline, so the navigable shoreline and
// flat building pads remain the authored polygons.
function facetBuilder(name,palette=[0x355768,0x507383,0x71909b,0x456675,0x63818d]){const positions=[],colors=[];
 const shades=palette.map(v=>new T.Color(v));
 function triangle(a,b,c,shade){const color=shades[shade%shades.length];for(const p of[a,b,c]){positions.push(p[0],p[1],p[2]);colors.push(color.r,color.g,color.b);}}
 function finish(){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const mesh=new T.Mesh(geo,cliffMaterial);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;return mesh;}
 return {triangle,finish};
}

function addFractures(builder,layer,isLand,seed){
 const p=layer.points,area=p.reduce((v,a,i)=>{const b=p[(i+1)%p.length];return v+a[0]*b[1]-b[0]*a[1];},0),sign=Math.sign(area)||1;
 const low=isLand?.05:layer.baseHeight+.05,high=layer.height-.05;
 for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  if(length<5.2)continue;
  const outward=[sign*dz/length,-sign*dx/length],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
  const toHarbor=[-mid[0],5-mid[1]],facingHarbor=(outward[0]*toHarbor[0]+outward[1]*toHarbor[1])/Math.hypot(...toHarbor);
  if(facingHarbor<.15&&(i+seed)%3!==0)continue;
  const span=Math.min(.75,6.8/length),left=.5-span/2,right=.5+span/2;
  const at=(t,inset,y)=>[a[0]+dx*t-outward[0]*inset,y,a[1]+dz*t-outward[1]*inset];
  const tilt=(noise(seed+i,3)+1)*.16;
  const footL=at(left,.06,low),footR=at(right,.08,low+.04),footM=at(.48,.025,low-.05);
  const shoulderL=at(left+.06,.09,low+(high-low)*(.45+tilt));
  const shoulderR=at(right-.05,.09,low+(high-low)*(.73-tilt*.5));
  const crown=at(.48,.015,high);
  builder.triangle(footL,footM,shoulderL,seed+i);
  builder.triangle(footM,crown,shoulderL,seed+i+1);
  builder.triangle(footM,footR,crown,seed+i+2);
  builder.triangle(footR,shoulderR,crown,seed+i+3);
  // A short talus wedge touches the same shoreline below the fracture.
  if(isLand&&facingHarbor>.35&&(i+seed)%2===0){
   const baseA=at(.33,.04,-.35),baseB=at(.66,.04,-.25),tip=at(.56,.01,Math.min(2.5,layer.height*.66));
   builder.triangle(baseA,baseB,tip,seed+i+3);
  }
 }
}

// Find the actual inward-facing edge at a chosen x or z. A ridge can then
// climb across several cliff levels without inventing a floating foundation.
function edgeAt(points,axis,value,takeMax){const hits=[],other=axis===0?1:0;
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],d=b[axis]-a[axis];
  if(Math.abs(d)<1e-8)continue;
  const t=(value-a[axis])/d;if(t>=0&&t<1)hits.push(a[other]+(b[other]-a[other])*t);
 }
 if(!hits.length)return null;return takeMax?Math.max(...hits):Math.min(...hits);
}
function ridgePosition(spec,layer,offset,inset){const at=spec.at+offset;
 if(spec.side==='rear'){const z=edgeAt(layer.points,0,at,true);return z===null?null:[at,0,z-inset];}
 const x=edgeAt(layer.points,1,at,spec.side==='west');
 return x===null?null:[x+(spec.side==='west'?-inset:inset),0,at];
}
function addRidge(builder,spec,lookup,seed){const layers=spec.layers.map(id=>lookup.get(id));
 const stations=[{layer:layers[0],y:.12},...layers.map(layer=>({layer,y:layer.height-.08}))],cross=[];
 for(let j=0;j<stations.length;j++){
  const {layer,y}=stations[j],shift=Math.sin(seed*1.7+j*1.9)*.23;
  const l=ridgePosition(spec,layer,shift-spec.width/2,.25);
  const m=ridgePosition(spec,layer,shift,.02);
  const r=ridgePosition(spec,layer,shift+spec.width/2,.31);
  if(!l||!m||!r)return false;
  l[1]=Math.max(.06,y-.25);m[1]=y;r[1]=Math.max(.06,y-.18);
  cross.push([l,m,r]);
 }
 for(let j=0;j<cross.length-1;j++){
  const [a,b,c]=cross[j],[d,e,f]=cross[j+1];
  builder.triangle(a,b,d,seed+j);builder.triangle(b,e,d,seed+j+1);
 builder.triangle(b,c,e,seed+j+2);builder.triangle(c,f,e,seed+j+3);
 }
 return true;
}

function makeRockAccents(){const builder=facetBuilder('灰藍崩岩・斜向斷面與岩脊');
 const layers=[...FJORD_LANDS,...FJORD_TERRACES],lookup=new Map(layers.map(l=>[l.id,l]));
 for(const [i,land]of FJORD_LANDS.entries())addFractures(builder,land,true,i+2);
 for(const [i,shelf]of FJORD_TERRACES.entries())addFractures(builder,shelf,false,i+17);
 const ridges=[
  {side:'rear',at:-12,width:3.1,layers:['crown','rear-apron','rear-ramp','citadel']},
  {side:'rear',at:-3,width:2.5,layers:['crown','rear-apron','rear-ramp','citadel']},
  {side:'rear',at:8,width:3.4,layers:['crown','rear-apron','rear-ramp','citadel']},
  {side:'west',at:-21,width:2.4,layers:['west','west-harbour']},
  {side:'west',at:-10,width:2.2,layers:['west','west-harbour']},
  {side:'west',at:-1,width:1.8,layers:['west','west-harbour']},
  {side:'east',at:-24,width:2.2,layers:['east','east-harbour']},
  {side:'east',at:-19,width:1.9,layers:['east','east-harbour']},
  {side:'east',at:-15,width:1.8,layers:['east','east-harbour']},
 ];
 const ridgeCount=ridges.reduce((n,ridge,i)=>n+(addRidge(builder,ridge,lookup,i+29)?1:0),0);
 const mesh=builder.finish();mesh.userData={kind:'rock-facets',ridgeCount};return mesh;
}

// Broad connected skins climb from a single rock foot to the next shelves.
// They mask the regular stair-step bands with large, uneven diagonal faces;
// their upper edge stays below each flat building surface.
function addBroadFold(builder,spec,lookup,seed){
 const layers=spec.layers.map(id=>lookup.get(id)),rows=[{layer:layers[0],height:.08},...layers.map(layer=>({layer,height:layer.height-.18}))];
 const count=spec.samples,columns=[];
 for(let i=0;i<count;i++){
  const coord=spec.from+(spec.to-spec.from)*i/(count-1)+(i===0||i===count-1?0:Math.sin(i*2.17+seed)*.32);
  const column=[];
  for(let j=0;j<rows.length;j++){
   const {layer,height}=rows[j],first=j===0;
   let pos;
   if(spec.side.startsWith('rear')){
    const outer=spec.side.endsWith('outer'),z=edgeAt(layer.points,0,coord,!outer);if(z===null)return false;
    pos=[coord,height,z+(outer?-1:1)*(first?.02:.11)];
   }else{
    const west=spec.side.startsWith('west'),inner=spec.side.endsWith('inner');
    const x=edgeAt(layer.points,1,coord,west===inner);if(x===null)return false;
    const outward=(west===inner?1:-1);
    pos=[x+outward*(first?-.02:.11),height,coord];
   }
   if(!first)pos[1]-=.12*(1+Math.sin(i*1.91+j*.83+seed));
   column.push(pos);
  }
  columns.push(column);
 }
 for(let i=0;i<columns.length-1;i++)for(let j=0;j<rows.length-1;j++){
  const a=columns[i][j],b=columns[i+1][j],c=columns[i][j+1],d=columns[i+1][j+1];
  if((i+j)%2){builder.triangle(a,c,d,seed+i+j);builder.triangle(a,d,b,seed+i+j+2);}
  else{builder.triangle(a,c,b,seed+i+j);builder.triangle(b,c,d,seed+i+j+2);}
 }
 return true;
}
function makeBroadCliffFaces(){
 // Small hue shifts leave the folds readable through their face normals
 // without painting a high-contrast checkerboard across the main escarpment.
 const builder=facetBuilder('主堡與兩翼相連的大面積斜岩壁',[0x5b7480,0x607985,0x657d88,0x5e7782,0x627b86]);
 const lookup=new Map([...FJORD_LANDS,...FJORD_TERRACES].map(l=>[l.id,l]));
 const folds=[
  {side:'rear',from:-16,to:16,samples:15,layers:['crown','rear-apron','rear-ramp','citadel']},
  {side:'rear-outer',from:-18,to:18,samples:17,layers:['crown','rear-apron','rear-ramp','citadel']},
  {side:'west-inner',from:-24,to:16,samples:15,layers:['west','west-harbour']},
  {side:'east-inner',from:-28,to:-2,samples:12,layers:['east','east-harbour']},
  {side:'west-outer',from:-23,to:8,samples:13,layers:['west','west-ridge']},
  {side:'east-outer',from:-24,to:-10,samples:10,layers:['east','east-ridge']},
 ];
 const faceCount=folds.reduce((n,fold,i)=>n+(addBroadFold(builder,fold,lookup,i+2)?1:0),0);
 const mesh=builder.finish();mesh.userData={kind:'broad-cliff-faces',faceCount};return mesh;
}

// Long seawards-facing cliffs are actual inclined buttresses, not a level
// skirt around a rectangular pad. The high crest occupies only a narrow
// coastal strip; the final root sinks below the flat building surface so
// nearby houses retain the same clear foundations.
const COASTAL_BUTTRESSES=[
 {id:'west',land:'west',stations:[
  [-28,6.1,3.5],[-25,9.4,4.5],[-21,11.5,4.9],[-18,12.5,4.8],
  [-14,12.8,4.8],[-10,12.4,4.7],[-6,11.3,4.3],[-2,10.1,4.1],
  [3,10.8,3.8],[7,10.1,3.6],[11,9.2,3.6],[15,7.9,3.3],[19,5.2,3.1]]},
 {id:'east',land:'east',stations:[
  [-32,5.8,2.8],[-28,9.1,3.5],[-24,11.2,3.8],[-20,12.3,3.8],
  [-16,12.7,3.8],[-12,11.6,3.6],[-8,9.3,3.3],[-4,7.8,3.0],[1,5.1,2.5]]},
];
function makeCoastalButtress(spec,seed){
 const builder=facetBuilder('外海岬角斜岩・'+spec.id,[0x607985,0x728a93,0x8799a0,0x68818b,0x94a4a7,0x6c8790]);
 const land=FJORD_LANDS.find(l=>l.id===spec.land),inward=spec.id==='west'?1:-1;
 const columns=spec.stations.map(([z,peak,width],i)=>{
  const coast=edgeAt(land.points,1,z,spec.id==='east');
  const x=t=>coast+inward*t;
  const lip=land.height-.18;
  return [
   [x(-.22),-1.7,z],
   [x(.42),1.0,z],
   [x(width*.25),Math.max(lip+1.2,peak*.55),z],
   [x(width*.52),peak,z],
   [x(width*.77),Math.max(lip+.65,peak*.7),z],
   [x(width),lip,z],
  ];
 });
 for(let i=0;i<columns.length-1;i++)for(let j=0;j<columns[i].length-1;j++){
  const a=columns[i][j],b=columns[i+1][j],c=columns[i][j+1],d=columns[i+1][j+1];
  if((i+j)%2){builder.triangle(a,c,d,seed+i+j);builder.triangle(a,d,b,seed+i+j+2);}
  else{builder.triangle(a,c,b,seed+i+j);builder.triangle(b,c,d,seed+i+j+2);}
 }
 for(const end of[columns[0],columns.at(-1)])for(let j=1;j<end.length-1;j++)
  builder.triangle(end[0],end[j],end[j+1],seed+j);
 const mesh=builder.finish();mesh.userData={kind:'coastal-buttress',side:spec.id,peak:Math.max(...spec.stations.map(s=>s[1]))};
 return mesh;
}

// Short, staggered erosion shelves sit on the seaward face. Their feet stay
// above the waterline, so they do not silently change the ship collision
// outline; none runs the entire coast like a straight retaining wall.
function makeErodedLedges(){
 const builder=facetBuilder('外海崖壁錯層侵蝕岩棚',[0x80929a,0x687f8b,0x95a5a8,0x728a94,0x879aa0]);
 const patches=[
  {side:'west',land:'west',z:-24,width:7.3,level:1.45},
  {side:'west',land:'west',z:-13,width:9.1,level:2.18},
  {side:'west',land:'west',z:-2,width:6.8,level:1.35},
  {side:'west',land:'west',z:8,width:8.2,level:2.3},
  {side:'west',land:'west',z:18,width:5.9,level:1.57},
  {side:'east',land:'east',z:-27,width:6.7,level:2.04},
  {side:'east',land:'east',z:-18,width:8.8,level:1.47},
  {side:'east',land:'east',z:-9,width:6.6,level:2.27},
  {side:'east',land:'east',z:-1,width:5.1,level:1.55},
 ];
 for(const [patchIndex,p] of patches.entries()){
  const land=FJORD_LANDS.find(item=>item.id===p.land),outward=p.side==='west'?-1:1,stations=[];
  for(let i=0;i<5;i++){
   const z=p.z-p.width/2+p.width*i/4,coast=edgeAt(land.points,1,z,p.side==='east');
   if(coast===null){stations.length=0;break;}
   const wave=Math.sin((i+patchIndex)*1.7)*.16,y=p.level+wave;
   stations.push({lip:[coast+outward*.31,y,z],low:[coast+outward*.34,y-.54,z],root:[coast-outward*(1.05+.32*Math.sin(i*2.2+patchIndex)),y+.4,z]});
  }
  for(let i=0;i<stations.length-1;i++){
   const a=stations[i],b=stations[i+1],shade=patchIndex*2+i;
   builder.triangle(a.root,a.lip,b.root,shade);
   builder.triangle(a.lip,b.lip,b.root,shade+1);
   builder.triangle(a.lip,a.low,b.low,shade+2);
   builder.triangle(a.lip,b.low,b.lip,shade+3);
  }
 }
 const mesh=builder.finish();mesh.userData={kind:'eroded-ledge',patchCount:patches.length};return mesh;
}

function makeCoastalApron(apron,seed){
 const builder=facetBuilder('入海緩坡岩腳・'+apron.id,[0x667d87,0x6c828b,0x728891,0x69808a,0x768c94,0x6d858e]);
 const rows=apron.stations.map((p,i)=>{
  const band=(distance,height,variation=0)=>[
   p.x+p.dx*p.reach*distance,
   height+variation*Math.sin(i*1.77+seed*2.4),
   p.z+p.dz*p.reach*distance,
  ];
  return [
   band(0,apron.height-.07),
   band(.27,apron.height*.8,.2),
   band(.52,apron.height*.49,.25),
   band(.78,.08,.09),
   band(1,-2.35),
  ];
 });
 for(let i=0;i<rows.length-1;i++)for(let j=0;j<4;j++){
  const a=rows[i][j],b=rows[i+1][j],c=rows[i][j+1],d=rows[i+1][j+1],shade=seed*3+Math.floor(i/2)+j;
  if((i+j)%2){builder.triangle(a,c,d,shade);builder.triangle(a,d,b,shade);}
  else{builder.triangle(a,c,b,shade);builder.triangle(b,c,d,shade);}
 }
 const mesh=builder.finish();mesh.userData={kind:'coastal-apron',land:apron.land,stationCount:rows.length};return mesh;
}

// Broad rear escarpments have several shoulder peaks rather than a single
// pointed cone. Their waterline footprints remain entirely inside the crown,
// and their feet sink into its cap so the masses read as one connected cliff.
const REAR_MASSIFS=[
 {id:'west',stations:[
  [-37,-41.0,-48.0,9.5],[-34,-44.0,-53.0,14.5],[-31,-45.0,-55.0,16.2],
  [-28,-45.5,-55.5,17.1],[-25,-46.0,-54.0,15.2],[-22,-46.5,-53.0,10.5]]},
 {id:'east',stations:[
  [22,-45.0,-54.0,10.5],[26,-44.8,-55.0,14.3],[29,-44.0,-55.0,17.2],
  [32,-43.5,-54.0,15.5],[35,-43.0,-52.0,10.2]]},
];
function makeRearMassif(spec,seed){
 const builder=facetBuilder('背海層疊岩山・'+spec.id,[0x617d89,0x718c97,0x8299a1,0x587482,0x758e98]);
 const stations=[];for(let i=0;i<spec.stations.length-1;i++){
  const a=spec.stations[i],b=spec.stations[i+1];stations.push(a);
  stations.push([(a[0]+b[0])/2,(a[1]+b[1])/2-.12,(a[2]+b[2])/2+.10,(a[3]+b[3])/2+Math.sin(seed*3+i*4)*.45]);
 }stations.push(spec.stations.at(-1));
 const columns=stations.map(([x,frontEdge,backEdge,peak],i)=>{
  // Give the rear street a real rock setback before the massif rises. Its
  // lowered foot disappears into the new seaward apron instead of hovering.
  const front=frontEdge-4.2,back=backEdge-4.2,depth=front-back,base=1.0,shoulder=7.1+.45*Math.sin(i*1.8+seed);
  return {
   frontFoot:[x,base,front],frontShoulder:[x,shoulder,front-depth*.12],
   frontCrest:[x,peak,front-depth*.28],backCrest:[x,peak-.55-.18*Math.sin(i+seed),back+depth*.18],
   backShoulder:[x,shoulder-.3,back+depth*.1],backFoot:[x,base,back],
  };
 });
 const bands=[['frontFoot','frontShoulder'],['frontShoulder','frontCrest'],
  ['frontCrest','backCrest'],['backCrest','backShoulder'],['backShoulder','backFoot']];
 for(let j=0;j<columns.length-1;j++)for(let k=0;k<bands.length;k++){
  const [low,high]=bands[k],a=columns[j][low],b=columns[j+1][low],c=columns[j][high],d=columns[j+1][high];
  builder.triangle(a,c,b,seed+j+k);builder.triangle(b,c,d,seed+j+k+2);
 }
 for(const end of[columns[0],columns.at(-1)]){
  builder.triangle(end.frontFoot,end.backFoot,end.frontShoulder,seed+1);
  builder.triangle(end.backFoot,end.backShoulder,end.frontShoulder,seed+2);
  builder.triangle(end.frontShoulder,end.backShoulder,end.frontCrest,seed+3);
  builder.triangle(end.backShoulder,end.backCrest,end.frontCrest,seed+4);
 }
 const mesh=builder.finish();mesh.userData={kind:'rear-massif',height:Math.max(...spec.stations.map(s=>s[3])),side:spec.id};return mesh;
}

/** Local-space low-poly terrain. Add it under the rotated fjord root's terrain group. */
export function createFjordCliffs(){const group=new T.Group();group.name='不對稱層疊海崖';
 for(const [i,land]of FJORD_LANDS.entries())group.add(makeCliff(land,true,i+1));
 for(const [i,shelf]of FJORD_TERRACES.entries())group.add(makeCliff(shelf,false,i+19));
 group.add(makeRockAccents());
 group.add(makeBroadCliffFaces());
 for(const [i,spec]of COASTAL_BUTTRESSES.entries())group.add(makeCoastalButtress(spec,i+4));
 group.add(makeErodedLedges());
 for(const [i,apron]of FJORD_COAST_APRONS.entries())group.add(makeCoastalApron(apron,i+3));
 for(const [i,spec]of REAR_MASSIFS.entries())group.add(makeRearMassif(spec,i+1));
 group.userData={shoreCount:FJORD_LANDS.length,terraceCount:FJORD_TERRACES.length,coastalButtressCount:COASTAL_BUTTRESSES.length,rearMassifCount:REAR_MASSIFS.length,castlePlatformHeight:10};
 return group;
}
