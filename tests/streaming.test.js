import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ChunkStreamer } from '../src/world/ChunkStreamer.js';
import { Heightmap } from '../src/world/terrain/Heightmap.js';
import { InstancedPlacer } from '../src/world/nature/InstancedPlacer.js';
import { Colliders } from '../src/world/Colliders.js';
import { pathRows } from '../src/world/zones/Paths.js';

test('stone rows retain equal spacing across polyline segments and follow the tangent', () => {
  const rows = pathRows([[0, 0], [0, 0.3], [0, 4], [4, 4]], 1);
  assert.equal(rows.length, 8);
  assert.deepEqual(rows.slice(0, 4).map(r => r.z), [0.5, 1.5, 2.5, 3.5]);
  assert.deepEqual(rows.slice(4).map(r => r.x), [0.5, 1.5, 2.5, 3.5]);
  assert.equal(rows[0].yaw, 0);
  assert.equal(rows[7].yaw, Math.PI / 2);
});

test('streaming is bounded, evicts GPU instances, and reconstructs identical ground cover on revisits', () => {
  const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1), material = new THREE.MeshBasicMaterial();
  const library = { has: () => true, get: () => ({ parts: [{ geometry, material }] }), getMaterial: () => material };
  const scene = new THREE.Scene();
  const stream = new ChunkStreamer(scene, new Heightmap(), library, new Colliders(), new InstancedPlacer(library), { radius: 8, unloadRadius: 32 });
  stream.update({ x: 12, z: 36 }, 1);
  assert.equal(stream.active.size, 1);
  const original = stream.active.get('0,1');
  const signature = tile => tile.cover.group.children.map(m => Array.from(m.instanceMatrix.array));
  const before = signature(original);
  let disposed = 0;
  original.group.traverse(m => { if (m.isInstancedMesh) m.addEventListener('dispose', () => disposed++); });
  stream.update({ x: 156, z: 156 }, 1);
  assert.equal(stream.active.has('0,1'), false);
  assert.ok(disposed > 0);
  assert.equal(scene.children.length, 1);
  stream.update({ x: 12, z: 36 }, 1);
  assert.deepEqual(signature(stream.active.get('0,1')), before);
  stream.dispose();
  assert.equal(scene.children.length, 0);
  geometry.dispose(); material.dispose();
});
