import * as T from 'three';

// Local +Z faces the main harbor. The bottom of the irregular footprint is y=0.
// At the authored placement (0, 10, -34) with scale 1.12 it rests on the
// 32 x 23 m castle shelf, with its entrance aligned to the quay steps.
function stoneTexture() {
  // Small deterministic masonry variation gives the broad walls a sense of
  // individual courses without multiplying the castle's mesh count.
  const size = 96;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / 12);
    const stagger = row % 2 ? 9 : 0;
    for (let x = 0; x < size; x++) {
      const grain = ((x * 47 + y * 31 + (x * y) % 37) * 17) % 21;
      const mortar = y % 12 < 1 || (x + stagger) % 24 < 1;
      const stain = ((x * 13 + y * 7) % 53) < 4 ? 15 : 0;
      const value = Math.max(170, Math.min(255, 232 + grain - 11 - stain - (mortar ? 45 : 0)));
      const i = (y * size + x) * 4;
      data[i] = value;
      data[i + 1] = Math.max(0, value - 2);
      data[i + 2] = Math.max(0, value - 6);
      data[i + 3] = 255;
    }
  }
  const texture = new T.DataTexture(data, size, size, T.RGBAFormat);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.magFilter = T.LinearFilter;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = T.SRGBColorSpace;
  texture.repeat.set(2, 2);
  texture.needsUpdate = true;
  return texture;
}
const stone = new T.MeshStandardMaterial({color: 0xc9c6b8, roughness: 1, flatShading: true, map: stoneTexture()});
const pale = new T.MeshStandardMaterial({color: 0xe5decb, roughness: 1, flatShading: true});
const weathered = new T.MeshStandardMaterial({color: 0xa4aca9, roughness: 1, flatShading: true});
const shadow = new T.MeshStandardMaterial({color: 0x3d5058, roughness: 1, flatShading: true});
const roofTile = new T.MeshStandardMaterial({color: 0xa85d42, roughness: 1, flatShading: true, side: T.DoubleSide});
const roofShade = new T.MeshStandardMaterial({color: 0x794d3f, roughness: 1, flatShading: true});
const wood = new T.MeshStandardMaterial({color: 0x695646, roughness: 1, flatShading: true});
const navy = new T.MeshStandardMaterial({color: 0x335768, roughness: 1, flatShading: true, side: T.DoubleSide});
const brass = new T.MeshStandardMaterial({color: 0xb5a06d, roughness: .8, metalness: .2});

function put(root, geometry, material, x, y, z, name) {
  const part = new T.Mesh(geometry, material);
  part.name = name;
  part.position.set(x, y, z);
  part.castShadow = part.receiveShadow = true;
  root.add(part);
  return part;
}
function box(root, name, x, bottom, z, width, height, depth, material = stone) {
  return put(root, new T.BoxGeometry(width, height, depth), material, x, bottom + height / 2, z, name);
}
function round(root, name, x, bottom, z, bottomRadius, topRadius, height, sides, material = stone) {
  return put(root, new T.CylinderGeometry(topRadius, bottomRadius, height, sides), material, x, bottom + height / 2, z, name);
}
function ring(root, name, outline, bottom, top, inset, material) {
  const midX = outline.reduce((v, p) => v + p[0], 0) / outline.length;
  const midZ = outline.reduce((v, p) => v + p[1], 0) / outline.length;
  const positions = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    const ta = [midX + (a[0] - midX) * inset, midZ + (a[1] - midZ) * inset];
    const tb = [midX + (b[0] - midX) * inset, midZ + (b[1] - midZ) * inset];
    positions.push(a[0], bottom, a[1], b[0], bottom, b[1], ta[0], top, ta[1],
      b[0], bottom, b[1], tb[0], top, tb[1], ta[0], top, ta[1]);
  }
  const sides = new T.BufferGeometry();
  sides.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  sides.computeVertexNormals();
  const sideMaterial = material.clone();
  sideMaterial.side = T.DoubleSide;
  put(root, sides, sideMaterial, 0, 0, 0, name + ' battered faces');
  const shape = new T.Shape();
  outline.forEach(([x, z], i) => {
    const px = midX + (x - midX) * inset;
    const pz = midZ + (z - midZ) * inset;
    if (i === 0) shape.moveTo(px, -pz); else shape.lineTo(px, -pz);
  });
  shape.closePath();
  const cap = put(root, new T.ShapeGeometry(shape), material, 0, top, 0, name + ' paving');
  cap.rotation.x = -Math.PI / 2;
}
function merlons(root, x1, x2, y, z, inward = 0) {
  box(root, 'parapet coping', (x1 + x2) / 2, y, z, x2 - x1, .28, .88, pale);
  for (let x = x1 + .65; x < x2 - .45; x += 2.08)
    box(root, 'individual crenel', x, y + .26, z + inward, .68, .82, .78, pale);
}
function sideMerlons(root, x, z1, z2, y) {
  box(root, 'side parapet coping', x, y, (z1 + z2) / 2, .88, .28, z2 - z1, pale);
  for (let z = z1 + .65; z < z2 - .45; z += 2.45)
    box(root, 'side crenel', x, y + .26, z, .78, .82, .68, pale);
}
function taperingCurtain(root, side) {
  // The harbor-facing ward is broad while the rear wall pulls back toward the
  // high keep, leaving the neighboring cliffside houses room to step uphill.
  const rear = [side * 13.2, -8.76], front = [side * 18.2, 7.7];
  const dx = front[0] - rear[0], dz = front[1] - rear[1];
  const length = Math.hypot(dx, dz), angle = Math.atan2(dx, dz);
  const centerX = (rear[0] + front[0]) / 2, centerZ = (rear[1] + front[1]) / 2;
  const body = box(root, 'tapering outer side curtain', centerX, 1.08, centerZ, 1.7, 6.2, length, stone);
  body.rotation.y = angle;
  const coping = box(root, 'tapering curtain parapet coping', centerX, 7.31, centerZ, .88, .28, length, pale);
  coping.rotation.y = angle;
  for (let distance = .85; distance < length - .45; distance += 1.9) {
    const t = distance / length;
    const crenel = box(root, 'tapering side crenel', rear[0] + dx * t, 7.57,
      rear[1] + dz * t, .78, .82, .68, pale);
    crenel.rotation.y = angle;
  }
  for (const t of [.2, .5, .8]) {
    const buttress = box(root, 'side curtain stone buttress', rear[0] + dx * t + side * .68, 1.08,
      rear[1] + dz * t, .76, 5.9, 1.04, weathered);
    buttress.rotation.y = angle;
  }
}
function window(root, x, y, z, width = .74, height = 1.45) {
  box(root, 'window recess', x, y, z, width, height, .08, shadow);
  box(root, 'window left jamb', x - width / 2 - .12, y - .12, z + .09, .16, height + .25, .16, pale);
  box(root, 'window right jamb', x + width / 2 + .12, y - .12, z + .09, .16, height + .25, .16, pale);
  box(root, 'window lintel', x, y + height + .02, z + .09, width + .48, .19, .2, pale);
  box(root, 'window sill', x, y - .18, z + .12, width + .5, .15, .28, pale);
  box(root, 'stone mullion', x, y, z + .15, .09, height, .08, pale);
}
function archedRecess(root, name, x, bottom, z, width, height) {
  const radius = width / 2;
  const spring = height - radius;
  const opening = new T.Shape();
  opening.moveTo(-radius, 0);
  opening.lineTo(radius, 0);
  opening.lineTo(radius, spring);
  opening.absarc(0, spring, radius, 0, Math.PI, false);
  opening.closePath();
  put(root, new T.ShapeGeometry(opening, 8), shadow, x, bottom, z, name + ' deep shadow');
  for (const side of [-1, 1])
    box(root, name + ' stone jamb', x + side * (radius + .09), bottom, z + .055, .18, spring, .15, pale);
  const positions = [];
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 8, b = (i + 1) * Math.PI / 8;
    const innerA = [Math.cos(a) * radius, spring + Math.sin(a) * radius, 0];
    const outerA = [Math.cos(a) * (radius + .17), spring + Math.sin(a) * (radius + .17), 0];
    const innerB = [Math.cos(b) * radius, spring + Math.sin(b) * radius, 0];
    const outerB = [Math.cos(b) * (radius + .17), spring + Math.sin(b) * (radius + .17), 0];
    positions.push(...innerA, ...outerA, ...outerB, ...innerA, ...outerB, ...innerB);
  }
  const arch = new T.BufferGeometry();
  arch.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  arch.computeVertexNormals();
  put(root, arch, pale, x, bottom, z + .095, name + ' radiating stone arch');
  box(root, name + ' sill', x, bottom - .17, z + .1, width + .62, .22, .3, weathered);
}
function slit(root, x, y, z) {
  box(root, 'arrow slit shadow', x, y, z, .17, 1.17, .07, shadow);
  box(root, 'arrow slit cap', x, y + 1.18, z + .04, .42, .12, .13, pale);
}
function pitchedRoof(root, name, x, y, z, width, depth, rise) {
  const w = width / 2, d = depth / 2;
  const a = [-w, 0, -d], b = [w, 0, -d], c = [w, 0, d], e = [-w, 0, d];
  const r = [0, rise, -d], s = [0, rise, d];
  const triangles = [a, r, s, a, s, e, b, c, s, b, s, r, e, s, c, a, b, r];
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(triangles.flat(), 3));
  geo.computeVertexNormals();
  put(root, geo, roofTile, x, y, z, name);
  box(root, name + ' dark eaves', x, y - .14, z, width + .28, .2, depth + .25, roofShade);
  box(root, name + ' stone ridge', x, y + rise - .04, z, .26, .19, depth + .25, pale);
}
function pyramidRoof(root, name, x, y, z, width, rise, sides = 4) {
  const radius = sides === 4 ? width / Math.SQRT2 : width / 2;
  const roof = put(root, new T.ConeGeometry(radius, rise, sides), roofTile, x, y + rise / 2, z, name);
  if (sides === 4) roof.rotation.y = Math.PI / 4;
  round(root, name + ' finial', x, y + rise, z, .13, .07, .55, 6, brass);
  put(root, new T.SphereGeometry(.22, 6, 4), brass, x, y + rise + .6, z, name + ' gilded tip');
}
function tower(root, name, x, z, base, height, radius, sides, roofStyle) {
  round(root, name + ' battered footing', x, base, z, radius + .42, radius + .14, 1.6, sides, weathered);
  round(root, name + ' massive shaft', x, base + 1.15, z, radius + .1, radius - .12, height - 1.15, sides, stone);
  round(root, name + ' lower moulding', x, base + 1.45, z, radius + .27, radius + .27, .28, sides, pale);
  round(root, name + ' upper moulding', x, base + height - 1.4, z, radius + .19, radius + .19, .29, sides, pale);
  for (const level of [base + height * .42, base + height * .69])
    slit(root, x, level, z + radius - .02);
  round(root, name + ' battlement deck', x, base + height, z, radius + .42, radius + .42, .32, sides, pale);
  if (roofStyle === 'roof') {
    round(root, name + ' roof drum', x, base + height + .27, z, radius - .23, radius - .23, .9, sides, stone);
    pyramidRoof(root, name + ' copper red roof', x, base + height + 1.02, z, (radius + .32) * 2, 2.8, sides);
  } else {
    const count = sides === 4 ? 12 : sides;
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      const crenel = box(root, name + ' battlement tooth', x + Math.sin(angle) * (radius + .08), base + height + .28,
        z + Math.cos(angle) * (radius + .08), .8, .86, .66, pale);
      crenel.rotation.y = angle;
    }
  }
}
function portal(root) {
  // A real open arch; the steps and inner court remain visible through it.
  const r = 2.55, thickness = .65, spring = 3.13;
  const arch = new T.Shape();
  arch.moveTo(-r - thickness, 0);
  arch.lineTo(-r - thickness, spring);
  arch.absarc(0, spring, r + thickness, Math.PI, 0, true);
  arch.lineTo(r + thickness, 0);
  arch.lineTo(r, 0);
  arch.lineTo(r, spring);
  arch.absarc(0, spring, r, 0, Math.PI, false);
  arch.closePath();
  put(root, new T.ExtrudeGeometry(arch, {depth: 1.85, bevelEnabled: false, curveSegments: 9}), pale,
    0, 1.05, 7.85, 'open vaulted main castle gate');
  for (let i = 0; i <= 12; i++) {
    const angle = Math.PI * i / 12;
    const key = box(root, 'arch voussoir', Math.cos(angle) * 2.93, 1.05 + spring + Math.sin(angle) * 2.93,
      9.77, .5, .43, .1, weathered);
    key.rotation.z = angle - Math.PI / 2;
  }
  for (const x of [-2.92, 2.92]) box(root, 'gate jamb masonry', x, 1.05, 9.79, .58, 3.25, .2, weathered);
  for (const x of [-2.25, 2.25]) box(root, 'opened oak door leaf', x, 1.2, 7.55, .52, 3.1, .19, wood);
}
function courtyardStairs(root) {
  for (let i = 0; i < 9; i++) {
    const depth = (i + 1) * .36;
    box(root, 'stairs to inner ward', 0, 1.16, 2.45 - i * .36, 4.4, (i + 1) * .4, depth, i % 2 ? pale : stone);
  }
  for (const x of [-2.55, 2.55]) box(root, 'inner stair balustrade', x, 1.16, .88, .55, 3.8, 4.65, weathered);
}
function hall(root) {
  // The broad hall reads as a separate mass beside the taller keep.
  box(root, 'great hall stone walls', 3.8, 5.22, -4.33, 8.8, 12.1, 7.4, stone);
  box(root, 'great hall battered plinth', 3.8, 4.74, -4.33, 9.45, .57, 8.05, weathered);
  for (const y of [8.15, 15.48]) box(root, 'hall continuous stringcourse', 3.8, y, -4.33, 9.2, .26, 7.84, pale);
  for (const x of [.9, 3.8, 6.7]) {
    window(root, x, 10.65, -.56, .72, 1.52);
    window(root, x, 14.0, -.56, .72, 1.5);
  }
  for (const x of [-.35, 7.95]) {
    box(root, 'hall facade buttress', x, 5.13, -.51, .66, 10.9, .71, weathered);
    box(root, 'hall buttress cap', x, 15.82, -.52, 1.05, .42, 1.0, pale);
  }
  pitchedRoof(root, 'great hall broad terracotta gable', 3.8, 17.36, -4.33, 9.65, 8.05, 3.18);
  round(root, 'hall roof chimney', 6.5, 17.8, -6.25, .55, .48, 3.2, 6, pale);
  round(root, 'chimney cap', 6.5, 20.85, -6.25, .68, .68, .22, 6, weathered);
}
function highKeep(root) {
  box(root, 'highest keep lower core', -4.68, 5.22, -5.56, 5.95, 12.25, 5.8, stone);
  box(root, 'highest keep base plinth', -4.68, 4.72, -5.56, 6.58, .55, 6.38, weathered);
  box(root, 'highest keep upper narrowing', -4.68, 17.47, -5.56, 5.0, 9.42, 5.0, stone);
  for (const y of [8.4, 17.24, 23.96]) box(root, 'keep projecting stone band', -4.68, y, -5.56,
    y > 18 ? 5.5 : 6.35, .34, y > 18 ? 5.5 : 6.2, pale);
  for (const y of [10.2, 14.0, 20.1, 24.4]) window(root, -4.68, y, y > 18 ? -3.0 : -2.6, .6, 1.28);
  for (const x of [-7.05, -2.31]) box(root, 'keep raised corner pier', x, 18.05, -3.06, .57, 8.52, .57, weathered);
  for (const x of [-7.05, -2.31])
    box(root, 'keep lower front pier', x, 5.22, -2.6, .62, 11.9, .54, weathered);
  for (const x of [-6.55, -5.3, -4.05, -2.8])
    box(root, 'keep weight-bearing cornice corbel', x, 25.9, -2.79, .5, .67, .53, weathered);
  box(root, 'keep roof cornice', -4.68, 26.75, -5.56, 5.65, .38, 5.65, pale);
  pyramidRoof(root, 'highest tower steep red roof', -4.68, 27.16, -5.56, 6.15, 3.45);
}
function banners(root) {
  for (const x of [-8.1, 8.1]) {
    box(root, 'banner crossbar', x, 8.55, 9.58, 1.35, .07, .12, wood);
    const shape = new T.Shape();
    shape.moveTo(-.53, 0); shape.lineTo(.53, 0); shape.lineTo(.53, -2.13);
    shape.lineTo(0, -1.72); shape.lineTo(-.53, -2.13); shape.closePath();
    put(root, new T.ShapeGeometry(shape), navy, x, 8.5, 9.7, 'blue heraldic banner');
    put(root, new T.CylinderGeometry(.11, .1, .08, 6), brass, x, 7.45, 9.72, 'banner anchor');
  }
}
function flankingWing(root, side) {
  const x = side * 11.2;
  box(root, 'flanking barracks stone annex', x, 4.96, -5.24, 4.3, 6.45, 5.15, stone);
  box(root, 'annex battered footing', x, 4.68, -5.24, 4.72, .38, 5.55, weathered);
  box(root, 'annex front stone course', x, 9.56, -2.62, 4.45, .28, .3, pale);
  slit(root, x, 8.14, -2.62);
  pitchedRoof(root, 'flanking annex terracotta gable', x, 11.43, -5.24, 4.7, 5.55, 2.15);
}
function flankSentry(root, side) {
  const x = side * 16.05, z = -.65;
  round(root, 'middle curtain sentry footing', x, 1.08, z, 1.92, 1.7, 1.1, 8, weathered);
  round(root, 'middle curtain sentry shaft', x, 2.02, z, 1.7, 1.47, 8.55, 8, stone);
  round(root, 'middle curtain sentry cornice', x, 10.58, z, 1.76, 1.76, .28, 8, pale);
  if (side > 0)
    put(root, new T.ConeGeometry(1.85, 2.15, 8), roofTile, x, 11.88, z, 'east middle sentry pointed roof');
  else
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const crenel = box(root, 'west middle sentry heavy battlement',
        x + Math.sin(angle) * 1.35, 10.91, z + Math.cos(angle) * 1.35,
        .95, .78, .72, pale);
      crenel.rotation.y = angle;
    }
}

export function createFjordCitadel() {
  const root = new T.Group();
  root.name = '蒼壁峽灣 · 分層主堡與內院';
  const footprint = [
    [-13.65, -8.95], [-10.8, -10.18], [-5.0, -10.38], [1.8, -10.13],
    [9.7, -10.28], [13.7, -8.55], [16.8, -4.8], [19.55, 5.1],
    [17.85, 9.5], [6.1, 9.82], [-6.15, 9.82], [-17.85, 9.45],
    [-19.55, 5.35], [-16.8, -4.65]
  ];
  ring(root, 'irregular lower bailey platform', footprint, 0, 1.08, .982, weathered);
  box(root, 'lower courtyard paving', 0, 1.07, 3.35, 20.6, .15, 10.2, stone);

  // The outer curtain is split at the main gate and rises directly from its footing.
  for (const side of [-1, 1]) {
    box(root, 'front outer curtain', side * 9.95, 1.08, 8.82, 13.5, 6.26, 1.9, stone);
    for (const x of [side * 6.35, side * 12.25])
      archedRecess(root, 'outer curtain blind arcade', x, 2.12, 9.79, 1.48, 2.95);
    merlons(root, side < 0 ? -16.72 : 3.18, side < 0 ? -3.18 : 16.72, 7.38, 8.83);
    taperingCurtain(root, side);
  }
  box(root, 'rear curtain', 0, 1.08, -9.12, 25.6, 6.42, 1.8, stone);
  merlons(root, -11.9, 11.9, 7.5, -9.12);
  portal(root);
  box(root, 'gatehouse above open passage', 0, 7.56, 8.61, 7.35, 4.35, 3.1, stone);
  for (const x of [-2.2, 0, 2.2]) slit(root, x, 9.0, 10.2);
  pitchedRoof(root, 'gatehouse gable', 0, 11.94, 8.61, 7.95, 3.65, 2.04);
  banners(root);

  tower(root, 'west forward watchtower', -16.55, 7.3, 1.08, 13.8, 2.42, 10, 'battlements');
  tower(root, 'east forward watchtower', 16.58, 7.35, 1.08, 11.1, 2.25, 8, 'roof');
  tower(root, 'west rear round tower', -11.5, -7.16, 1.08, 17.25, 2.4, 10, 'battlements');
  tower(root, 'east rear roof tower', 11.5, -7.2, 1.08, 20.1, 2.38, 8, 'roof');
  flankSentry(root, -1);
  flankSentry(root, 1);

  // The raised inner ward, visible over the outer curtain, carries the main buildings.
  box(root, 'inner ward battered base', 0, 1.08, -4.22, 27.0, 3.62, 9.34, weathered);
  box(root, 'inner ward pale paved lip', 0, 4.68, -4.22, 27.35, .28, 9.68, pale);
  for (const x of [-13.15, 13.15]) box(root, 'inner ward side wall', x, 4.93, -4.55, .96, 4.72, 8.2, stone);
  for (const x of [-13.15, 13.15]) sideMerlons(root, x, -8.6, -.45, 9.66);
  for (const x of [-11.1, 11.1])
    archedRecess(root, 'raised inner ward arcade', x, 1.72, .49, 1.55, 2.25);
  courtyardStairs(root);
  hall(root);
  highKeep(root);
  flankingWing(root, -1);
  flankingWing(root, 1);
  box(root, 'west chapel lower wall', -8.3, 4.96, -1.16, 3.0, 5.1, 3.25, stone);
  pitchedRoof(root, 'west chapel red tiled roof', -8.3, 10.07, -1.16, 3.45, 3.72, 1.7);
  slit(root, -8.3, 7.15, .5);

  root.userData = {
    footprint: {width: 39.1, depth: 20.2},
    forward: '+Z',
    baseY: 0,
    highestRoofY: 31.43,
    parts: ['open gate', 'lower courtyard', 'raised inner ward', 'great hall', 'highest keep', 'four unequal curtain towers', 'two middle sentries', 'two flanking barracks']
  };
  return root;
}
