import * as THREE from 'three';
import { WORLD } from './WorldConfig.js';
import { createTerrainMesh } from './terrain/TerrainMesh.js';
import { InstancedPlacer } from './nature/InstancedPlacer.js';
import { ZoneContext } from './zones/ZoneContext.js';
import { buildGroundCover } from './zones/GroundCover.js';
import { mulberry32 } from '../utils/Random.js';

// Only placement recipes and shared asset buffers survive eviction.
// New GPU instance buffers/terrain are created in distance order, one tile per frame.
export class ChunkStreamer {
  constructor(scene, hm, library, colliders, recipes, { radius = 42, unloadRadius = 56 } = {}) {
    Object.assign(this, { scene, hm, library, colliders, radius, unloadRadius });
    this.size = WORLD.chunkSize;
    this.active = new Map();
    this.recipes = new Map();
    for (const batch of recipes.batches.values()) {
      const key = `${batch.cx},${batch.cz}`;
      if (!this.recipes.has(key)) this.recipes.set(key, []);
      this.recipes.get(key).push(batch);
    }
    this.stats = { chunks: 0, meshes: 0, instances: 0 };
  }
  distance(x, z, focus) {
    // Distance to tile bounds, not centre: no holes near tile edges.
    return Math.hypot(Math.max(x - focus.x, 0, focus.x - x - this.size), Math.max(z - focus.z, 0, focus.z - z - this.size));
  }
  update(focus, budget = 1) {
    for (const [key, tile] of this.active) {
      if (this.distance(tile.x, tile.z, focus) > this.unloadRadius) this.evict(key);
    }
    const pending = [];
    const s = this.size;
    for (let cz = Math.floor((focus.z - this.radius) / s); cz <= Math.floor((focus.z + this.radius) / s); cz++) {
      for (let cx = Math.floor((focus.x - this.radius) / s); cx <= Math.floor((focus.x + this.radius) / s); cx++) {
        const x = cx * s, z = cz * s, key = `${cx},${cz}`;
        if (x < -this.hm.half || z < -this.hm.half || x + s > this.hm.half || z + s > this.hm.half) continue;
        const d = this.distance(x, z, focus);
        if (d <= this.radius && !this.active.has(key)) pending.push({ x, z, cx, cz, key, d });
      }
    }
    pending.sort((a, b) => a.d - b.d);
    for (const tile of pending.slice(0, budget)) this.load(tile);
    let coverBudget = budget;
    for (const tile of this.active.values()) {
      const d = this.distance(tile.x, tile.z, focus);
      tile.group.visible = d < 40;
      if (d > 28 && tile.cover) {
        tile.cover.group.removeFromParent();
        tile.cover.group.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
        tile.cover = null;
      } else if (d < 18 && !tile.cover && coverBudget-- > 0) {
        this.loadCover(tile);
      }
    }
    for (const tile of this.active.values()) {
      for (const mesh of tile.cover?.group.children ?? []) {
        const sphere = mesh.boundingSphere;
        mesh.visible = Math.hypot(sphere.center.x - focus.x, sphere.center.z - focus.z) - sphere.radius < 23;
      }
    }
    this.stats.chunks = this.active.size;
    this.stats.meshes = [...this.active.values()].reduce((n, t) => n + t.meshes + (t.cover?.meshes ?? 0), 0);
    this.stats.instances = [...this.active.values()].reduce((n, t) => n + t.instances + (t.cover?.instances ?? 0), 0);
    return pending.length <= budget;
  }
  load(tile) {
    const group = new THREE.Group();
    const bounds = { x: tile.x, z: tile.z, size: this.size };
    const terrain = createTerrainMesh(this.hm, bounds);
    group.add(terrain);
    const placer = new InstancedPlacer(this.library);
    const result = placer.build(group, this.recipes.get(tile.key) ?? []);
    this.scene.add(group);
    this.active.set(tile.key, { ...tile, group, terrain, meshes: result.meshes + 1, instances: result.instances });
  }
  loadCover(tile) {
    const placer = new InstancedPlacer(this.library, { chunkSize: 8 });
    const ctx = new ZoneContext({ heightmap: this.hm, placer, colliders: this.colliders, rng: mulberry32((WORLD.seed ^ Math.imul(tile.cx, 73856093) ^ Math.imul(tile.cz, 19349663)) >>> 0) });
    buildGroundCover(ctx, { x: tile.x, z: tile.z, size: this.size });
    tile.cover = placer.build(tile.group);
  }
  evict(key) {
    const tile = this.active.get(key);
    tile.group.removeFromParent();
    tile.group.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
    tile.terrain.geometry.dispose();
    tile.terrain.material.dispose();
    this.active.delete(key);
  }
  dispose() { for (const key of this.active.keys()) this.evict(key); }
}
