import * as T from 'three';

// Independent terrain study. The coast is one open horseshoe, not a wall or
// a collection of stacked platforms. Heights are sampled from the seabed up.
export const ISLAND_EXTENT={minX:-145,maxX:103,minZ:-155,maxZ:82};
export const SIDE_ISLAND_EXTENT={minX:78,maxX:212,minZ:-90,maxZ:64};
export const ISLAND_COAST=[
 [-12,61],[-27,48],[-31,37],[-36,29],[-30,22],[-40,10],[-42,-3],
 [-35,-15],[-26,-18],[-29,-26],[-16,-32],[-14,-26],[-9,-19],
 [8,-18],[14,-24],[18,-31],[29,-23],[36,-13],[32,-3],[43,5],[40,19],
 [35,28],[19,32],[35,42],[24,55],[12,61],
 [26,67],[37,69],[51,60],[65,42],[76,20],[82,-4],[82,-31],[69,-35],[79,-45],[75,-54],
 [71,-76],[61,-101],[43,-124],[22,-134],[5,-130],[-11,-135],[-29,-133],[-53,-122],
 [-78,-105],[-102,-79],[-121,-53],[-115,-37],[-127,-16],[-122,7],[-116,28],
 [-98,53],[-79,62],[-62,68],[-43,69],[-30,70]
];
// A long, separate eastern island runs beside the main coast. The two native
// rock faces form a navigable channel instead of a painted crack in one mesh.
export const SIDE_ISLAND_COAST=[
 [85,42],[89,33],[94,22],[99,9],[102,-5],[106,-19],[103,-33],
 [96,-46],[91,-57],[102,-78],[129,-86],[155,-77],[185,-55],
 [202,-29],[203,2],[186,29],[156,52],[119,60],[93,49]
];
// The working waterfront extends into the inner harbor. The landward edge
// remains keyed into native rock, but the broad seaward apron leaves a real
// strip of open ground behind the buildings after the quay is lowered.
export const HARBOR_FOUNDATION_COAST=[
 [-36,-33],[-22,-32],[-10,-30],[0,-30],[10,-30],[23,-33],[36,-34],
 [36,-15],[30,-10],[22,-6.8],[10,-5.6],[0,-5.3],[-10,-5.6],[-22,-6.8],[-30,-10],[-36,-15],
];
export const HARBOR_FOUNDATION_TOP=2.2;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const gauss=(x,z,cx,cz,rx,rz)=>Math.exp(-(((x-cx)/rx)**2)-(((z-cz)/rz)**2));
const shelfMask=(x,z,cx,cz,rx,rz)=>Math.exp(-(((x-cx)/rx)**2)-(((z-cz)/rz)**2));
function polygonDistance(x,z,points){let inside=false,d=Infinity;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const [ax,az]=points[j],[bx,bz]=points[i],dx=bx-ax,dz=bz-az;
  const t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz));
  d=Math.min(d,Math.hypot(x-ax-t*dx,z-az-t*dz));
  if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
 }return inside?d:-d;
}
export function islandSignedDistance(x,z){
 let d=polygonDistance(x,z,ISLAND_COAST);
 // A small western reef remains separate; the old eastern pebble is replaced
 // by the full-length channel island and must not obstruct the waterway.
 for(const [cx,cz,rx,rz] of [[-119,63,8,11]]){
  const q=1-Math.hypot((x-cx)/rx,(z-cz)/rz);
  d=Math.max(d,q*Math.min(rx,rz));
 }return d;
}
export const sideIslandSignedDistance=(x,z)=>polygonDistance(x,z,SIDE_ISLAND_COAST);
export function sideIslandNaturalHeight(x,z){
 const d=sideIslandSignedDistance(x,z);
 if(d<=-10)return-6.31;
 if(d<0)return-6.31*smooth(-d/10);
 const inland=smooth(d/20);
 // Keep the inner shoreline and navigation gap in place, while spreading the
 // mountain's outer flank across the newly widened island before it meets sea.
 const ridge=24*gauss(x,z,145,-44,32,34)+
  27*gauss(x,z,151,-14,34,36)+
  20*gauss(x,z,142,21,32,34)-
  3.5*gauss(x,z,140,-28,12,12);
 const weather=.75*Math.sin(z*.25+x*.16)+.45*Math.sin(z*.47-x*.11);
 return 1.8*(1-Math.exp(-d/3.7))+inland*(ridge+weather);
}
export function islandNaturalHeight(x,z){
 const d=islandSignedDistance(x,z);
 if(d<=-10)return-6.3;
 if(d<0)return -6.3*smooth(-d/10);
 const inland=smooth(d/12);
 const base=1.75*(1-Math.exp(-d/5.5))+.95*smooth(d/16);
 // Wide ridges now sit inland from a real outer coast. Their seaward backslope
 // crosses foothills and a long rock apron rather than ending as a sheer screen.
 let h=base+inland*(
  37.0*gauss(x,z,-39,-69,32,42)+
  42.0*gauss(x,z,7,-70,34,43)+
  31.0*gauss(x,z,37,-72,29,42)+
  9.5*gauss(x,z,-76,-27,28,37)+
  13.0*gauss(x,z,69,-22,21,34)+
  2.2*gauss(x,z,-53,20,22,25)+
  4.0*gauss(x,z,55,22,22,24)-
  4.5*gauss(x,z,-16,-57,10,22)-
  3.9*gauss(x,z,31,-48,8,20));
 const longWave=.85*Math.sin(x*.14+z*.038)*Math.cos(z*.12-x*.035);
 const creases=.55*Math.sin(x*.31+z*.17)+.3*Math.sin(x*.55-z*.29);
 const runoff=Math.pow(Math.max(0,Math.sin(x*.21+z*.13+Math.sin(z*.07)*1.6)),4);
 h+=inland*(longWave+creases-1.15*runoff*smooth((h-5)/13));
 // Wide, nearly level natural shelves reserved for future streets, docks
 // and the citadel. No foundations or buildings are baked into the terrain.
 const shelves=[
  [0,-40,25,22,11.5,.75],[-48,-12,13,20,5.8,.7],[48,-13,13,20,6.0,.7],
  [-38,22,9,12,4.6,.75],[37,23,9,12,4.8,.75],
 ];
 for(const [cx,cz,rx,rz,target,strength] of shelves){
  const weight=shelfMask(x,z,cx,cz,rx,rz)*strength*inland;
  h=h*(1-weight)+(target+.18*Math.sin(x*.18+z*.16))*weight;
 }
 return h;
}
// Small house plots are carved into the original mountain surface. Each has
// a level buildable core and a feathered cut/fill shoulder; none is a separate
// slab hovering above the rock. The sites climb the left main slope in stages
// and repeat on the right-hand island, following the approved front silhouette.
const MAIN_HOUSE_AREA_FACTOR=1.25;
export const BUILDING_TERRACES=[
 ['主堡用地','main',2,-52,10,6,1.2,20],
 ['西岸低地','main',-88,9,11,7,.8],
 ['入口西側','main',-65,33,10,7,.8],
 ['西坡下層','main',-82,-17,10,7,.8],
 ['西坡中層','main',-54,-44,10,6.5,.85],
 ['西坡上層','main',-45,-62,10,6.5,.85],
 ['東坡中層','main',53,-31,9,6,.75],
 ['東坡下層','main',58,14,9,6,.75],
 ['離島上層','side',138,-5,11,7.5,.8],
 ['離島中層','side',151,29,11,7.5,.8],
 ['離島下層','side',178,10,11,7.5,.8],
].map(([name,island,x,z,baseRx,baseRz,fade,level])=>{
 const castle=name==='主堡用地';
 const scale=island==='main'&&!castle?Math.sqrt(MAIN_HOUSE_AREA_FACTOR):1;
 return {name,island,x,z,baseRx,baseRz,rx:castle?28:baseRx*scale,rz:castle?15:baseRz*scale,fade:castle?.75:fade,
  y:level??Math.round((island==='main'?islandNaturalHeight(x,z):sideIslandNaturalHeight(x,z))*2)/2};
});
const terraceWeight=(x,z,p)=>{
 const dx=(x-p.x)/p.rx,dz=(z-p.z)/p.rz;
 const q=Math.pow(dx**4+dz**4,.25);
 return 1-smooth((q-1)/p.fade);
};

// Stone walks meet the edges of the reserved house plots. The alternating
// waypoints on the western face are real switchbacks rather than steep direct
// flights. Every mainland plot has a pedestrian route to the working quay.
export const MAIN_WALKWAY_ROUTES=[
 {name:'西坡上層至中層・折返階',from:'西坡上層',to:'西坡中層',points:[[-53,-55.5,42],[-37,-53,39.1],[-65,-49,27.5],[-63.5,-44,27.5]]},
 {name:'西坡中層至下層・折返階',from:'西坡中層',to:'西坡下層',points:[[-63.5,-44,27.5],[-69,-39,25],[-62,-35,24.5],[-77,-30,16.5],[-82,-23,12.5]]},
 {name:'西坡下層至低地・折返階',from:'西坡下層',to:'西岸低地',points:[[-82,-23,12.5],[-94,-23,12.5],[-94,-9,10.5],[-82,-3,7.7],[-101,0,5],[-100.2,9,5]]},
 {name:'西岸低地至入口平台',from:'西岸低地',to:'入口西側',points:[[-100.2,9,5],[-104,16,4.5],[-77,26,3.5],[-67,26,3]]},
 {name:'西坡下層至港口石階',from:'西坡下層',to:'港口',points:[[-82,-23,12.5],[-72,-23,12.5],[-49,-13,7.8],[-42,-15,5.2],[-34,-14,2.2]]},
 {name:'東坡中層至下層・山腰階',from:'東坡中層',to:'東坡下層',points:[[60,-27,16.5],[67,-21,16.2],[65,-9,14.2],[70,0,12.1],[63,3,11.3],[58,7.3,10.5]]},
 {name:'東坡下層至港口石階',from:'東坡下層',to:'港口',points:[[58,7.3,10.5],[47,5,10.5],[50,-2,7.8],[42,-11,4.8],[34,-16,2.2]]},
];
export function walkwaySegmentLevel(a,b,t){
 const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
 const flat=Math.min(.9,length*.17);
 const progress=clamp((t*length-flat)/(length-2*flat));
 return a[2]+(b[2]-a[2])*progress;
}
function gradeHouseWalkways(x,z,height){
 if(harborFoundationSignedDistance(x,z)>=0)return height;
 let nearest=Infinity,level=height;
 for(const route of MAIN_WALKWAY_ROUTES)for(let i=1;i<route.points.length;i++){
  const a=route.points[i-1],b=route.points[i],dx=b[0]-a[0],dz=b[1]-a[1];
  const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz));
  const distance=Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
  if(distance<nearest){nearest=distance;level=walkwaySegmentLevel(a,b,t);}
 }
 if(nearest>6)return height;
 if(BUILDING_TERRACES.some(plot=>plot.island==='main'&&terraceWeight(x,z,plot)>=.999999))return height;
 const weight=1-smooth((nearest-2.5)/3.5);
 return height+(level-.95-height)*weight;
}
function cutTerraces(x,z,natural,d,island){
 if(d<=0)return natural;
 let y=natural;
 for(const p of BUILDING_TERRACES){
  if(p.island!==island)continue;
  const w=terraceWeight(x,z,p)*smooth(d/5);
  y+=(p.y-y)*w;
 }
 return y;
}
// The castle approach is native hillside, not a suspended stair bridge. A
// broad, asymmetric tongue descends from the castle gate into the working
// quay; its flanks feather back into the original mountain.
export function castleApproachAxis(z){
 const t=clamp((z+40)/29);
 return {t,x:2-7.5*t,halfWidth:3.5+4.5*t,y:20+(HARBOR_FOUNDATION_TOP-.5-20)*t};
}
function gradeCastleApproach(x,z,height){
 if(z< -40||z> -7)return height;
 const axis=castleApproachAxis(z);
 const lateral=1-smooth((Math.abs(x-axis.x)-axis.halfWidth)/5);
 return height+(axis.y-height)*lateral;
}
export const harborFoundationSignedDistance=(x,z)=>polygonDistance(x,z,HARBOR_FOUNDATION_COAST);
function cutHarborBackshore(x,z,y){
 const d=harborFoundationSignedDistance(x,z);
 if(d<=-12)return y;
 // The stone cap sits above this cut, and the natural hill eases down to its
 // landward edge. Submerged patches stay submerged until the built wall fills
 // them, so no extra sandbank seals the inner harbor.
 const cut=d>=0?1:1-smooth(-d/12);
 // Castle footings stay level. Across the short front shoulder the rock
 // descends toward the quay, while the whole quay footprint is cut below its
 // cap so the mountain cannot break through the harbor pavement or buildings.
 const castleShield=terraceWeight(x,z,BUILDING_TERRACES[0])*smooth((-z-30)/9);
 const otherShield=BUILDING_TERRACES.slice(1).reduce((shield,plot)=>plot.island==='main'?Math.max(shield,terraceWeight(x,z,plot)):shield,0);
 const approach=z>=-40&&z< -7?castleApproachAxis(z):null;
 const approachProtection=approach?1-smooth((Math.abs(x-approach.x)-approach.halfWidth)/5):0;
 const effective=(d>=0?1:cut*(1-Math.max(castleShield,otherShield)))*(1-approachProtection);
 return Math.min(y,y+(HARBOR_FOUNDATION_TOP-.12-y)*effective);
}
export function islandHeight(x,z){
 const terraced=cutTerraces(x,z,islandNaturalHeight(x,z),islandSignedDistance(x,z),'main');
 return gradeHouseWalkways(x,z,cutHarborBackshore(x,z,gradeCastleApproach(x,z,terraced)));
}
export function sideIslandHeight(x,z){
 return cutTerraces(x,z,sideIslandNaturalHeight(x,z),sideIslandSignedDistance(x,z),'side');
}
function makeTerrain(name,extent,nx,nz,heightAt){
 const positions=[],indices=[],colors=[];
 const dx=(extent.maxX-extent.minX)/(nx-1),dz=(extent.maxZ-extent.minZ)/(nz-1);
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
  const x=extent.minX+i*dx,z=extent.minZ+j*dz,y=heightAt(x,z);
  positions.push(x,y,z);colors.push(1,1,1);
 }
 for(let j=0;j<nz-1;j++)for(let i=0;i<nx-1;i++){
  const a=j*nx+i,b=a+1,c=a+nx,d=c+1;
  if((i+j)%2)indices.push(a,c,d,a,d,b);else indices.push(a,c,b,b,c,d);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const color=new T.Color(),rock=new T.Color(0x687985),grass=new T.Color(0x6b8564),lowRock=new T.Color(0x7a8c8c),sand=new T.Color(0xaab09a),seabed=new T.Color(0x4d737a),terraceEarth=new T.Color(0x9b9c79);
 const normal=geometry.getAttribute('normal');
 for(let k=0;k<positions.length/3;k++){
  const x=positions[k*3],y=positions[k*3+1],z=positions[k*3+2],slope=normal.getY(k);
  const grain=.5+.5*Math.sin(x*.38+z*.26)*Math.sin(z*.31-x*.18);
  if(y<-.2)color.copy(seabed).lerp(lowRock,smooth((y+6.3)/6.1)*.53);
  else if(y<1.15)color.copy(sand).lerp(lowRock,smooth(y/1.15)*.6);
  else color.copy(lowRock).lerp(rock,smooth((y-2)/10));
  const turf=smooth((slope-.76)/.2)*smooth((y-.8)/2.4)*(1-.7*smooth((y-8)/13));
  color.lerp(grass,turf*.7);
  const island=name.startsWith('主島')?'main':'side';
  const pad=BUILDING_TERRACES.reduce((v,p)=>p.island===island?Math.max(v,terraceWeight(x,z,p)):v,0);
  color.lerp(terraceEarth,pad*.24);
  color.multiplyScalar(.91+.13*grain);
  colors[k*3]=color.r;colors[k*3+1]=color.g;colors[k*3+2]=color.b;
 }
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const land=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,side:T.DoubleSide}));
 land.name=name;land.castShadow=true;land.receiveShadow=true;
 return land;
}
function makeHarborFoundation(){
 const shape=new T.Shape();
 HARBOR_FOUNDATION_COAST.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));
 shape.closePath();
 const geometry=new T.ExtrudeGeometry(shape,{depth:HARBOR_FOUNDATION_TOP+6.35,steps:1,bevelEnabled:false,curveSegments:1});
 geometry.rotateX(Math.PI/2);geometry.translate(0,HARBOR_FOUNDATION_TOP,0);
 const top=new T.MeshStandardMaterial({color:0xa0a69a,roughness:1,side:T.DoubleSide});
 const wall=new T.MeshStandardMaterial({color:0x737f7e,roughness:1,flatShading:true,side:T.DoubleSide});
 const quay=new T.Mesh(geometry,[top,wall]);
 quay.name='內港・人工石造平坦地基';quay.castShadow=quay.receiveShadow=true;
 quay.userData={top:HARBOR_FOUNDATION_TOP,footprint:HARBOR_FOUNDATION_COAST};
 return quay;
}
export function createFjordIslandStudy(){
 const group=new T.Group();group.name='蒼壁峽灣・海床起伏新群島';
 const land=makeTerrain('主島・連續海床與山坡',ISLAND_EXTENT,117,109,islandHeight);
 const sideIsland=makeTerrain('東側離島・海溝外壁',SIDE_ISLAND_EXTENT,35,53,sideIslandHeight);
 const harborFoundation=makeHarborFoundation();
 // The two seabed meshes overlap only below the sea, at virtually identical
 // height. A tiny offset prevents a moire seam where the preview grids meet.
 sideIsland.material.polygonOffset=true;sideIsland.material.polygonOffsetFactor=-1;sideIsland.material.polygonOffsetUnits=-1;
 group.add(land,sideIsland,harborFoundation);
 group.userData={terrainTriangles:[land,sideIsland,harborFoundation].reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.getAttribute('position').count)/3,0),meshCount:3,coast:'main island and separate eastern channel island',previewOnly:true};
 return {group,land,sideIsland,harborFoundation};
}
