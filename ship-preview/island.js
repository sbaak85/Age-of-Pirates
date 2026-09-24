import * as THREE from 'three';

// Small, hand-composed coastal diorama. The sea level is Y = 0.
export function createIsland() {
  const island = new THREE.Group(); island.name = 'Coralhaven island';
  let seed = 9024;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const material = (color, roughness=.85) => new THREE.MeshStandardMaterial({color,roughness});
  const sand=material(0xf1d59a),stone=material(0xb7aa89),rockDark=material(0x8f8770),rockLight=material(0xc4a084);
  stone.flatShading=true;rockDark.flatShading=true;rockLight.flatShading=true;
  const grass=material(0x8eab51),grassLight=material(0xb6bc6b),wood=material(0xa37143),woodLight=material(0xd5a46a),woodDark=material(0x5c5040);
  const cream=material(0xf5e3ba),white=material(0xeee7d0),terracotta=material(0xcb6146),roofGold=material(0xdd984c),teal=material(0x368d91),blue=material(0x477c9c);
  const glass=material(0x22576a,.35),metal=material(0x425b59,.48),rope=material(0xc5b687);
  const greens=[0x3e793e,0x569041,0x78a84b,0x9abb55].map(c=>material(c));
  const coralColors=[0xe67476,0xcf71a2,0xdaa04c,0x779fbb,0xa7b962].map(c=>material(c));
  const mesh=(geometry,mat,parent=island)=>{const m=new THREE.Mesh(geometry,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const box=(w,h,d,x,y,z,mat,parent=island)=>{const m=mesh(new THREE.BoxGeometry(w,h,d),mat,parent);m.position.set(x,y,z);return m;};
  const rod=(a,b,r,mat,parent=island,rTop=r)=>{
    const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);
    const m=mesh(new THREE.CylinderGeometry(rTop,r,delta.length(),7),mat,parent);
    m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
  };
  const sphere=(x,y,z,sx,sy,sz,mat,parent=island)=>{const m=mesh(new THREE.IcosahedronGeometry(1,1),mat,parent);m.position.set(x,y,z);m.scale.set(sx,sy,sz);return m;};
  function line(points,r,mat,parent=island) {return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,5,false),mat,parent);}
  const coast = a => 1+.055*Math.sin(3*a+.5)+.044*Math.cos(5*a-.4)+.025*Math.sin(9*a);

  // Closed polygonal terraces have visible cliff sides, flat usable tops and grass caps.
  function terrace(cx,cz,rx,rz,bottom,top,sideMat,topMat,phase=0,n=28) {
    const positions=[],indices=[],colors=[];
    const rings=[[bottom,.83],[bottom+(top-bottom)*.25,1.01],[bottom+(top-bottom)*.48,.955],[bottom+(top-bottom)*.73,1.018],[top-.18,1],[top,.93]];
    for(let k=0;k<rings.length;k++)for(let j=0;j<n;j++) {
      const a=j/n*Math.PI*2,ir=1+.065*Math.sin(a*5+phase)+.035*Math.cos(a*7-phase);
      positions.push(cx+Math.cos(a)*rx*rings[k][1]*ir,rings[k][0],cz+Math.sin(a)*rz*rings[k][1]*ir);
      const c=new THREE.Color(0xffffff).multiplyScalar((k%2?.86:.97)+random()*.09);colors.push(c.r,c.g,c.b);
    }
    for(let k=0;k<rings.length-1;k++)for(let j=0;j<n;j++){const a=k*n+j,b=k*n+(j+1)%n;indices.push(a,b,a+n,b,b+n,a+n);}
    const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geom.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geom.setIndex(indices);geom.computeVertexNormals();
    const mat=sideMat.clone();mat.vertexColors=true;mat.flatShading=true;mat.side=THREE.DoubleSide;mesh(geom,mat);
    const poly=[];for(let j=0;j<n;j++){const a=j/n*Math.PI*2,ir=1+.065*Math.sin(a*5+phase)+.035*Math.cos(a*7-phase);poly.push(new THREE.Vector2(cx+Math.cos(a)*rx*.93*ir,-cz-Math.sin(a)*rz*.93*ir));}
    const cap=mesh(new THREE.ShapeGeometry(new THREE.Shape(poly)),topMat);cap.rotation.x=-Math.PI/2;cap.position.y=top+.004;
    return {cx,cz,rx,rz,top};
  }
  // Broad crescent-like sandy shore, with a sloped underwater skirt.
  const shorePositions=[],shoreIndices=[];const n=80;
  const shoreRings=[[-1.7,1.25],[-.15,1.04],[.20,1],[.36,.87]];
  for(const [y,r] of shoreRings)for(let j=0;j<n;j++){const a=j/n*Math.PI*2,k=coast(a);shorePositions.push(Math.cos(a)*8.7*r*k,y,Math.sin(a)*6.5*r*k);}
  for(let k=0;k<3;k++)for(let j=0;j<n;j++){const a=k*n+j,b=k*n+(j+1)%n;shoreIndices.push(a,b,a+n,b,b+n,a+n);}
  shorePositions.push(0,.36,0);for(let j=0;j<n;j++)shoreIndices.push(4*n,3*n+j,3*n+(j+1)%n);
  const shoreGeo=new THREE.BufferGeometry();shoreGeo.setAttribute('position',new THREE.Float32BufferAttribute(shorePositions,3));shoreGeo.setIndex(shoreIndices);shoreGeo.computeVertexNormals();
  const shoreMat=sand.clone();shoreMat.side=THREE.DoubleSide;mesh(shoreGeo,shoreMat);
  terrace(-.65,-.55,6.25,4.10,.28,1.9,stone,grassLight,.7);
  terrace(1.6,-2.3,3.55,2.75,1.45,4.45,rockLight,grass,1.4,22);
  terrace(-3.65,-2.9,1.90,1.8,1.7,6.35,rockLight,grassLight,2.1,14);
  terrace(-5.15,-2.4,1.15,1.6,.3,3.65,stone,grass,1.5,13);
  // Vertical outcrops subdivide large cliffs into sculpted rock masses.
  for(const [x,z,h,s] of [[3.95,-3.9,3.3,.9],[2.0,-4.8,2.8,.8],[-2.1,-4.4,4.7,.7],[-4.8,-3.5,4.8,.65],[5.3,-1.9,2.2,.65],[-5.9,-.9,2.5,.6]]) {
    const b=sphere(x,h*.5+.2,z,s,h*.58,s*.8,rockLight);b.rotation.y=random()*2;
  }

  function stair(a,b,count,width,mat=stone) {
    const dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);
    for(let i=0;i<count;i++){
      const t=(i+.5)/count,top=a[1]+(b[1]-a[1])*(i+1)/count;
      const step=box(width,.20,len/count+.035,a[0]+dx*t,top-.1,a[2]+dz*t,mat);step.rotation.y=angle;
    }
  }
  stair([-.9,.36,5.9],[-.9,1.92,2.3],13,1.25);
  stair([4.65,1.9,.9],[3.65,4.47,-1.9],17,1.0);
  stair([-5.1,1.9,-.5],[-3.75,3.8,-1.55],12,.8);
  stair([-3.75,3.8,-1.55],[-3.75,6.37,-3.0],15,.8);
  // Winding stepping stones guide the eye between the houses and stairs.
  for(let i=0;i<19;i++) {
    const a=i/18*Math.PI,x=Math.cos(a)*3.75-.5,z=Math.sin(a)*1.4+.42;
    const slab=mesh(new THREE.CylinderGeometry(.30,.34,.07,6),sand);slab.position.set(x,1.94,z);slab.scale.z=.72;slab.rotation.y=i*.61;
  }

  function house(x,y,z,w,d,h,roofMat,wallMat=cream,rotation=0,balcony=false) {
    const group=new THREE.Group();island.add(group);group.position.set(x,y,z);group.rotation.y=rotation;
    box(w+.14,.18,d+.14,0,.08,0,stone,group);
    box(w,h,d,0,h*.5+.13,0,wallMat,group);
    for(const xx of [-w*.5,w*.5])for(const zz of [-d*.5,d*.5])box(.085,h+.08,.085,xx,h*.5+.13,zz,wood,group);
    box(w+.09,.09,d+.09,0,h*.64,0,woodLight,group);
    // Front-facing door and shutters.
    box(.49,.9,.055,-w*.18,.60,d*.5+.035,woodDark,group);
    for(let j=0;j<4;j++)box(.094,.8,.035,-w*.18-.16+j*.105,.60,d*.5+.07,wood,group);
    sphere(-w*.18+.14,.58,d*.5+.1,.035,.035,.035,roofGold,group);
    function window(xx,yy,zz,turn=0) {
      const frame=new THREE.Group();group.add(frame);frame.position.set(xx,yy,zz);frame.rotation.y=turn;
      box(.5,.55,.06,0,0,0,woodLight,frame);box(.39,.43,.072,0,0,.025,glass,frame);
      box(.035,.45,.08,0,0,.07,cream,frame);box(.40,.03,.08,0,0,.07,cream,frame);
      for(const side of [-1,1]){box(.18,.55,.06,side*.33,0,.015,teal,frame);for(let k=0;k<4;k++)box(.16,.022,.02,side*.33,-.18+k*.12,.052,woodLight,frame);}
      box(.60,.08,.18,0,-.32,.06,woodLight,frame);
    }
    window(w*.25,h*.66,d*.5+.065);
    window(w*.5+.06,h*.58,0,Math.PI/2);
    window(-w*.5-.06,h*.58,0,-Math.PI/2);
    // Solid gable prism and individual terracotta tile rows.
    const rw=w+.34,rd=d+.38,rise=.66;
    const p=[-rw/2,h+.1,-rd/2,rw/2,h+.1,-rd/2,0,h+rise,-rd/2,-rw/2,h+.1,rd/2,rw/2,h+.1,rd/2,0,h+rise,rd/2];
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,2,5,4,2,4,1,0,1,4,0,4,3]);geo.computeVertexNormals();mesh(geo,roofMat,group);
    const slope=Math.atan2(rise-.1,rw/2),slant=Math.hypot(rw/2,rise-.1);
    for(const side of [-1,1])for(let row=0;row<4;row++)for(let col=0;col<6;col++) {
      const t=(row+.5)/4;
      const tile=box(slant/4+.04,.055,rd/6-.02,side*rw*.5*t,h+rise-(rise-.1)*t+.035,-rd*.5+rd*(col+.5)/6,roofMat,group);tile.rotation.z=-side*slope;
    }
    rod([0,h+rise+.035,-rd*.52],[0,h+rise+.035,rd*.52],.062,roofMat,group);
    box(.3,.7,.33,-w*.28,h+.45,-d*.24,cream,group);box(.38,.08,.4,-w*.28,h+.83,-d*.24,roofMat,group);
    if(balcony) {
      for(let i=0;i<10;i++)box((w+.5)/10-.025,.085,.9,-(w+.5)*.5+(i+.5)*(w+.5)/10,.12,d*.5+.47,woodLight,group);
      for(const xx of [-w*.55,0,w*.55])rod([xx,.15,d*.5+.9],[xx,.73,d*.5+.9],.035,wood,group);
      rod([-w*.55,.73,d*.5+.9],[w*.55,.73,d*.5+.9],.04,woodLight,group);
      for(const xx of [-w*.55,w*.55])rod([xx,-.8,d*.5+.8],[xx,.12,d*.5+.8],.065,woodDark,group);
    }
    return group;
  }
  house(-2.1,1.94,.7,2.25,1.65,1.85,terracotta,cream,-.15,true);
  house(2.65,1.94,1.45,1.65,1.45,1.45,teal,white,.15,true);
  house(1.3,4.48,-2.45,2.05,1.65,1.65,terracotta,cream,-.16,true);
  house(-5.4,.37,2.50,1.45,1.25,1.2,roofGold,white,-.25);
  house(5.75,.36,1.3,1.3,1.2,1.3,blue,cream,.45);
  // The tavern's cream/sea-green awning and hanging sign.
  for(let i=0;i<6;i++){const a=box(.39,.055,1.05,-3.23+i*.39,3.0,2.00,i%2?cream:teal);a.rotation.x=.17;}
  for(const x of [-3.23,-1.22])rod([x,1.92,2.47],[x,3.02,2.47],.05,wood);
  rod([-3.38,3.25,1.4],[-4.0,3.25,1.4],.04,woodDark);
  box(.48,.37,.08,-3.8,2.99,1.4,woodDark);
  if(typeof document!=='undefined'){
    const signCanvas=document.createElement('canvas');signCanvas.width=256;signCanvas.height=128;const sc=signCanvas.getContext('2d');sc.fillStyle='#3b5c58';sc.fillRect(0,0,256,128);sc.strokeStyle='#f1d9a2';sc.lineWidth=7;sc.strokeRect(9,9,238,110);sc.fillStyle='#f1d9a2';sc.font='bold 32px serif';sc.textAlign='center';sc.fillText('THE GULL',128,63);sc.font='20px serif';sc.fillText('T A V E R N',128,97);
    const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;
    const sign=mesh(new THREE.PlaneGeometry(.46,.35),new THREE.MeshStandardMaterial({map:signTexture}),island);sign.position.set(-3.8,2.99,1.445);
  }

  // Lighthouse above the warm limestone cliff.
  const lx=-3.65,lz=-3.15,ly=6.37;
  mesh(new THREE.CylinderGeometry(.84,1.0,.2,12),stone).position.set(lx,ly+.1,lz);
  mesh(new THREE.CylinderGeometry(.46,.69,2.38,14),white).position.set(lx,ly+1.34,lz);
  for(const yy of [.7,1.55])mesh(new THREE.CylinderGeometry(.61-yy*.07,.63-yy*.07,.23,14),terracotta).position.set(lx,ly+yy,lz);
  box(.27,.52,.055,lx,ly+.46,lz+.67,woodDark);
  mesh(new THREE.CylinderGeometry(.83,.75,.12,12),woodLight).position.set(lx,ly+2.58,lz);
  const beacon=mesh(new THREE.CylinderGeometry(.34,.34,.62,10),new THREE.MeshStandardMaterial({color:0xffda8b,emissive:0xe5b560,emissiveIntensity:.5,roughness:.3}));beacon.position.set(lx,ly+2.95,lz);
  for(let j=0;j<10;j++){const a=j/10*Math.PI*2;rod([lx+Math.cos(a)*.53,ly+2.6,lz+Math.sin(a)*.53],[lx+Math.cos(a)*.53,ly+3.3,lz+Math.sin(a)*.53],.024,metal);}
  mesh(new THREE.ConeGeometry(.88,.65,12),terracotta).position.set(lx,ly+3.55,lz);
  rod([lx,ly+3.85,lz],[lx,ly+4.22,lz],.025,metal);
  for(let j=0;j<12;j++){const a=j/12*Math.PI*2;rod([lx+Math.cos(a)*.77,ly+2.6,lz+Math.sin(a)*.77],[lx+Math.cos(a)*.77,ly+3.00,lz+Math.sin(a)*.77],.023,metal);}
  const guard=mesh(new THREE.TorusGeometry(.77,.025,5,32),metal);guard.rotation.x=Math.PI/2;guard.position.set(lx,ly+3.00,lz);

  // Pier with exposed support piles, cross braces, rope rails and small cargo.
  for(let i=0;i<25;i++)box(1.38,.13,.18,-.9,.58,4.5+i*.20,woodLight);
  for(let i=0;i<25;i++)box(.19,.13,1.12,-2.65+i*.20,.58,9.05,woodLight);
  for(const z of [4.7,6.3,7.9,9.35])for(const x of [-1.56,-.24]) {
    rod([x,-1.25,z],[x,1.05,z],.09,woodDark);
    mesh(new THREE.CylinderGeometry(.125,.125,.06,8),woodLight).position.set(x,1.07,z);
    if(z<9.3)line([[x,.90,z],[x,.70,z+.8],[x,.90,z+1.6]],.018,rope);
  }
  for(const x of [-2.60,-.9,1.9])for(const z of [8.54,9.55])rod([x,-1.4,z],[x,.90,z],.085,woodDark);
  for(const x of [-1.56,-.24])rod([x,-.8,5],[x,.44,6.3],.055,woodDark);
  function barrel(x,y,z,s=1) {
    mesh(new THREE.CylinderGeometry(.19*s,.20*s,.5*s,10),wood).position.set(x,y+.25*s,z);
    for(const yy of [.10,.40]){const r=mesh(new THREE.TorusGeometry(.20*s,.02*s,5,12),metal);r.rotation.x=Math.PI/2;r.position.set(x,y+yy*s,z);}
  }
  barrel(-2.45,.66,9.10);barrel(-2.16,.66,8.95,.8);barrel(-4.25,.4,3.2);
  for(const [x,y,z] of [[.8,.74,9.0],[1.3,.74,9.05],[-4.5,.56,3.1]]){box(.4,.38,.4,x,y,z,wood);for(const dx of [-.14,.14])box(.035,.4,.42,x+dx,y,z,woodLight);}

  function palm(x,y,z,height,angle) {
    const bend=.48,tx=x+Math.cos(angle)*bend,tz=z+Math.sin(angle)*bend;
    line([[x,y,z],[x+.1*Math.cos(angle),y+height*.4,z+.1*Math.sin(angle)],[tx,y+height,tz]],.095,wood);
    for(let i=1;i<8;i++) {
      const t=i/8,r=mesh(new THREE.TorusGeometry(.099,.015,4,8),woodDark);r.rotation.x=Math.PI/2;r.position.set(x+bend*t*t*Math.cos(angle),y+height*t,z+bend*t*t*Math.sin(angle));
    }
    for(let l=0;l<8;l++){
      const a=l/8*Math.PI*2+angle,len=1.35+(l%3)*.16,verts=[],ids=[];
      for(let j=0;j<=10;j++){
        const t=j/10,dist=t*len,yy=y+height+Math.sin(t*Math.PI)*.36-.5*t*t,w=Math.sin(t*Math.PI)*.24;
        for(const side of [-1,1])verts.push(tx+Math.cos(a)*dist+Math.sin(a)*w*side,yy-Math.abs(w)*.18,tz+Math.sin(a)*dist-Math.cos(a)*w*side);
        if(j<10){const k=j*2;ids.push(k,k+1,k+2,k+1,k+3,k+2);}
      }
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(ids);geo.computeVertexNormals();
      const m=greens[l%4].clone();m.side=THREE.DoubleSide;mesh(geo,m);
    }
    for(let i=0;i<3;i++)sphere(tx+(i-1)*.12,y+height-.1,tz+.12,.10,.13,.1,woodDark);
  }
  for(const p of [[-6.5,.35,1.4,2.8,1],[-5.6,.36,3.6,2.7,2],[6.6,.32,.4,3.2,2],[4.9,.34,3.5,2.6,3],[2.8,.36,4.3,2.4,1],[-.6,4.48,-2.0,2.7,2],[3.25,4.48,-3.5,2.2,1],[.1,4.48,-3.8,2.6,3],[-4.8,3.68,-2.4,2.1,3],[5.1,1.93,-.35,2.6,2],[-2.4,.34,4.8,2.35,1]])palm(...p);
  // Ground plants form small clusters rather than a uniform scatter.
  for(const [cx,cy,cz] of [[-4.6,1.94,.1],[.1,1.94,2.3],[4.3,1.94,-.6],[2.9,4.48,-1.8],[-2.5,6.36,-3.1],[-6.4,.36,3],[6.2,.36,2.5],[-.8,4.48,-3.2]]) {
    for(let j=0;j<7;j++){const a=j*.93,sz=.25+random()*.18;sphere(cx+Math.cos(a)*.45,cy+.17,cz+Math.sin(a)*.35,sz,.27+random()*.15,sz,greens[j%4]);}
  }
  // Hanging vines on the faces of the higher terraces.
  for(const [x,y,z] of [[-3.0,6.34,-1.50],[-4.5,6.34,-1.65],[.6,4.45,.1],[2.2,4.45,.15],[4.3,4.45,-2.1]]) {
    for(let k=0;k<5;k++)sphere(x+Math.sin(k*.8)*.14,y-k*.32,z,.20,.23,.13,greens[(k+1)%4]);
  }
  // Beach furniture and striped fabric parasol.
  const umbrella=new THREE.Group();island.add(umbrella);umbrella.position.set(4.7,.38,4.45);
  rod([0,0,0],[0,1.52,0],.033,woodDark,umbrella);
  for(let j=0;j<10;j++){
    const a=j/10*Math.PI*2,b=(j+1)/10*Math.PI*2;
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,1.68,0,Math.cos(a)*.80,1.34,Math.sin(a)*.80,Math.cos(b)*.80,1.34,Math.sin(b)*.80],3));geo.computeVertexNormals();const m=(j%2?cream:terracotta).clone();m.side=THREE.DoubleSide;mesh(geo,m,umbrella);
  }
  for(const x of [4.1,5.0]) {box(.44,.13,.85,x,.54,5.1,woodLight);const back=box(.44,.6,.065,x,.83,4.73,cream);back.rotation.x=-.2;}
  // Coastal stone edge, driftwood and scattered beach pebbles.
  for(let i=0;i<26;i++) {
    const a=i/26*Math.PI*2,r=.87+random()*.10,x=Math.cos(a)*8.3*r,z=Math.sin(a)*6.1*r;
    if(z>3.6&&Math.abs(x)<2.3)continue;
    sphere(x,.28,z,.22+random()*.38,.18+random()*.22,.25+random()*.35,i%3?stone:rockLight);
  }

  // Reefs form an irregular ring with a navigable entrance beside the jetty.
  const reefGroups=[[-10,4.4,1.3],[-11,-1.4,1.4],[-8.6,-6.7,1.5],[-2.8,-8.5,1.4],[3.7,-7.9,1.0],[9,-5.2,1.45],[11.1,.5,1.2],[10.4,5.0,.8],[-7.5,8.1,.8]];
  for(const [cx,cz,size] of reefGroups){
    for(let j=0;j<3;j++){const rock=sphere(cx+(random()-.5)*size, -.04+size*.3,cz+(random()-.5)*size,size*(.48+random()*.30),size*(.45+random()*.35),size*(.4+random()*.35),j===0?rockLight:rockDark);rock.rotation.set(random()*.2,random()*3,random()*.2);}
  }
  // Coral gardens are modelled branches and plates beneath the transparent shallows.
  const coralGroup=new THREE.Group();coralGroup.name='Shallow coral gardens';island.add(coralGroup);
  for(const [cx,cz] of [[-9,2.4],[-8,5.3],[-6.4,7.7],[3,7.5],[8.6,3.5],[9,-2.7],[5.8,-6.4],[-6,-7],[-11,-3]]) {
    for(let j=0;j<5;j++){
      const x=cx+(random()-.5)*1.8,z=cz+(random()-.5)*1.4,y=-.87,mat=coralColors[j%5],h=.45+random()*.37;
      if(j%2===0){
        rod([x,y,z],[x,y+h,z],.055,mat,coralGroup,.032);
        for(let k=0;k<3;k++){const a=k*2.1+j;const xx=x+Math.cos(a)*.24,zz=z+Math.sin(a)*.24;rod([x,y+h*.4,z],[xx,y+h*.78,zz],.035,mat,coralGroup,.024);rod([xx,y+h*.78,zz],[xx+.04,y+h+.12,zz],.024,mat,coralGroup,.014);}
      }else{
        for(let k=0;k<3;k++){const disk=mesh(new THREE.CylinderGeometry(.32-k*.05,.20,.06,9),mat,coralGroup);disk.position.set(x+k*.07,y+.12+k*.12,z);disk.rotation.z=.1*k;}
      }
      sphere(x,-1.13,z,.38,.15,.35,stone,coralGroup);
    }
  }
  // A little school of fish reinforces the depth of the shallow water.
  const fishSchool=new THREE.Group();fishSchool.userData.dynamic=true;island.add(fishSchool);
  for(let i=0;i<10;i++){
    const fish=new THREE.Group();fishSchool.add(fish);fish.position.set(6.4+(i%5)*.28,-.47-(i%3)*.06,5.6+Math.floor(i/5)*.3);
    sphere(0,0,0,.12,.04,.05,i%3?teal:roofGold,fish);
    const tail=mesh(new THREE.ConeGeometry(.055,.12,3),teal,fish);tail.rotation.z=Math.PI/2;tail.position.x=-.15;
  }
  return { island, coralGroup, reefGroups, update(time) { fishSchool.position.x=Math.sin(time*.22)*.5;fishSchool.position.z=Math.cos(time*.22)*.35; } };
}
