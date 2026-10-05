// ============================================================
// ZONE CONTEXT — Shared helpers every zone builder uses
// ============================================================
import * as THREE from 'three';
import { modelInfo } from '../nature/NatureLibrary.js';
import { scatter } from '../nature/Scatter.js';
import { Colliders } from '../Colliders.js';
import { randRange } from '../../utils/Random.js';
import { WORLD } from '../WorldConfig.js';

export class ZoneContext {
  /**
   * @param {object} deps { heightmap, placer, colliders, rng }
   */
  constructor({ heightmap, placer, colliders, rng }) {
    this.hm = heightmap;
    this.placer = placer;
    this.colliders = colliders;
    this.rng = rng;
    this.footprints = new Colliders(8); // keeps big objects from overlapping
  }

  rand(min = 0, max = 1) { return randRange(this.rng, min, max); }

  pick(list) { return list[Math.floor(this.rng() * list.length) % list.length]; }

  chance(p) { return this.rng() < p; }

  /**
   * Tilt angles (for Euler order YXZ) that lean an object's top toward
   * world direction (dx, dz) by `amount` radians, given its rotY.
   */
  leanToward(rotY, dx, dz, amount) {
    const len = Math.hypot(dx, dz) || 1;
    const wx = dx / len, wz = dz / len;
    const c = Math.cos(rotY), s = Math.sin(rotY);
    const lx = wx * c - wz * s;
    const lz = wx * s + wz * c;
    return { tiltX: lz * amount, tiltZ: -lx * amount };
  }

  /** Slight brightness / hue variation for instance colours. */
  shade(min = 0.88, max = 1.08, warm = 0) {
    const v = this.rand(min, max);
    return new THREE.Color(v + warm, v, v - warm);
  }

  /**
   * Places one model on the terrain.
   * opts: variant, rotY, scale, y (absolute), yOffset, tiltX, tiltZ,
   *       collider (radius override, 0 = none), footprint, color
   */
  place(name, x, z, opts = {}) {
    const factor = name.startsWith('Flower_') ? 0.32 : name.startsWith('Grass_') ? 0.4 : 1;
    const originalScale = opts.scale ?? 1;
    const scale = Array.isArray(originalScale) ? originalScale.map(v => v * factor) : originalScale * factor;
    const s = Array.isArray(scale) ? Math.max(scale[0], scale[2]) : scale;
    const y = opts.y ?? this.hm.getHeight(x, z) + (opts.yOffset ?? 0);
    const ok = this.placer.add(name, opts.variant ?? 'default', {
      x, y, z,
      rotY: opts.rotY ?? this.rng() * Math.PI * 2,
      scale,
      tiltX: opts.tiltX ?? 0,
      tiltZ: opts.tiltZ ?? 0,
      color: opts.color ?? null,
    });
    if (!ok) return false;
    const r = opts.collider ?? modelInfo(name).collider * s;
    if (r > 0) this.colliders.add(x, z, r);
    if (opts.footprint) this.footprints.add(x, z, opts.footprint);
    return true;
  }

  /**
   * True when (x,z) is valid ground for an object of `radius`.
   * opts: path (avoid paths, default true), water (avoid water, default true),
   *       footprint (avoid other big objects, default true), inside (stay within play radius)
   */
  canPlace(x, z, radius = 0, opts = {}) {
    const { path = true, water = true, footprint = true, inside = false } = opts;
    if (path && this.hm.getClear(x, z) > 0.05) return false;
    if (path && radius > 1 && this.hm.getClear(x + radius * 0.7, z) + this.hm.getClear(x - radius * 0.7, z)
      + this.hm.getClear(x, z + radius * 0.7) + this.hm.getClear(x, z - radius * 0.7) > 0.05) return false;
    if (water && this.hm.isUnderwater(x, z, 0.25)) return false;
    if (footprint && this.footprints.overlaps(x, z, radius)) return false;
    if (inside && Math.hypot(x, z) > WORLD.playRadius - 2) return false;
    return Math.abs(x) < this.hm.half - 1 && Math.abs(z) < this.hm.half - 1;
  }

  scatter(opts) {
    return scatter(this.rng, opts);
  }
}
