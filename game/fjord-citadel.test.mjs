import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createFjordCitadel} from './fjord-citadel.js';
import {fjordSurfaceHeight} from './fjord-layout.js';

test('fjord citadel spreads over its widened shelf and has a layered silhouette', () => {
  const citadel = createFjordCitadel();
  const bounds = new T.Box3().setFromObject(citadel, true);
  const names = [];
  let triangles = 0;
  citadel.traverse(part => {
    if (!part.isMesh) return;
    names.push(part.name);
    triangles += (part.geometry.index?.count ?? part.geometry.attributes.position.count) / 3;
  });
  assert.equal(bounds.min.y, 0);
  // The harbor-facing ward spreads to ±19.55 world units, while the rear
  // narrows toward the keep to leave room for the uphill settlement.
  assert.ok(Math.max(-bounds.min.x, bounds.max.x) > 19);
  assert.ok(Math.max(-bounds.min.x, bounds.max.x) < 20.1);
  assert.ok(Math.max(-bounds.min.z, bounds.max.z) < 11.9);
  assert.ok(bounds.max.y > 30);
  assert.ok(triangles <= 5000, `citadel has ${triangles} triangles`);
  for (const part of ['highest keep', 'great hall', 'inner ward', 'courtyard', 'castle gate',
    'west forward watchtower', 'east forward watchtower', 'west rear round tower',
    'east rear roof tower', 'tapering outer side curtain', 'flanking barracks'])
    assert.ok(names.some(name => name.includes(part)), `missing ${part}`);
});

test('broad citadel footprint and four curtain towers rest on the 10-unit rock shelf', () => {
  const citadel = createFjordCitadel();
  const paving = citadel.children.find(part => part.name === 'irregular lower bailey platform paving');
  assert.ok(paving);
  const positions = paving.geometry.attributes.position;
  // ShapeGeometry is local XY, later rotated onto the XZ castle shelf.
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = -positions.getY(i) - 34;
    assert.ok(fjordSurfaceHeight(x, z) >= 10, `outer footing unsupported at ${x}, ${z}`);
  }
  for (const [x, z] of [[-16.55, 7.3], [16.58, 7.35], [-11.5, -7.16], [11.5, -7.2]])
    assert.ok(fjordSurfaceHeight(x, z - 34) >= 10, `tower unsupported at ${x}, ${z}`);
  for (const side of [-1, 1]) {
    for (const t of [0, .2, .5, .8, 1]) {
      const x = side * (13.2 + 5 * t);
      const z = -8.76 + 16.46 * t;
      assert.ok(fjordSurfaceHeight(x, z - 34) >= 10, `wing curtain unsupported at ${x}, ${z}`);
    }
  }
});

test('front gate is a clear open passage at walking height', () => {
  const citadel = createFjordCitadel();
  citadel.updateMatrixWorld(true);
  for (const y of [2, 3.5, 5.5]) {
    const ray = new T.Raycaster(new T.Vector3(0, y, 13), new T.Vector3(0, 0, -1), 0, 6);
    assert.equal(ray.intersectObject(citadel, true).length, 0, `gate obstructed at y=${y}`);
  }
});
