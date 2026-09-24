import * as THREE from 'three';

// The ship uses X for its length (+X is the bow), Y up, Z across the beam.
// All structures below are real meshes; no reference images are used as billboards.
export function createShip() {
  const ship = new THREE.Group();
  ship.name = 'The Dusktide';
  const sailRig = [];
  const sailGroup = new THREE.Group();
  sailGroup.name = 'Removable sails';
  ship.add(sailGroup);
  const mat = (color, roughness = .72, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const wood = [0x9d5c31, 0xa56234, 0xad6b39, 0xa05f33, 0xb1713e, 0xa76838, 0xb57742].map(c => mat(c));
  const deckWood = [0xc58f50, 0xd09a58, 0xdbaa68, 0xc89656].map(c => mat(c));
  const darkWood = mat(0x613923);
  const rimWood = mat(0xe5ab61);
  const navy = mat(0x203c4d);
  const iron = mat(0x35484c, .38, .68);
  const ironDark = mat(0x152529, .6, .35);
  const brass = mat(0xc69c52, .35, .6);
  const ropeMat = mat(0xc5a976);
  const black = mat(0x070e12);
  const windowMat = new THREE.MeshStandardMaterial({ color: 0xffc15c, emissive: 0xe6a745, emissiveIntensity: .65, roughness: .35 });

  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = 256; grainCanvas.height = 128;
  const g = grainCanvas.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(74,39,12,${.04 + (i % 4) * .016})`;
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x <= 256; x += 8) {
      const y = i * 3.3 + Math.sin(x * .04 + i) * 1.3;
      if (!x) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  const grain = new THREE.CanvasTexture(grainCanvas);
  grain.colorSpace = THREE.SRGBColorSpace;
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  for (const m of [...wood, ...deckWood, darkWood, rimWood]) m.map = grain;

  function mesh(geo, material, parent = ship) {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m); return m;
  }
  function box(w, h, d, x, y, z, material, parent = ship) {
    const m = mesh(new THREE.BoxGeometry(w, h, d), material, parent);
    m.position.set(x, y, z); return m;
  }
  function rod(a, b, radius, material, parent = ship, radiusTop = radius) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const direction = end.clone().sub(start);
    const m = mesh(new THREE.CylinderGeometry(radiusTop, radius, direction.length(), 10), material, parent);
    m.position.copy(start).add(end).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return m;
  }
  function curve(points, radius, material, parent = ship) {
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), Math.max(12, points.length * 4), radius, 6, false), material, parent);
  }
  function ring(radius, thickness, x, y, z, material, rotation = [0, 0, 0], parent = ship) {
    const m = mesh(new THREE.TorusGeometry(radius, thickness, 8, 24), material, parent);
    m.position.set(x, y, z); m.rotation.set(...rotation); return m;
  }
  const profile = [[-3.65,.56],[-3.4,1.02],[-2.85,1.31],[-1.8,1.48],[0,1.52],[1.65,1.34],[2.8,.96],[3.6,.48],[4.05,.045]];
  function widthAt(x) {
    for (let i = 1; i < profile.length; i++) {
      if (x <= profile[i][0]) {
        const [ax, aw] = profile[i - 1], [bx, bw] = profile[i];
        return THREE.MathUtils.lerp(aw, bw, THREE.MathUtils.smoothstep(x, ax, bx));
      }
    }
    return .045;
  }
  const sheer = x => 1.3 + .30 * Math.pow(Math.abs((x - .2) / 4.1), 3);
  function surface(x, v, side) {
    const taper = .23 + .77 * Math.sin(v * Math.PI / 2);
    return [x * (.90 + .10 * v), -1.00 + (sheer(x) + 1.0) * v, side * widthAt(x) * taper];
  }
  // Individually shaded plank strakes form the curved hull.
  for (const side of [-1, 1]) for (let row = 0; row < 9; row++) {
    const positions = [], uvs = [], indices = [];
    for (let i = 0; i <= 64; i++) {
      const x = THREE.MathUtils.lerp(-3.65, 4.05, i / 64);
      for (const v of [row / 9 + .002, (row + 1) / 9 - .002]) {
        positions.push(...surface(x, v, side)); uvs.push(i / 10, v * 9);
      }
      if (i < 64) { const k = i * 2; indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices); geo.computeVertexNormals();
    const material = (row === 7 ? navy : wood[row % wood.length]).clone();
    material.side = THREE.DoubleSide;
    mesh(geo, material);
  }
  const outline = [];
  for (let i = 0; i <= 64; i++) { const x = -3.65 + 7.7 * i / 64; outline.push([x, widthAt(x)]); }
  for (let i = 64; i >= 0; i--) { const x = -3.65 + 7.7 * i / 64; outline.push([x, -widthAt(x)]); }
  function clip(poly, axis, boundary, greater) {
    const output = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const ia = greater ? a[axis] >= boundary : a[axis] <= boundary;
      const ib = greater ? b[axis] >= boundary : b[axis] <= boundary;
      if (ia) output.push(a);
      if (ia !== ib) { const t = (boundary-a[axis])/(b[axis]-a[axis]); output.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]); }
    }
    return output;
  }
  function slab(poly, y, thickness, material) {
    if (poly.length < 3) return;
    const shape = new THREE.Shape(poly.map(([x,z]) => new THREE.Vector2(x,-z)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
    geo.rotateX(-Math.PI/2);
    const m = mesh(geo, material); m.position.y = y - thickness; return m;
  }
  slab(outline, 1.33, .16, darkWood);
  function deck(poly, y) {
    for (let i = 0; i < 14; i++) {
      const lo = -1.55 + i * .225;
      let plank = clip(clip(poly, 1, lo + .009, true), 1, lo + .215, false);
      slab(plank, y, .065, deckWood[i % deckWood.length]);
    }
  }
  deck(outline, 1.4);
  // Close the bow and stern to the same curved cross-section as the hull.
  for (const x of [-3.65, 4.05]) {
    const positions=[], indices=[];
    for(let j=0;j<=18;j++) {
      positions.push(...surface(x,j/18,-1),...surface(x,j/18,1));
      if(j<18){const k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
    const endMaterial=wood[1].clone();endMaterial.side=THREE.DoubleSide;mesh(geo,endMaterial);
  }
  const bottomPositions=[],bottomIndices=[];
  for(let i=0;i<=64;i++) {
    const x=-3.65+7.7*i/64;
    bottomPositions.push(...surface(x,0,-1),...surface(x,0,1));
    if(i<64){const k=i*2;bottomIndices.push(k,k+2,k+1,k+1,k+2,k+3);}
  }
  const bottomGeo=new THREE.BufferGeometry();bottomGeo.setAttribute('position',new THREE.Float32BufferAttribute(bottomPositions,3));bottomGeo.setIndex(bottomIndices);bottomGeo.computeVertexNormals();
  const bottomMaterial=darkWood.clone();bottomMaterial.side=THREE.DoubleSide;mesh(bottomGeo,bottomMaterial);
  box(.22,.20,1.15,-3.57,1.23,0,navy);
  curve([[-3.5,-.7,0],[-2.1,-1.02,0],[1.8,-.93,0],[3.65,-.3,0],[4.05,1.58,0]], .09, darkWood);

  for (const side of [-1,1]) {
    const edgePoints = [], bandPoints = [];
    for (let i = 0; i <= 40; i++) {
      const x = -3.55 + 7.58*i/40;
      edgePoints.push([x,sheer(x)+.065,side*widthAt(x)]);
      bandPoints.push([x*.978, sheer(x)-.52, side*widthAt(x)*.965]);
    }
    curve(edgePoints,.072,rimWood);
    curve(bandPoints,.035,brass);
    // Individual fasteners across the navy hull belt.
    for(let x=-3.15;x<3.65;x+=.42) {
      const fastener = mesh(new THREE.SphereGeometry(.028,6,6),brass);
      fastener.position.set(x*.976,sheer(x)-.41,side*widthAt(x)*.97);
    }
  }

  const quarter = clip(outline,0,-1.97,false);
  box(1.37,.84,1.95,-2.78,1.76,0,navy);
  for(const side of [-1,1]) {
    box(1.48,.10,2.02,-2.78,1.48,0,rimWood);
    for(const x of [-3.25,-2.74,-2.23]) {
      box(.36,.45,.04,x,1.8,side*.994,brass);
      box(.29,.36,.052,x,1.8,side*1.018,windowMat);
      box(.026,.37,.06,x,1.8,side*1.05,darkWood);
      box(.3,.025,.06,x,1.8,side*1.05,darkWood);
    }
  }
  slab(quarter,2.28,.20,wood[2]); deck(quarter,2.32);
  box(.05,.7,.48,-2.075,1.75,0,darkWood);
  for(let i=0;i<5;i++) box(.062,.64,.079,-2.035,1.74,-.175+i*.088,wood[2]);
  mesh(new THREE.SphereGeometry(.035,8,8),brass).position.set(-1.987,1.72,.13);
  // Stairway and handrails up to the quarterdeck.
  for(let i=0;i<5;i++) box(.23,.09,.55,-1.17-i*.2,1.43+i*.19,-.79,deckWood[1]);
  rod([-1.14,1.77,-1.10],[-2.03,2.65,-1.10],.035,rimWood);
  rod([-1.14,1.77,-.48],[-2.03,2.65,-.48],.035,rimWood);
  for(const side of [-1,1]) {
    const pts=[];
    for(let i=0;i<15;i++) {
      const x=-3.48+1.43*i/14, z=side*widthAt(x)*.97;
      pts.push([x,2.84,z]);
      if(i%3===0) rod([x,2.34,z],[x,2.84,z],.045,wood[2]);
    }
    curve(pts,.07,rimWood);
  }
  rod([-3.49,2.84,-.84],[-3.49,2.84,.84],.07,rimWood);
  for(const z of [-.6,-.3,0,.3,.6]) rod([-3.49,2.34,z],[-3.49,2.84,z],.042,wood[2]);
  const forecastle=clip(outline,0,2.75,true);
  slab(forecastle,1.69,.2,wood[3]); deck(forecastle,1.73);

  // Eight cannons with actual open muzzle bores, mounting bands and wheeled carriages.
  const cannons = [];
  for(const side of [-1,1]) for(const x of [-1.55,-.42,.72,1.83]) {
    const z=side*(widthAt(x)-.25), y=1.73;
    const cannon=new THREE.Group(); cannon.name=`${side>0?'Starboard':'Port'} cannon`; ship.add(cannon);
    cannon.userData.side=side;cannon.userData.index=[1.83,.72,-.42,-1.55].indexOf(x);
    box(.5,.18,.61,x,1.49,z,wood[0],cannon);
    for(const dx of [-.25,.25]) for(const dz of [-.21,.21]) {
      const wheel=mesh(new THREE.CylinderGeometry(.115,.115,.085,12),darkWood,cannon);
      wheel.rotation.z=Math.PI/2;wheel.position.set(x+dx,1.48,z+dz);
      const hub=mesh(new THREE.SphereGeometry(.037,8,8),brass,cannon);hub.position.set(x+dx*1.18,1.48,z+dz);
    }
    const barrel=mesh(new THREE.CylinderGeometry(.14,.205,.95,16,1,true),iron,cannon);
    barrel.userData.weaponBarrel=true;
    barrel.rotation.x=side*Math.PI/2;barrel.position.set(x,y,z+side*.22);
    ring(.145,.047,x,y,z+side*.69,iron,[0,0,0],cannon);
    ring(.188,.025,x,y,z-side*.04,brass,[0,0,0],cannon);
    const bore=mesh(new THREE.CircleGeometry(.113,16),black,cannon);bore.position.set(x,y,z+side*.59);bore.rotation.y=side<0?Math.PI:0;
    const back=mesh(new THREE.SphereGeometry(.18,12,10),iron,cannon);back.position.set(x,y,z-side*.28);
    // Wooden gunport surround, leaving the firing aperture open.
    for(const dx of [-.28,.28]) box(.065,.49,.13,x+dx,1.6,side*widthAt(x),wood[1]);
    const lid=box(.56,.055,.44,x,1.94,side*(widthAt(x)+.14),navy);lid.rotation.x=side*-.28;
    cannons.push(cannon);
  }
  // Raised bulwark posts and continuous cap rails above the gun deck.
  for(const side of [-1,1]) {
    const points=[];
    for(let i=0;i<=28;i++) {
      const x=-1.98+5.93*i/28;
      const y=2.09+Math.max(0,x-2.7)*.13;
      points.push([x,y,side*widthAt(x)]);
    }
    curve(points,.06,rimWood);
    for(const x of [-1.98,-.99,.15,1.29,2.4,2.9,3.42,3.85]) {
      const y=2.09+Math.max(0,x-2.7)*.13, z=side*widthAt(x);
      rod([x,sheer(x),z],[x,y,z],.048,wood[2]);
      ring(.069,.018,x,y-.11,z,brass,[Math.PI/2,0,0]);
    }
  }

  // Deck hatch with a wooden frame and inset grating.
  box(.8,.055,.65,.18,1.445,0,darkWood);
  for(const z of [-.34,.34]) box(.86,.075,.07,.18,1.47,z,rimWood);
  for(const x of [-.25,.61]) box(.07,.075,.73,x,1.47,0,rimWood);
  for(let i=0;i<6;i++) box(.035,.032,.6,-.16+i*.13,1.48,0,iron);
  for(let i=0;i<5;i++) box(.72,.034,.027,.18,1.485,-.25+i*.125,iron);
  // Helm on the aft upper deck.
  box(.17,.55,.19,-2.52,2.59,0,wood[0]);
  const helm=new THREE.Group();ship.add(helm);helm.position.set(-2.38,2.99,0);helm.rotation.y=Math.PI/2;
  ring(.29,.038,0,0,0,rimWood,[0,0,0],helm);
  for(let i=0;i<8;i++) {const a=i*Math.PI/4;rod([0,0,0],[Math.cos(a)*.4,Math.sin(a)*.4,0],.025,wood[2],helm);}
  const hub=mesh(new THREE.CylinderGeometry(.083,.083,.12,12),brass,helm);hub.rotation.x=Math.PI/2;

  function barrel(x,y,z,scale=1) {
    const b=new THREE.Group();ship.add(b);b.position.set(x,y,z);b.scale.setScalar(scale);
    const pts=[new THREE.Vector2(.18,0),new THREE.Vector2(.23,.12),new THREE.Vector2(.25,.3),new THREE.Vector2(.23,.48),new THREE.Vector2(.18,.57)];
    mesh(new THREE.LatheGeometry(pts,12),wood[2],b);
    const cap=mesh(new THREE.CylinderGeometry(.18,.18,.025,12),darkWood,b);cap.position.y=.57;
    for(const yy of [.1,.45]) ring(.224,.027,0,yy,0,iron,[Math.PI/2,0,0],b);
  }
  barrel(-1.73,1.41,.66,.8);barrel(2.63,1.41,-.40,.7);
  box(.48,.37,.43,-2.96,2.52,-.62,wood[1]);
  for(const x of [-3.14,-2.79]) box(.055,.4,.46,x,2.52,-.62,brass);

  // Lanterns with framed amber panes.
  for(const side of [-1,1]) {
    const x=-3.24,z=side*1.18,y=2.37;
    rod([x,2.53,z-side*.2],[x,2.79,z],.035,iron);
    box(.22,.3,.22,x,y,z,windowMat);
    box(.29,.06,.29,x,y-.18,z,iron);
    const roof=mesh(new THREE.ConeGeometry(.23,.16,4),iron);roof.position.set(x,y+.23,z);roof.rotation.y=Math.PI/4;
    for(const dx of [-.115,.115])for(const dz of [-.115,.115]) rod([x+dx,y-.15,z+dz],[x+dx,y+.15,z+dz],.016,brass);
  }

  function sailTexture(emblem) {
    const c=document.createElement('canvas');c.width=512;c.height=512;
    const ctx=c.getContext('2d');
    const gradient=ctx.createLinearGradient(0,0,512,512);gradient.addColorStop(0,'#294d68');gradient.addColorStop(.45,'#233e5e');gradient.addColorStop(1,'#162f4d');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,512,512);
    ctx.strokeStyle='rgba(159,185,193,.16)';ctx.lineWidth=2;
    for(let x=64;x<512;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke();}
    ctx.strokeStyle='#bca47a';ctx.lineWidth=7;ctx.strokeRect(9,9,494,494);
    ctx.strokeStyle='rgba(207,194,156,.45)';ctx.lineWidth=2;ctx.setLineDash([3,6]);ctx.strokeRect(20,20,472,472);ctx.setLineDash([]);
    if(emblem) {
      ctx.save();ctx.translate(256,262);ctx.fillStyle='#e8dfc2';ctx.strokeStyle='#e8dfc2';ctx.lineCap='round';ctx.lineWidth=14;
      for(const s of [-1,1]) {
        ctx.beginPath();ctx.moveTo(-89,44*s+48);ctx.lineTo(89,-44*s+48);ctx.stroke();
        for(const x of [-1,1]) {ctx.beginPath();ctx.arc(x*89,-x*44*s+48,12,0,Math.PI*2);ctx.fill();}
      }
      ctx.beginPath();ctx.ellipse(0,-37,58,58,0,0,Math.PI*2);ctx.fill();
      ctx.fillRect(-33,0,66,32);
      ctx.fillStyle='#243d57';
      for(const s of [-1,1]) {ctx.beginPath();ctx.ellipse(s*23,-35,16,20,s*.28,0,Math.PI*2);ctx.fill();}
      ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(-9,1);ctx.lineTo(9,1);ctx.closePath();ctx.fill();
      for(const x of [-17,0,17])ctx.fillRect(x-2,15,4,17);
      ctx.restore();
    }
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    return texture;
  }
  const canvasPlain=sailTexture(false),canvasSkull=sailTexture(true);
  function squareSail(x,top,height,width,emblem) {
    const pos=[],uv=[],idx=[];const n=24;
    for(let j=0;j<=n;j++)for(let i=0;i<=n;i++) {
      const u=i/n,v=j/n;
      const z=(u-.5)*width*(1-.18*v);
      const xx=x+.14+.62*Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
      const yy=top-v*height+.14*Math.sin(Math.PI*u)*v*v;
      pos.push(xx,yy,z);uv.push(u,1-v);
      if(i<n&&j<n){const k=j*(n+1)+i;idx.push(k,k+1,k+n+1,k+1,k+n+2,k+n+1);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
    const material=new THREE.MeshStandardMaterial({map:emblem?canvasSkull:canvasPlain,side:THREE.DoubleSide,roughness:.94});
    const cloth=mesh(geo,material,sailGroup);
    const rig={x,top,height,width,cloth,edges:[],sheets:[]};sailRig.push(rig);
    rod([x,top+.04,-width*.55],[x,top+.04,width*.55],.066,wood[2]);
    for(const side of [-1,1]) {
      rig.edges.push(curve([[x+.14,top,side*width*.5],[x+.14,top-height*.5,side*width*.455],[x+.14,top-height,side*width*.41]],.017,ropeMat,sailGroup));
      rig.sheets.push({side,mesh:rod([x+.14,top-height,side*width*.41],[x+.5,1.65,side*1.24],.016,ropeMat,sailGroup)});
    }
  }
  for(const [x,top] of [[-1.06,7.30],[1.56,6.43]]) {
    rod([x,1.36,0],[x,top,0],.125,wood[2],ship,.063);
    for(const yy of [1.53,3.1,4.3,5.45]) if(yy<top)ring(.126-(yy-1.53)*.009,.025,x,yy,0,brass,[Math.PI/2,0,0]);
    for(const side of [-1,1]) {
      rod([x,top-.18,0],[x-1,1.64,side*1.3],.022,ropeMat);
      rod([x,top-.18,0],[x+1,1.68,side*1.2],.019,ropeMat);
      // Climbable shroud silhouette, with evenly spaced ratlines.
      for(let k=1;k<=10;k++) {
        const t=k/12, yy=1.64+(top-.45-1.64)*t;
        rod([x-.78*(1-t),yy,side*1.3*(1-t)],[x+.68*(1-t),yy,side*1.3*(1-t)],.010,ropeMat);
      }
    }
    const nest=mesh(new THREE.CylinderGeometry(.31,.22,.17,12),darkWood);nest.position.set(x,top-1.16,0);
    ring(.3,.03,x,top-1.05,0,brass,[Math.PI/2,0,0]);
  }
  squareSail(-1.06,5.70,2.26,3.65,true);
  squareSail(-1.06,6.90,1.0,2.52,false);
  squareSail(1.56,5.35,2.00,2.83,false);
  squareSail(1.56,6.05,.57,1.78,false);

  // Long bowsprit and a shaped triangular jib.
  rod([2.94,1.72,0],[5.19,2.53,0],.09,wood[2],ship,.035);
  rod([5.19,2.53,0],[1.56,6.37,0],.022,ropeMat);
  rod([5.19,2.53,0],[3.58,.5,0],.025,ropeMat);
  const jibGeo=new THREE.BufferGeometry();
  jibGeo.setAttribute('position',new THREE.Float32BufferAttribute([1.82,5.25,.04,4.88,2.57,.04,2.31,2.48,.04,2.85,3.42,.36],3));
  jibGeo.setAttribute('uv',new THREE.Float32BufferAttribute([0,1,1,0,0,0,.4,.4],2));
  jibGeo.setIndex([0,1,3,1,2,3,2,0,3]);jibGeo.computeVertexNormals();
  const jib=mesh(jibGeo,new THREE.MeshStandardMaterial({map:canvasPlain,side:THREE.DoubleSide,roughness:.95}),sailGroup);
  const jibEdge=curve([[1.82,5.25,.04],[4.88,2.57,.04],[2.31,2.48,.04],[1.82,5.25,.04]],.018,ropeMat,sailGroup);
  // Swallowtail pennant at the main mast.
  const flagGeo=new THREE.BufferGeometry();
  flagGeo.setAttribute('position',new THREE.Float32BufferAttribute([-1.06,7.29,0,-1.96,7.40,.10,-1.70,7.17,.12,-1.99,6.98,.09,-1.06,7.00,0],3));
  flagGeo.setIndex([0,1,2,0,2,4,2,3,4]);flagGeo.computeVertexNormals();
  mesh(flagGeo,new THREE.MeshStandardMaterial({color:0x1a354a,side:THREE.DoubleSide}),sailGroup);
  mesh(new THREE.SphereGeometry(.097,12,8),brass).position.set(-1.06,7.40,0);

  // Anchor hanging beside the forecastle.
  const anchor=new THREE.Group();ship.add(anchor);anchor.position.set(2.7,.76,1.0);anchor.rotation.x=-.20;
  ring(.10,.03,0,.48,0,iron,[0,0,0],anchor);
  rod([0,.42,0],[0,-.37,0],.042,iron,anchor);
  rod([-.26,.23,0],[.26,.23,0],.047,iron,anchor);
  curve([[-.32,-.12,0],[-.25,-.38,0],[0,-.46,0],[.25,-.38,0],[.32,-.12,0]],.049,iron,anchor);
  rod([2.7,1.85,1.08],[2.7,1.22,1.0],.024,iron);
  return { ship, sailGroup, cannons, sailRig, jib, jibEdge };
}
