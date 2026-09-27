import * as T from 'three';
const material=(color)=>new T.MeshStandardMaterial({color,roughness:.88});
const stone=material('#b6b39d'),light=material('#ddd4b7'),warm=material('#c8c0a4'),dark=material('#384e52'),blue=material('#265d78'),gold=material('#b7985c');
function add(root,name,geo,mat,x=0,y=0,z=0){const o=new T.Mesh(geo,mat);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);return o;}
function box(g,name,x,y,z,w,h,d,m=stone){return add(g,name,new T.BoxGeometry(w,h,d),m,x,y,z);}
function octagon(g,name,x,y,z,r,h,m=stone,top=r){const o=add(g,name,new T.CylinderGeometry(top,r,h,8),m,x,y,z);o.rotation.y=Math.PI/8;return o;}
function extrude(g,name,shape,depth,z,m=stone){return add(g,name,new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:16}),m,0,0,z);}
function wedge(g,a,b,inner,outer,z){const s=new T.Shape();s.moveTo(inner*Math.cos(a),4+inner*Math.sin(a));s.lineTo(outer*Math.cos(a),4+outer*Math.sin(a));s.lineTo(outer*Math.cos(b),4+outer*Math.sin(b));s.lineTo(inner*Math.cos(b),4+inner*Math.sin(b));s.closePath();return extrude(g,'放射拱券石',s,.45,z,Math.round(a*100)%2?light:warm);}
function slit(g,x,y,z,side){box(g,'箭窗石框',x,y,z,1.15,2.55,.3,light);box(g,'箭窗凹槽',x,y,z+side*.17,.34,1.93,.07,dark);box(g,'窗臺',x,y-1.3,z+side*.08,1.35,.22,.56,warm);}
function shield(g,x,y,z,side){const s=new T.Shape();s.moveTo(-1.35,2.2);s.lineTo(1.35,2.2);s.lineTo(1.35,-1.25);s.lineTo(0,-2.25);s.lineTo(-1.35,-1.25);s.closePath();const p=extrude(g,'海軍藍盾徽',s,.13,-.065,blue);p.position.set(x,y,z);if(side<0)p.rotation.y=Math.PI;
 const emblem=new T.Group();emblem.position.set(x,y,z+side*.11);if(side<0)emblem.rotation.y=Math.PI;g.add(emblem);
 box(emblem,'錨柄',0,.1,.02,.16,2.0,.09,gold);box(emblem,'錨橫桿',0,.6,.02,1.18,.15,.09,gold);
 const arc=new T.Shape();arc.moveTo(-.8,-.2);arc.quadraticCurveTo(-.7,-1.0,0,-1.13);arc.quadraticCurveTo(.7,-1,.8,-.2);arc.lineTo(.54,-.43);arc.quadraticCurveTo(.45,-.78,0,-.88);arc.quadraticCurveTo(-.45,-.78,-.54,-.43);arc.closePath();extrude(emblem,'錨爪浮雕',arc,.09,0,gold);
 const ring=add(emblem,'錨環',new T.TorusGeometry(.24,.06,4,10),gold,0,1.22,.03);ring.castShadow=false;
}
function tower(g,x){
 octagon(g,'八角護岸基座',x,.6,0,5.5,1.2,stone);octagon(g,'塔基收分',x,1.45,0,5.3,.5,warm,4.8);octagon(g,'厚壁堡塔',x,11.85,0,4.8,20.3,stone,4.6);
 for(const y of[3.1,10,18.9])octagon(g,'堡塔水平腰線',x,y,0,4.86,.28,warm);
 octagon(g,'塔頂承托檐',x,21.55,0,4.6,.85,warm,5.15);octagon(g,'塔頂平台',x,22.13,0,5.2,.32,light);
 // Eight parapet facets and paired merlons, supported directly by the cornice.
 const apothem=5.03*Math.cos(Math.PI/8),edge=2*5.03*Math.sin(Math.PI/8);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;const wall=box(g,'八角女兒牆',x+Math.sin(a)*apothem,22.85,Math.cos(a)*apothem,edge+.08,1.15,.45,warm);wall.rotation.y=a;
 for(const d of[-.95,.95]){const m=box(g,'堡塔雉堞',x+Math.sin(a)*apothem+Math.cos(a)*d,23.9,Math.cos(a)*apothem-Math.sin(a)*d,1.0,1.05,.67,light);m.rotation.y=a;}
 const c=box(g,'檐下托石',x+Math.sin(a)*4.48,20.75,Math.cos(a)*4.48,.62,.85,.85,warm);c.rotation.y=a;}
 for(const side of[-1,1]){slit(g,x,6.7,side*4.43,side);slit(g,x,19.9,side*4.32,side);shield(g,x,14.7,side*4.55,side);}
 // Broad tapered buttresses at the sea-facing foot, tied into the tower wall.
 for(const side of[-1,1])for(const dx of[-2.6,2.6]){const s=new T.Shape();s.moveTo(0,0);s.lineTo(2.6,0);s.lineTo(.95,7.8);s.lineTo(0,7.8);s.closePath();const o=add(g,'斜收護岸扶壁',new T.ExtrudeGeometry(s,{depth:1.25,bevelEnabled:false}),stone);o.rotation.y=side>0?-Math.PI/2:Math.PI/2;o.position.set(x+dx+(side>0?.625:-.625),.1,side*3.5);}
}
export function createGrandGate(){const g=new T.Group();g.name='蒼壁巨型海門';
 // One continuous masonry mass: open-bottom arch cut directly into the bridge body.
 const wall=new T.Shape();wall.moveTo(-15.5,0);wall.lineTo(-15.5,19.4);wall.lineTo(15.5,19.4);wall.lineTo(15.5,0);wall.lineTo(12,0);wall.lineTo(12,4);wall.absarc(0,4,12,0,Math.PI,false);wall.lineTo(-12,0);wall.closePath();extrude(g,'一體拱橋承重石牆',wall,8,-4);
 for(const side of[-1,1]){
 for(let i=0;i<19;i++){const gap=.007,a=i/19*Math.PI+gap,b=(i+1)/19*Math.PI-gap;wedge(g,a,b,12,14.0,side>0?4:-4.45);}
 for(const x of[-13,13])box(g,'拱腳石柱',x,2,side*4.2,2,4,.5,light);
 for(const y of[17.85,19.25])box(g,'橋面連續石檐',0,y,side*4.22,31.2,.38,.66,warm);
 box(g,'橋上防護女兒牆',0,20.1,side*4.05,30.5,1.2,.72,stone);
 for(let x=-14.3;x<=14.4;x+=1.78)box(g,'橋面雉堞',x,21.12,side*4.07,.92,.91,.82,light);
 // Prominent central keystone on the arch crown.
 const key=new T.Shape();key.moveTo(-.62,15.94);key.lineTo(.62,15.94);key.lineTo(.95,18.15);key.lineTo(-.95,18.15);key.closePath();extrude(g,'中央鎖石',key,.76,side>0?4.18:-4.94,light);
 }
 box(g,'通行橋面',0,19.45,0,31.3,.35,8.45,warm);
 for(const x of[-17.5,17.5])tower(g,x);
 g.userData={status:'preview',openingWidth:24,openingHeight:16,bridgeDepth:8,design:'Lower broad bastions, thick sea arch, navy anchor shields'};return g;}

