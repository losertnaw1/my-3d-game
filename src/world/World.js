// ============================================================
// WORLD — Orchestrator for the Stylized Nature MegaKit map
// ============================================================
//
// Layout (zones, paths, spawn) lives in ./WorldConfig.js.
// Each zone has its own builder in ./zones/ — edit those to move,
// add or remove trees, rocks, flowers...
//
// Build steps (called from main.js):
//   1. buildTerrain()  — heightmap, vertex-coloured ground, pond water
//   2. loadModels()    — loads every MegaKit glTF once
//   3. populate()      — zones place instances → InstancedMesh batches
// ============================================================

import { WORLD, ZONES, SPAWN } from './WorldConfig.js';
import { Heightmap } from './terrain/Heightmap.js';
import { ChunkStreamer } from './ChunkStreamer.js';
import { Water } from './terrain/Water.js';
import { NatureLibrary, MODEL_NAMES } from './nature/NatureLibrary.js';
import { InstancedPlacer } from './nature/InstancedPlacer.js';
import { Colliders } from './Colliders.js';
import { ZoneContext } from './zones/ZoneContext.js';
import { buildZones } from './zones/index.js';
import { Fireflies } from './Fireflies.js';
import { mulberry32 } from '../utils/Random.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.heightmap = null;
    this.colliders = new Colliders(8);
    this.library = new NatureLibrary();
    this.water = null;
    this.fireflies = null;
    this.stats = null;
  }

  buildTerrain() {
    this.heightmap = new Heightmap();


    const P = ZONES.pond;
    this.water = new Water(this.scene, { x: P.x, z: P.z, radius: P.r + 5, level: WORLD.waterLevel });
  }

  async loadModels(onProgress) {
    await this.library.load(MODEL_NAMES, onProgress);
  }

  populate() {
    const placer = new InstancedPlacer(this.library, { chunkSize: WORLD.chunkSize });
    const ctx = new ZoneContext({
      heightmap: this.heightmap,
      placer,
      colliders: this.colliders,
      rng: mulberry32(WORLD.seed),
    });
    buildZones(ctx);
    this.streamer = new ChunkStreamer(this.scene, this.heightmap, this.library, this.colliders, placer);
    this.streamer.update(SPAWN, Infinity);
    this.stats = this.streamer.stats;
    console.info(`[World] ${this.stats.instances} instances in ${this.stats.meshes} instanced meshes, ${this.colliders.list.length} colliders`);

    const heightAt = (x, z) => this.heightmap.getHeight(x, z);
    this.fireflies = new Fireflies(this.scene, [
      { ...ZONES.pond, r: ZONES.pond.r + 8, count: 60 },
      { x: ZONES.pine.x, z: ZONES.pine.z, r: 30, count: 70 },
      { ...ZONES.meadow, count: 50 },
      { ...ZONES.grove, count: 50 },
    ], heightAt);
  }

  update(elapsed, night = 0, focus = SPAWN) {
    this.streamer?.update(focus);
    this.library.update(elapsed);
    this.water?.update(elapsed);
    this.fireflies?.update(elapsed, night);
  }
}
