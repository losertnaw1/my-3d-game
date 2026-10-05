import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Heightmap } from '../src/world/terrain/Heightmap.js';
import { createTerrainMesh } from '../src/world/terrain/TerrainMesh.js';
import { scatter } from '../src/world/nature/Scatter.js';
import { mulberry32 } from '../src/utils/Random.js';
import { Colliders } from '../src/world/Colliders.js';
import { ThirdPersonCamera } from '../src/controls/ThirdPersonCamera.js';
import { Player } from '../src/player/Player.js';
import { DayNightCycle } from '../src/world/DayNightCycle.js';
import { ZONES, SPAWN } from '../src/world/WorldConfig.js';
import { MODEL_NAMES, NATURE_BASE } from '../src/world/nature/NatureLibrary.js';
import { existsSync, readFileSync } from 'node:fs';

test('terrain is seeded, spawn is dry, pond is submerged, and sampling matches rendered triangles', () => {
  const hm = new Heightmap();
  assert.deepEqual(hm.heights, new Heightmap().heights);
  assert.notDeepEqual(hm.heights, new Heightmap({ seed: hm.seed + 1 }).heights);
  assert.equal(hm.isUnderwater(SPAWN.x, SPAWN.z), false);
  assert.equal(hm.isUnderwater(ZONES.pond.x, ZONES.pond.z), true);
  const mesh = createTerrainMesh(hm);
  mesh.updateMatrixWorld();
  const ray = new THREE.Raycaster();
  for (const [x, z] of [[0.2, 35.3], [-58.8, 0.7], [60.7, -58.4], [90.3, 5.8]]) {
    ray.set(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
    assert.ok(Math.abs(ray.intersectObject(mesh)[0].point.y - hm.getHeight(x, z)) < 1e-5);
  }
  mesh.geometry.dispose(); mesh.material.dispose();
});

test('scatter is deterministic and respects region, mask and minimum spacing', () => {
  const options = { circle: { x: 0, z: 0, r: 20 }, count: 80, spacing: 2, accept: (x) => x > 2 };
  const points = scatter(mulberry32(42), options);
  assert.equal(points.length, 80);
  assert.deepEqual(points, scatter(mulberry32(42), options));
  points.forEach(([x, z], i) => {
    assert.ok(x > 2 && Math.hypot(x, z) <= 20);
    points.slice(i + 1).forEach(([a, b]) => assert.ok(Math.hypot(x - a, z - b) >= 2));
  });
});

test('colliders resolve exact centres and collisions across hash cell boundaries', () => {
  const colliders = new Colliders(8);
  colliders.add(8, 0, 2);
  for (const x of [8, 6.1, 9.9]) {
    const p = { x, z: 0 };
    assert.equal(colliders.resolve(p, 0.35), true);
    assert.ok(Math.hypot(p.x - 8, p.z) >= 2.35 - 1e-9);
  }
});

test('camera remains above a ridge crossed during smoothing and zoom is clamped', () => {
  let wheel = 0;
  const camera = new THREE.PerspectiveCamera();
  const controls = new ThirdPersonCamera(camera, { consumeMouse: () => ({ dx: 0, dy: 0 }), consumeWheel: () => wheel }, x => Math.abs(x) < 1 ? 20 : 0);
  controls.update(0, new THREE.Vector3(-5, 0, 0));
  controls.update(Math.log(2) / 18, new THREE.Vector3(5, 0, 0));
  assert.ok(camera.position.y >= 20.4);
  wheel = 10000;
  controls.update(0, new THREE.Vector3());
  assert.equal(controls.distance, controls.maxDistance);
});

test('player movement, jumping, water blocking and respawn work with the new controls', () => {
  const hm = { getHeight: () => 2, isUnderwater: (x, z) => z < -1 };
  const player = new Player(null, { heightmap: hm, colliders: new Colliders() });
  const held = new Set(['KeyW']);
  let jump = false;
  const input = { isDown: (...codes) => codes.some(c => held.has(c)), wasPressed: () => jump };
  const basis = { forward: { x: 0, z: -1 }, right: { x: 1, z: 0 } };
  player.spawn(0, 0);
  for (let i = 0; i < 40; i++) player.update(0.05, input, basis);
  assert.ok(player.position.z < 0 && player.position.z >= -1);
  held.clear(); jump = true;
  player.update(0.05, input, basis);
  assert.ok(player.position.y > 2);
  jump = false;
  for (let i = 0; i < 40; i++) player.update(0.05, input, basis);
  assert.equal(player.grounded, true);
  assert.equal(player.position.y, 2);
  player.spawn(3, 4);
  assert.deepEqual(player.position.toArray(), [3, 2, 4]);
});

test('day/night cycle wraps and changes lighting between noon and midnight', () => {
  const cycle = new DayNightCycle({ dayLength: 480, startHour: 12 });
  assert.equal(cycle.state.night, 0);
  cycle.update(240);
  assert.equal(cycle.clock, '00:00');
  assert.equal(cycle.state.night, 1);
  assert.ok(cycle.state.keyDir.y > 0);
  cycle.speed = 30;
  cycle.update(8);
  assert.equal(cycle.clock, '12:00');
});

test('every configured model and its external resources exist', () => {
  const base = `public${NATURE_BASE}`;
  for (const name of MODEL_NAMES) {
    const gltf = JSON.parse(readFileSync(`${base}${name}.gltf`, 'utf8'));
    for (const resource of [...(gltf.buffers ?? []), ...(gltf.images ?? [])]) {
      if (resource.uri && !resource.uri.startsWith('data:')) assert.ok(existsSync(base + decodeURI(resource.uri)), `${name}: ${resource.uri}`);
    }
  }
  assert.ok(existsSync(base + 'Rocks_Desert_Diffuse.png'));
});
