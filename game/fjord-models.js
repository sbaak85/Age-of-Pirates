import * as T from 'three';
const mat=(c)=>new T.MeshStandardMaterial({color:c,roughness:.88});
const stone=mat('#c6bfa5'),trim=mat('#ded5b8'),shadow=mat('#354b50'),wood=mat('#73563a'),tile=mat('#b96a43'),white=mat('#ece8d8'),blue=mat('#286994'),bronze=mat('#87917c');
function mesh(g,geo,m,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;}
function box(g,x,y,z,w,h,d,m=stone){return mesh(g,new T.BoxGeometry(w,h,d),m,x,y,z);}
function cyl(g,x,y,z,r,h,m=stone,n=12,rt=r){return mesh(g,new T.CylinderGeometry(rt,r,h,n),m,x,y,z);}
function ball(g,x,y,z,sx,sy,sz,m=stone,n=10){const o=mesh(g,new T.SphereGeometry(1,n,6),m,x,y,z);o.scale.set(sx,sy,sz);return o;}
function rod(g,a,b,r,m=stone,rt=r,n=8){const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av);const o=mesh(g,new T.CylinderGeometry(rt,r,v.length(),n),m,...av.clone().add(bv).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
function roof(g,x,y,z,w,d,h,m=tile){const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(0,h);s.closePath();return mesh(g,new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:false}),m,x,y,z-d/2);}
function arch(g,x,y,z,width,height,thick,depth,m=stone){const r=width/2, spring=height-r,s=new T.Shape();s.moveTo(-r-thick,0);s.lineTo(-r-thick,spring);s.absarc(0,spring,r+thick,Math.PI,0,true);s.lineTo(r+thick,0);s.lineTo(r,0);s.lineTo(r,spring);s.absarc(0,spring,r,0,Math.PI,false);s.lineTo(-r,0);s.closePath();return mesh(g,new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:10}),m,x,y,z-depth/2);}
function stairs(g,x,z,w,count,rise,run){for(let i=0;i<count;i++)box(g,x,(i+1)*rise/2,z-i*run,w,(i+1)*rise,run+.03);}
function window(g,x,y,z,w=.65,h=1.1){box(g,x,y,z,w+.22,h+.22,.16,trim);box(g,x,y,z+.09,w,h,.08,shadow);box(g,x,y,z+.15,.06,h,.04,wood);}
function crenel(g,x,y,z,w,d){box(g,x,y-.18,z,w,.36,d,trim);for(let a=-w/2+.28;a<w/2;a+=1)box(g,x+a,y+.25,z+d/2-.18,.48,.55,.38);for(let a=-w/2+.28;a<w/2;a+=1)box(g,x+a,y+.25,z-d/2+.18,.48,.55,.38);for(let a=-d/2+.7;a<d/2-.3;a+=1){box(g,x-w/2+.18,y+.25,z+a,.38,.55,.48);box(g,x+w/2-.18,y+.25,z+a,.38,.55,.48);}}
function tower(g,x,z,h=9,w=3){box(g,x,h/2,z,w,h,w);box(g,x,.35,z,w+.5,.7,w+.5,trim);box(g,x,h-.5,z,w+.3,.35,w+.3,trim);crenel(g,x,h,z,w+.4,w+.4);window(g,x,h-2,z+w/2,.4,1.3);}
export function createCastle(){const g=new T.Group();g.name='低台海上主堡';box(g,0,.4,0,23,.8,16);box(g,0,1,0,21,.4,14,trim);box(g,0,6,-2,8,10,7);crenel(g,0,11,-2,8.5,7.5);box(g,0,11.5,-2,5,1,4);roof(g,0,12,-2,5.6,4.6,1.7);for(const x of [-8.8,8.8])for(const z of [-5.5,5.5])tower(g,x,z,z<0?11:8,3);for(const x of [-9,9]){box(g,x,3,0,1,4,10);crenel(g,x,5,0,1.2,10);}box(g,0,3,-6,16,4,1);crenel(g,0,5,-6,16,1.2);for(const x of [-5.2,5.2]){box(g,x,3,6,5,4,1);crenel(g,x,5,6,5,1.2);}arch(g,0,1,6,4,4,.7,1.2);for(const x of [-2.3,0,2.3])for(const y of [4,7.3])window(g,x,y,1.55,.8,1.5);box(g,0,2.1,1.65,1.5,2.2,.2,wood);stairs(g,0,9.6,4,4,.25,.65);for(const x of [-6,6]){box(g,x,2,-2,3,2,6);roof(g,x,3,-2,3.5,6.5,1.1);}return g;}
const AEGEAN=mat('#326f96'),AEGEAN_LIGHT=mat('#6ea7bb'),OCHRE=mat('#ba8964'),WARM_WALL=mat('#e0d2b4'),DARK_WOOD=mat('#513e32'),ROOF_PALE=mat('#c58057'),LEAF=mat('#617f58'),CLAY=mat('#ae7651');
let greekVariant=0,tileVariant=0;

function archedPanel(g,x,bottom,z,w,h,m){
 const radius=w/2,spring=h-radius,s=new T.Shape();
 s.moveTo(-radius,0);s.lineTo(radius,0);s.lineTo(radius,spring);
 for(let i=0;i<=8;i++){const a=Math.PI*i/8;s.lineTo(radius*Math.cos(a),spring+radius*Math.sin(a));}
 s.lineTo(-radius,0);s.closePath();
 return mesh(g,new T.ExtrudeGeometry(s,{depth:.09,bevelEnabled:false}),m,x,bottom,z);
}
function slopeRoof(g,rise,roofMat){
 const half=2.83,len=Math.hypot(half,rise),pitch=Math.atan2(rise,half);
 // Thin roof sheets actually meet the wall and ridge; the front and rear
 // gables close the triangle rather than leaving a floating roof slab.
 roof(g,0,3.39,1.48,5.66,.17,rise,WARM_WALL);
 roof(g,0,3.39,-2.17,5.66,.17,rise,WARM_WALL);
 for(const side of[-1,1]){
  const sheet=box(g,side*half/2,3.39+rise/2,-.36,len,.17,4.58,roofMat);
  sheet.rotation.z=side<0?pitch:-pitch;
  for(const fromRidge of[.52,1.18,1.84,2.5]){
   const x=side*fromRidge,y=3.39+rise*(1-fromRidge/half)+.11;
   const course=box(g,x,y,-.36,.09,.07,4.51,side<0?tile:ROOF_PALE);
   course.rotation.z=side<0?pitch:-pitch;
  }
  for(const z of[-2.66,1.94])rod(g,[side*half,3.39,z],[0,3.39+rise,z],.065,stone,.065,6);
 }
 box(g,0,3.43+rise,-.36,.24,.18,4.68,roofMat);
}
function windowOnSide(g,x,z,greek){
 const side=new T.Group();side.position.set(x,0,z);side.rotation.y=x>0?Math.PI/2:-Math.PI/2;g.add(side);
 window(side,0,2.08,0,.64,.92);
 for(const dx of[-.46,.46])box(side,dx,2.08,.19,.17,1.03,.09,greek?AEGEAN:wood);
}
function porchColumn(g,x,z,top=3.02){
 cyl(g,x,(.70+top)/2,z,.105,top-.70,wood,6);
 box(g,x,top-.03,z,.34,.12,.34,trim);
}
export function createHouse(greek=false,requestedVariant){
 const variant=((Number.isInteger(requestedVariant)?requestedVariant:(greek?greekVariant++:tileVariant++))%4+4)%4;
 const g=new T.Group();g.name=(greek?'希臘海島平房':'陶瓦港鎮平房')+` · ${variant+1}`;
 const wall=greek?white:(variant%2?WARM_WALL:trim),accent=greek?AEGEAN:wood;
 // Recessed stone plinth and contiguous porch leave a consistent footprint for
 // the existing cliff-foundation and doorway support placement.
 box(g,0,.24,0,6,.48,5,stone);
 box(g,0,.55,-.36,5.02,.17,3.9,greek?white:OCHRE);
 box(g,0,1.95,-.35,4.8,2.9,3.6,wall);
 box(g,0,.27,2.12,5.15,.54,1.96,stone);
 box(g,0,.62,2.12,5.15,.18,1.96,greek?white:trim);
 for(let i=0;i<3;i++)box(g,0,.11*(i+1),3.72-i*.32,1.72,.22*(i+1),.43,stone);
 // The door and windows sit on the front plane at z=1.45. No front frame
 // floats ahead of its wall, and no roof beam extends beyond the eaves.
 archedPanel(g,0,.68,1.51,1.56,2.18,greek?white:stone);
 archedPanel(g,0,.70,1.63,1.29,1.95,greek?AEGEAN:DARK_WOOD);
 box(g,-.45,1.6,1.76,.07,.22,.05,greek?ROOF_PALE:bronze);
 for(const x of[-1.58,1.58]){
  window(g,x,2.05,1.53,.67,.83);
  for(const side of[-1,1])box(g,x+side*.47,2.05,1.72,.17,.94,.08,accent);
  box(g,x,2.61,1.62,1.03,.11,.18,greek?white:stone);
 }
 windowOnSide(g,2.4,-.7,greek);
 if(variant===2)windowOnSide(g,-2.4,.15,greek);
 // A small retaining curb and earth-filled planters tie the facade to the
 // cliff terrace instead of leaving isolated decorative spheres.
 for(const x of[-2.12,2.12]){
  box(g,x,.86,2.52,.57,.32,.61,greek?white:CLAY);
  ball(g,x,1.12,2.52,.4,.31,.38,LEAF,6);
 }
 if(greek){
  // Flat, walkable Aegean roof with a continuous parapet and a blue cornice.
  box(g,0,3.49,-.35,5.25,.18,4.24,white);
  box(g,0,3.83,1.8,5.3,.53,.22,white);
  box(g,0,3.83,-2.5,5.3,.53,.22,white);
  for(const x of[-2.57,2.57])box(g,x,3.83,-.35,.22,.53,4.1,white);
  box(g,0,3.52,1.93,5.4,.12,.11,variant===1?AEGEAN_LIGHT:AEGEAN);
  const postX=variant===1?1.88:2.12;
  for(const x of[-postX,postX])porchColumn(g,x,2.76);
  box(g,0,3.02,2.18,postX*2+.34,.13,1.62,variant===1?AEGEAN_LIGHT:AEGEAN);
  for(const x of[-1.7,-.84,0,.84,1.7]){
   if(Math.abs(x)>postX-.08)continue;
   box(g,x,3.12,2.18,.1,.12,1.67,white);
  }
  if(variant===1||variant===3){
   // A roof access pavilion is set back from the front parapet; its entire
   // base bears on the flat roof, producing a different silhouette.
   const ax=variant===1?-1.32:1.24;
   box(g,ax,3.96,-1.3,1.8,.8,1.26,white);
   box(g,ax,4.4,-1.3,1.99,.13,1.42,AEGEAN);
   archedPanel(g,ax,3.57,-.59,.75,.65,AEGEAN);
  }else{
   box(g,variant===0?-1.7:1.65,3.67,-1.38,.9,.15,.76,AEGEAN_LIGHT);
  }
  if(variant===2||variant===3){
   for(const x of[-1.76,1.76])box(g,x,1.61,2.92,.18,1.82,.12,AEGEAN);
   box(g,0,2.48,2.92,3.66,.12,.12,AEGEAN);
  }
 }else{
  const rise=[1.18,1.44,1.28,1.54][variant];
  slopeRoof(g,rise,variant%2?ROOF_PALE:tile);
  box(g,0,3.02,2.22,4.72,.16,1.6,variant===2?ROOF_PALE:wood);
  for(const x of[-2.17,2.17])porchColumn(g,x,2.78);
  for(const x of[-1.56,-.78,0,.78,1.56])box(g,x,3.15,2.24,.12,.1,1.66,DARK_WOOD);
  if(variant!==1){
   const cx=variant===2?-1.65:1.58;
   box(g,cx,4.35,-1.25,.52,1.48,.56,stone);
   box(g,cx,5.13,-1.25,.7,.16,.74,trim);
  }
  if(variant===1||variant===3){
   // A supported balcony over the entrance; braces visibly end in the wall.
   box(g,0,2.73,1.82,2.25,.17,1.02,wood);
   for(const x of[-.95,.95]){
    rod(g,[x,1.95,1.55],[x,2.68,2.26],.07,wood);
    box(g,x,3.12,2.28,.12,.83,.12,wood);
   }
   box(g,0,3.47,2.28,2.12,.12,.12,wood);
  }
  if(variant===2){
   box(g,-1.57,2.15,1.86,1.05,1.12,.12,ROOF_PALE);
   box(g,-1.57,2.15,1.96,.78,.92,.07,wood);
  }
 }
 for(const x of[-1.93,1.93])cyl(g,x,.89,2.99,.17,.37,CLAY,8);
 g.userData={style:greek?'greek':'tile',variant,footprint:{x:[-3,3],z:[-2.5,3.94]}};
 return g;
}
export function createGate(){const g=new T.Group();g.name='海門拱橋・淨寬20m';arch(g,0,0,0,20,14,2.3,5);const fill=new T.Shape();fill.moveTo(-12.3,4);fill.lineTo(-12.3,16.4);fill.lineTo(12.3,16.4);fill.lineTo(12.3,4);fill.absarc(0,4,12.3,0,Math.PI,false);fill.closePath();mesh(g,new T.ExtrudeGeometry(fill,{depth:5,bevelEnabled:false,curveSegments:10}),stone,0,0,-2.5);for(const x of [-12.8,12.8])tower(g,x,0,18,5);box(g,0,16.2,0,24,.5,5.5,trim);for(const z of [-2.55,2.55]){box(g,0,17,z,23,1.2,.45);for(let x=-11;x<=11;x+=1.4)box(g,x,17.8,z,.75,.5,.5);}for(let i=0;i<=14;i++){const a=Math.PI*i/14;const o=box(g,11.1*Math.cos(a),4+11.1*Math.sin(a),2.6,1.3,2.1,.15,trim);o.rotation.z=a-Math.PI/2;}return g;}
export function createLighthouse(){const g=new T.Group();g.name='燈塔眺望堡';cyl(g,0,.35,0,5,.7,stone,12);cyl(g,0,2.8,0,4.2,5,stone,12,3.9);cyl(g,0,5.3,0,4.35,.4,trim);for(let i=0;i<16;i++){const a=i*Math.PI/8;const o=box(g,4*Math.sin(a),5.9,4*Math.cos(a),.75,.85,.5);o.rotation.y=a;}cyl(g,0,8.5,0,2,6.2,stone,12,1.6);for(const y of [6,9,11.5])cyl(g,0,y,0,y===11.5?2.2:2.05,.25,trim);cyl(g,0,12.1,0,2.2,.4,stone);for(let i=0;i<8;i++){const a=i*Math.PI/4;rod(g,[1.6*Math.sin(a),12.3,1.6*Math.cos(a)],[1.6*Math.sin(a),14.1,1.6*Math.cos(a)],.09,wood);}const glow=new T.MeshStandardMaterial({color:0xffce77,emissive:0xffad33,emissiveIntensity:.6});ball(g,0,13,0,.55,.8,.55,glow);cyl(g,0,14.5,0,2.3,1,tile,8,0);window(g,0,8,1.94,.5,1.2);box(g,0,1.3,4.1,1.5,2.2,.3,trim);box(g,0,1.3,4.28,1.2,2,.12,wood);return g;}
export function createPoseidon(){const g=new T.Group();g.name='波賽頓・人物12m';cyl(g,0,.35,0,4,.7,stone,24);cyl(g,0,1,0,3.7,.6,trim,24);cyl(g,0,1.65,0,3.45,.7,stone,24);for(const x of [-.72,.72]){ball(g,x,2.28,.42,.48,.3,.85);rod(g,[x,2.4,.12],[x*.85,5.3,0],.37,stone,.52);} // tapered legs under drapery
const verts=[],idx=[],N=24,L=8;for(let j=0;j<=L;j++){const t=j/L,y=2.6+t*4.3;for(let i=0;i<N;i++){const a=i/N*Math.PI*2,r=(1.16-t*.28)+.17*Math.cos(a*8+t*1.2);verts.push(Math.cos(a)*r,y+.12*Math.sin(a*3)*(1-t),Math.sin(a)*r*.66);}}for(let j=0;j<L;j++)for(let i=0;i<N;i++){const a=j*N+i,b=j*N+(i+1)%N;idx.push(a,a+N,b,b,a+N,b+N);}const cloth=new T.BufferGeometry();cloth.setAttribute('position',new T.Float32BufferAttribute(verts,3));cloth.setIndex(idx);cloth.computeVertexNormals();mesh(g,cloth,stone);
const tv=[],ti=[],rings=[[6,.82,.52],[6.5,.83,.5],[7,.78,.48],[7.5,.88,.53],[8,1.08,.65],[8.5,1.35,.7],[8.9,1.33,.6],[9.25,.68,.43]];for(let j=0;j<rings.length;j++){const [y,rx,rz]=rings[j];for(let i=0;i<20;i++){const a=i*Math.PI/10;tv.push(Math.cos(a)*rx,y,Math.sin(a)*rz);}}for(let j=0;j<rings.length-1;j++)for(let i=0;i<20;i++){const a=j*20+i,b=j*20+(i+1)%20;ti.push(a,a+20,b,b,a+20,b+20);}const tg=new T.BufferGeometry();tg.setAttribute('position',new T.Float32BufferAttribute(tv,3));tg.setIndex(ti);tg.computeVertexNormals();mesh(g,tg,stone);rod(g,[0,9,0],[0,10,0],.43);ball(g,0,10.6,.03,.64,.88,.62);ball(g,0,10.6,.6,.16,.3,.23,stone,8);for(const x of [-.24,.24]){ball(g,x,10.78,.58,.22,.1,.12);ball(g,x,10.67,.62,.065,.05,.045,shadow,6);} // eyes under brows
for(let i=0;i<9;i++){const a=(i/8)*Math.PI;ball(g,.62*Math.cos(a),10.68+.65*Math.sin(a),-.02,.23,.4,.3,stone,8);}for(let i=0;i<7;i++){const x=(i-3)*.14;ball(g,x,10-.16*(1-Math.abs(x)),.51,.15,.43,.18,stone,8);}for(const side of [-1,1]){ball(g,side*1.18,8.9,0,.48,.58,.48);const elbow=side<0?[-2.05,8.25,.18]:[1.85,7.55,.12],hand=side<0?[-2.8,9,.4]:[1.45,6.55,.45];rod(g,[side*1.2,8.9,0],elbow,.36,stone,.34);ball(g,side*1.52,8.35,.08,.34,.66,.34);ball(g,...elbow,.34,.37,.34);rod(g,elbow,hand,.23,stone,.32);ball(g,...hand,.27,.37,.27);}
// Trident rests on pedestal, held by raised left hand.
rod(g,[-2.8,2,.4],[-2.8,12.8,.4],.105);for(const s of [-1,1]){rod(g,[-2.8,11.6,.4],[-2.8+s*.9,12,.4],.1);rod(g,[-2.8+s*.9,12,.4],[-2.8+s*.9,13.3,.4],.1,stone,.035);}rod(g,[-2.8,12.6,.4],[-2.8,13.8,.4],.15,stone,0);const figure=new T.Group();for(const o of [...g.children].slice(3))figure.add(o);figure.scale.set(1.08,1.266,1.08);figure.position.y=-.532;g.add(figure);return g;}
export const kits=[['poseidon','波賽頓雕像',createPoseidon],['castle','低台主城堡',createCastle],['greek','希臘海島平房',()=>createHouse(true)],['tile','陶瓦港鎮平房',()=>createHouse(false)],['gate','拱橋出入口',createGate],['lighthouse','燈塔眺望堡',createLighthouse]];
export function triangleCount(g){let n=0;g.traverse(o=>{if(o.isMesh)n+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});return n;}





