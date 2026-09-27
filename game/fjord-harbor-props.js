import * as T from 'three';

// All positions are in the harbor group coordinates. The town places this
// group 4 m forward; the existing quay then occupies x=-23..23, z=-21..-13.
const STONE = new T.MeshStandardMaterial({color:0xb7b8a9,roughness:.98,flatShading:true});
const PALE = new T.MeshStandardMaterial({color:0xe7dfc6,roughness:.93,flatShading:true});
const WALL = new T.MeshStandardMaterial({color:0xd9d4bd,roughness:.96,flatShading:true});
const SHADE = new T.MeshStandardMaterial({color:0x32464a,roughness:1,flatShading:true});
const TILE = new T.MeshStandardMaterial({color:0xa75e43,roughness:.9,flatShading:true});
const TILE_LIGHT = new T.MeshStandardMaterial({color:0xc47952,roughness:.9,flatShading:true});
const TIMBER = new T.MeshStandardMaterial({color:0x76583c,roughness:1,flatShading:true});
const PLANK = new T.MeshStandardMaterial({color:0xa58257,roughness:1,flatShading:true});
const PLANK_LIGHT = new T.MeshStandardMaterial({color:0xc4a171,roughness:1,flatShading:true});
const BLUE = new T.MeshStandardMaterial({color:0x466a75,roughness:.94,flatShading:true});
const ROPE = new T.MeshStandardMaterial({color:0xcbb88a,roughness:1,flatShading:true});
const CANVAS = new T.MeshStandardMaterial({color:0xd6b788,roughness:1,flatShading:true,side:T.DoubleSide});
const HULL = new T.MeshStandardMaterial({color:0x65503d,roughness:.94,flatShading:true,side:T.DoubleSide});
const NET = new T.MeshStandardMaterial({color:0x75847c,roughness:1,flatShading:true});

function add(g,name,geometry,material,x=0,y=0,z=0){
 const m=new T.Mesh(geometry,material);m.name=name;m.position.set(x,y,z);
 m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
}
function box(g,name,x,y,z,w,h,d,material=STONE){return add(g,name,new T.BoxGeometry(w,h,d),material,x,y,z);}
function cyl(g,name,x,y,z,r,h,material=TIMBER,sides=8,top=r){return add(g,name,new T.CylinderGeometry(top,r,h,sides),material,x,y,z);}
function beam(g,name,a,b,r,material=TIMBER,sides=6){
 const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av);
 const m=add(g,name,new T.CylinderGeometry(r,r,delta.length(),sides),material,...av.add(bv).multiplyScalar(.5).toArray());
 m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;
}
function gable(g,x,wallTop,z,w,d,rise,material){
 const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(0,rise);shape.closePath();
 return add(g,'山牆屋頂',new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false}),material,x,wallTop,z-d/2);
}
function nameGroup(parent,name){const g=new T.Group();g.name=name;parent.add(g);return g;}

function warehouse(root){
 const g=nameGroup(root,'西側港務倉庫與卸貨門');const x=-11,z=-20.32,base=2.2;
 box(g,'完整石基',x,base+.24,z,6.1,.48,3.55,STONE);
 box(g,'灰白灰泥牆',x,base+2.25,z,5.8,4.05,3.25,WALL);
 gable(g,x,base+4.3,z,6.3,3.8,1.55,TILE);
 box(g,'前後檐口',x,base+4.32,z+1.82,6.5,.2,.28,PALE);
 box(g,'倉庫雙扇深門',x,base+1.53,z+1.674,2.35,2.75,.08,SHADE);
 for(const side of[-1,1]){
  box(g,'倉門木板',x+side*.58,base+1.53,z+1.73,1.1,2.65,.12,TIMBER);
  box(g,'倉門橫檔',x+side*.58,base+.68,z+1.81,1.13,.12,.08,PLANK);
  box(g,'倉門橫檔',x+side*.58,base+2.25,z+1.81,1.13,.12,.08,PLANK);
  box(g,'倉庫高窗石框',x+side*2.03,base+3.12,z+1.72,.72,1.05,.16,PALE);
  box(g,'倉庫高窗',x+side*2.03,base+3.12,z+1.82,.47,.82,.07,SHADE);
 }
 // A shallow loading porch faces the quay; its two uprights visibly support
 // the canopy and leave a clear passage around the central castle steps.
 box(g,'卸貨門雨棚',x,base+3.08,z+2.28,3.45,.2,1.05,PLANK);
 for(const side of[-1,1]){
  cyl(g,'雨棚立柱',x+side*1.56,base+1.54,z+2.65,.12,3.08,TIMBER,6);
  beam(g,'雨棚斜撐',[x+side*1.56,base+2.35,z+2.65],[x+side*1.05,base+3.06,z+2.1],.07,TIMBER);
 }
 box(g,'倉前裝卸石板',x,base+.04,-17.73,5.5,.08,.88,PALE);
 return g;
}

function shop(root){
 const g=nameGroup(root,'東側雙拱商舖');const x=11,z=-20.25,base=2.2,front=z+1.66;
 box(g,'商舖完整石基',x,base+.24,z,6.2,.48,3.55,STONE);
 box(g,'商舖灰白牆體',x,base+2.22,z,5.9,4.03,3.25,WALL);
 gable(g,x,base+4.25,z,6.3,3.8,1.4,TILE_LIGHT);
 box(g,'檐下石帶',x,base+4.19,front+.06,6.25,.22,.18,PALE);
 for(const side of[-1,1]){
  const cx=x+side*1.43;
  box(g,'拱廊深色店面',cx,base+1.4,front+.05,2.3,2.75,.08,SHADE);
  box(g,'店面雙扇木門',cx,base+1.2,front+.12,1.65,2.35,.1,side<0?BLUE:TIMBER);
  box(g,'商舖上窗石框',cx,base+3.45,front+.09,.9,.95,.16,PALE);
  box(g,'商舖上窗',cx,base+3.45,front+.19,.62,.68,.07,SHADE);
 }
 // Three columns and two open stone arches form a proper covered arcade.
 // Its arcade line is still 0.45 m behind the waterfront edge.
 const arcadeZ=-17.86,spring=base+2.1;
 for(const dx of[-2.86,0,2.86]){
  cyl(g,'拱廊立柱',x+dx,base+1.08,arcadeZ,.24,2.16,STONE,8);
  cyl(g,'拱廊柱頭',x+dx,spring+.08,arcadeZ,.37,.25,PALE,8);
 }
 for(const dx of[-1.43,1.43])add(g,'石拱券',new T.TorusGeometry(1.43,.18,5,12,Math.PI),PALE,x+dx,spring,arcadeZ);
 box(g,'拱廊連續檐梁',x,base+3.67,arcadeZ,6.24,.36,.78,STONE);
 box(g,'拱廊屋面',x,base+3.96,-18.25,6.44,.22,1.72,TILE);
 box(g,'商會藍色橫招牌',x,base+3.29,arcadeZ+.46,1.52,.42,.1,BLUE);
 for(const dx of[-2.6,2.6]){
  cyl(g,'庭廊吊燈',x+dx,base+2.7,arcadeZ-.03,.12,.32,ROPE,6);
  cyl(g,'庭廊吊燈罩',x+dx,base+2.45,arcadeZ-.03,.21,.28,TILE,6,0);
 }
 return g;
}

function crate(g,x,y,z,scale=1,material=PLANK){
 box(g,'港口木箱',x,y+.48*scale,z,.92*scale,.96*scale,.86*scale,material);
 for(const side of[-1,1]){
  box(g,'木箱護邊',x+side*.42*scale,y+.48*scale,z+.46*scale,.1*scale,.96*scale,.1*scale,TIMBER);
  box(g,'木箱護邊',x+side*.42*scale,y+.48*scale,z-.46*scale,.1*scale,.96*scale,.1*scale,TIMBER);
 }
 box(g,'木箱蓋',x,y+.99*scale,z,.98*scale,.07*scale,.92*scale,PLANK_LIGHT);
}
function barrel(g,x,y,z,scale=1){
 cyl(g,'海港酒桶',x,y+.55*scale,z,.36*scale,1.1*scale,TIMBER,8,.32*scale);
 for(const h of[.18,.87])cyl(g,'桶身鐵箍',x,y+h*scale,z,.377*scale,.075*scale,SHADE,8);
 cyl(g,'桶蓋',x,y+1.11*scale,z,.34*scale,.07*scale,PLANK,8);
}
function mooring(g,x,y,z){
 cyl(g,'繫船石墩底座',x,y+.08,z,.31,.16,STONE,8);
 cyl(g,'繫船樁',x,y+.35,z,.16,.6,TIMBER,8,.14);
 cyl(g,'繫船樁橫木',x,y+.65,z,.36,.14,TIMBER,8);
}
function pier(root,x,idx){
 const g=nameGroup(root,`主碼頭 ${idx}`);
 // Stone landhead overlaps the quay edge. Two short steps meet the timber
 // deck, so the 0.6 m descent is legible at both boat and overview height.
 box(g,'碼頭石岸接頭',x,.78,-16.94,3.1,1.56,1.6,STONE);
 box(g,'碼頭下階',x,1.58,-16.02,2.86,.28,.78,PALE);
 box(g,'碼頭上階',x,1.91,-16.79,2.86,.27,.8,PALE);
 for(const side of[-1,1]){
  box(g,'縱向木梁',x+side*1.18,1.31,-12.57,.2,.3,7.9,TIMBER);
  for(const z of[-15.3,-12.3,-9.4]){
   cyl(g,'入海承重木樁',x+side*1.16,.54,z,.16,2.08,TIMBER,6,.15);
   beam(g,'樁梁斜撐',[x+side*1.15,.5,z],[x+side*.78,1.29,z+.54],.075,TIMBER,5);
  }
 }
 for(let i=0;i<13;i++){
  const z=-15.95+i*.56;
  box(g,'不齊木棧板',x,1.53,z,2.84,.13,.48,i%4===0?PLANK_LIGHT:PLANK);
 }
 box(g,'碼頭外端端梁',x,1.31,-8.9,3,.24,.28,TIMBER);
 for(const side of[-1,1]){
  mooring(g,x+side*1.08,1.6,-9.25);
  mooring(g,x+side*1.55,2.2,-17.65);
 }
 g.userData={landwardZ:-17.35,seawardZ:-8.74,walkwayHeight:1.6,shoreHeight:2.2};
 return g;
}
function stall(root){
 const g=nameGroup(root,'碼頭魚市與布棚');const x=5.55,z=-18.94,base=2.2;
 for(const dx of[-1.16,1.16])for(const dz of[-.65,.65])cyl(g,'布棚木柱',x+dx,base+1.27,z+dz,.075,2.54,TIMBER,5);
 const shape=new T.Shape();shape.moveTo(-1.35,0);shape.lineTo(0,.47);shape.lineTo(1.35,0);shape.closePath();
 add(g,'雙坡赭色布棚',new T.ExtrudeGeometry(shape,{depth:1.65,bevelEnabled:false}),CANVAS,x,base+2.5,z-.825);
 box(g,'魚市木檯',x,base+.93,z,2.14,.15,.84,PLANK);
 for(const dx of[-.87,.87])box(g,'木檯腳',x+dx,base+.48,z,.1,.92,.72,TIMBER);
 for(const dx of[-.6,0,.6]){
  const fish=add(g,'待售海魚',new T.ConeGeometry(.17,.74,6),BLUE,x+dx,base+1.05,z+.03);
  fish.rotation.z=Math.PI/2;
 }
 crate(g,7.07,base,-19.75,.6,BLUE);
 return g;
}
function crane(root){
 const g=nameGroup(root,'西碼頭木吊架與絞盤');const x=-5.9,z=-18.95,base=2.2;
 box(g,'吊架錨固石座',x,base+.18,z,.95,.36,1.05,STONE);
 beam(g,'吊架主柱',[x,base+.18,z],[x,base+4.25,z],.2,TIMBER,8);
 beam(g,'吊架斜撐',[x,base+.52,z-.54],[x,base+3.3,z],.12,TIMBER);
 beam(g,'吊架懸臂',[x,base+3.89,z-.66],[x,base+4.13,z+2.16],.15,TIMBER,7);
 beam(g,'吊架上索',[x,base+4.19,z],[x,base+4.15,z+2.13],.025,ROPE,5);
 beam(g,'吊架吊索',[x,base+4.15,z+2.11],[x,base+1.37,z+2.11],.035,ROPE,5);
 cyl(g,'吊架木絞盤',x-.42,base+1.1,z,.32,.78,TIMBER,8);
 beam(g,'絞盤手柄',[x-.84,base+1.1,z],[x-1.16,base+1.44,z],.055,PLANK,5);
 const hook=add(g,'卸貨吊鉤',new T.TorusGeometry(.13,.04,5,8,Math.PI*1.5),SHADE,x,base+1.29,z+2.11);
 hook.rotation.z=Math.PI;
 crate(g,x+.8,base,z-.3,.84);
 return g;
}

function fishingSkiff(root,name,x,z,rotation=0,scale=1,cargo=false){
 const g=nameGroup(root,name);g.position.set(x,0,z);g.rotation.y=rotation;g.scale.setScalar(scale);
 // A shallow five-station hull has a proper tapered bow and stern. Its keel
 // lies below sea level while seats, cargo and gunwale remain visible.
 const stations=[[-2.33,.07],[-1.72,.56],[-.65,.75],[.65,.75],[1.72,.56],[2.33,.07]];
 const vertices=[],faces=[];
 for(const [zz,width]of stations){
  vertices.push(-width,.32,zz,width,.32,zz,-width*.62,-.38,zz,width*.62,-.38,zz);
 }
 for(let i=0;i<stations.length-1;i++){
  const a=4*i,b=a+4;
  faces.push(a,b,a+2,b,b+2,a+2,a+1,a+3,b+1,b+1,a+3,b+3);
  faces.push(a+2,b+2,a+3,b+2,b+3,a+3);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(faces);geometry.computeVertexNormals();
 add(g,'水線下漁舟木船殼',geometry,HULL);
 for(const side of[-1,1]){
  for(let i=0;i<stations.length-1;i++){
   const [z0,w0]=stations[i],[z1,w1]=stations[i+1];
   beam(g,'連續舷緣',[side*w0,.34,z0],[side*w1,.34,z1],.07,PLANK_LIGHT,5);
  }
 }
 box(g,'船內底板',0,-.12,0,.91,.07,3.45,TIMBER);
 for(const zz of[-.72,.72])box(g,'橫座板',0,.18,zz,1.42,.12,.32,PLANK_LIGHT);
 beam(g,'船首纜繩',[0,.31,2.18],[.9,.04,2.96],.035,ROPE,5);
 if(cargo){
  crate(g,-.18,.1,.14,.53,BLUE);
  barrel(g,.33,.1,-.83,.48);
  beam(g,'短桅',[0,-.08,-.15],[0,2.23,-.15],.07,TIMBER,6);
  const sail=new T.Shape();sail.moveTo(-.73,0);sail.lineTo(.61,0);sail.lineTo(0,1.4);sail.closePath();
  const cloth=add(g,'束起的帆布',new T.ShapeGeometry(sail),CANVAS,0,.62,-.14);cloth.rotation.y=Math.PI/2;
  beam(g,'帆橫桁',[-.69,.62,-.15],[.61,.62,-.15],.05,TIMBER,5);
 }else{
  for(const side of[-1,1])beam(g,'擱在舷邊的木槳',[side*.38,.34,-.36],[side*1.62,.2,.6],.045,PLANK,5);
  box(g,'盤起的漁網',0,.23,.22,.67,.14,.63,NET);
 }
 g.userData={moored:true,length:4.66*scale,beam:1.5*scale};return g;
}
function dryingNet(root){
 const g=nameGroup(root,'西岸晾網與浮標');const y=2.2,z=-18.12;
 for(const x of[-20.15,-17.85]){
  cyl(g,'晾網柱',x,y+.91,z,.09,1.82,TIMBER,6);
  box(g,'晾網柱石座',x,y+.14,z,.42,.28,.42,STONE);
 }
 beam(g,'晾網上繩',[-20.15,y+1.72,z],[-17.85,y+1.72,z],.035,ROPE,5);
 beam(g,'晾網下繩',[-20.15,y+.44,z],[-17.85,y+.44,z],.028,ROPE,5);
 for(let i=0;i<=7;i++){
  const x=-20.15+i*2.3/7;
  beam(g,'下垂漁網線',[x,y+1.72,z],[x,y+.44,z+.06],.017,NET,4);
 }
 for(let i=1;i<=3;i++){
  const yy=y+.44+i*.32;
  beam(g,'漁網橫線',[-20.15,yy,z],[-17.85,yy,z+.06],.017,NET,4);
 }
 for(const x of[-20.9,-17.03])cyl(g,'網邊浮標',x,y+.24,z+.38,.17,.48,ROPE,6);
 return g;
}

export function createFjordHarborProps(){
 const root=new T.Group();root.name='蒼壁峽灣 · 繁忙內港';
 warehouse(root);shop(root);stall(root);crane(root);
 const cargo=nameGroup(root,'港市貨物與繫船設施');
 for(const [x,z,s]of[[-7.55,-17.98,.7],[-7.15,-19.88,.6],[7.1,-17.9,.62],[12.5,-18.2,.62],[-13.8,-18.1,.72]])crate(cargo,x,2.2,z,s);
 for(const [x,z,s]of[[-7.5,-19.1,.72],[7.4,-19.4,.78],[15.5,-18.45,.65]])barrel(cargo,x,2.2,z,s);
 for(const [x,z]of[[-21.7,-17.8],[21.7,-17.8]])mooring(cargo,x,2.2,z);
 for(const [i,x]of[-16,0,16].entries())pier(root,x,i+1);
 dryingNet(root);
 fishingSkiff(root,'西碼頭系泊漁舟',-20.1,-7.65,-.13,.92,false);
 fishingSkiff(root,'東碼頭運貨小船',20,-7.55,.17,.93,true);
 fishingSkiff(root,'內港歸航划艇',5.5,-7.3,-.4,.83,false);
 root.userData={footprint:{x:[-22.1,22.1],z:[-22.3,-4.6]},shoreHeight:2.2,highestPoint:8.05,
  pierCenters:[-16,0,16],clearCentralSteps:{x:[-2.8,2.8],z:[-25,-18.1]}};
 return root;
}
