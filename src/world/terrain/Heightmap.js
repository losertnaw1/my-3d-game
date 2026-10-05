// ============================================================
// HEIGHTMAP — Terrain height + biome weights for every point
// ============================================================
// Pure math (no rendering) so it can be shared by the terrain
// mesh, vegetation scatter, the player and unit tests.
import { ValueNoise, smoothstep, lerp, clamp } from '../../utils/Random.js';
import { WORLD, ZONES, PATHS } from '../WorldConfig.js';

const gauss = (dx, dz, s) => Math.exp(-(dx * dx + dz * dz) / (2 * s * s));

/** Uniform Catmull-Rom through [x,z] points, resampled roughly every `step` metres. */
export function samplePath(points, step = 1) {
  const out = [];
  const P = (i) => points[clamp(i, 0, points.length - 1)];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(2, Math.ceil(len / step));
    for (let s = 0; s < n; s++) {
      const t = s / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push([...points[points.length - 1]]);
  return out;
}

export class Heightmap {
  constructor(opts = {}) {
    this.size = opts.size ?? WORLD.size;
    this.segments = opts.segments ?? WORLD.segments;
    this.seed = opts.seed ?? WORLD.seed;
    this.zones = opts.zones ?? ZONES;
    this.waterLevel = opts.waterLevel ?? WORLD.waterLevel;
    this.half = this.size / 2;
    this.step = this.size / this.segments;
    this.res = this.segments + 1;

    this.noise = new ValueNoise(this.seed);
    this.detail = new ValueNoise(this.seed + 101);

    this.paths = (opts.paths ?? PATHS).map((p) => ({
      name: p.name,
      width: p.width,
      paint: p.paint !== false,
      points: samplePath(p.points, 1),
    }));

    const count = this.res * this.res;
    this.heights = new Float32Array(count);
    this.paintMask = new Float32Array(count); // dirt colour on terrain
    this.clearMask = new Float32Array(count); // keep free of vegetation
    this._rasterizePaths();
    this._computeHeights();
  }

  // ── Public API ──────────────────────────────────────────────

  /** Exact height of the rendered terrain surface (matches mesh triangulation). */
  getHeight(x, z) {
    return this._sampleGrid(this.heights, x, z, true);
  }

  /** 0..1 — how much (x,z) lies on a painted dirt path. */
  getPath(x, z) {
    return this._sampleGrid(this.paintMask, x, z, false);
  }

  /** 0..1 — how much (x,z) should stay clear of vegetation (any path). */
  getClear(x, z) {
    return this._sampleGrid(this.clearMask, x, z, false);
  }

  isUnderwater(x, z, margin = 0) {
    const Z = this.zones.pond;
    if (Math.hypot(x - Z.x, z - Z.z) > Z.r + 8) return false;
    return this.getHeight(x, z) < this.waterLevel + margin;
  }

  /** Biome weights used for terrain colours and ground cover. */
  biome(x, z) {
    const Z = this.zones;
    const n = this.detail.noise(x * 0.07, z * 0.07) * 0.16;
    const d = (zone) => Math.hypot(x - zone.x, z - zone.z) / zone.r;
    const pine = Math.hypot((x - Z.pine.x) / Z.pine.rx, (z - Z.pine.z) / Z.pine.rz);
    const r = Math.hypot(x, z);
    return {
      forest: 1 - smoothstep(0.72, 1.05, pine + n),
      sand: 1 - smoothstep(0.6, 1.0, d(Z.dry) + n),
      autumn: 1 - smoothstep(0.55, 1.0, d(Z.autumn) + n),
      flowers: 1 - smoothstep(0.55, 1.0, d(Z.flowers) + n),
      grove: 1 - smoothstep(0.55, 1.0, d(Z.grove) + n),
      shore: 1 - smoothstep(1.0, 1.45, d(Z.pond) + n),
      border: smoothstep(WORLD.playRadius - 10, WORLD.playRadius + 6, r + n * 20),
      path: this.getPath(x, z),
    };
  }

  // ── Internals ───────────────────────────────────────────────

  _rawHeight(x, z) {
    const Z = this.zones;
    let h = 1.2 + this.noise.fbm(x * 0.018, z * 0.018, 4) * 1.8
      + this.detail.fbm(x * 0.07, z * 0.07, 2) * 0.3;

    // Spawn meadow: gentle rolling ground.
    const meadow = 1 - smoothstep(Z.meadow.r * 0.5, Z.meadow.r, Math.hypot(x - Z.meadow.x, z - Z.meadow.z));
    h = lerp(h, 1.0 + (h - 1.2) * 0.35, meadow);

    // Hills and valleys.
    h += gauss(x - Z.grove.x, z - Z.grove.z, 15) * 5.5;
    h += gauss(x - Z.autumn.x, z - Z.autumn.z, 17) * 3.4;
    h -= gauss(x - Z.flowers.x, z - Z.flowers.z, 18) * 0.8;

    // Dry valley: flat sandy floor with soft dunes, raised rim.
    const dd = Math.hypot(x - Z.dry.x, z - Z.dry.z) / Z.dry.r;
    const dry = 1 - smoothstep(0.55, 1.0, dd);
    h = lerp(h, 0.8 + this.detail.fbm(x * 0.05, z * 0.05, 2) * 0.5, dry);
    h += smoothstep(0.75, 1.05, dd) * (1 - smoothstep(1.05, 1.4, dd)) * 2.2;

    // Path beds sit slightly lower.
    h -= this._sampleGrid(this.paintMask, x, z, false) * 0.08;

    // Pond bowl.
    const pd = Math.hypot(x - Z.pond.x, z - Z.pond.z);
    const bowl = 1 - smoothstep(Z.pond.r * 0.7, Z.pond.r + 4, pd);
    h = lerp(h, Z.pond.depth, bowl);

    // Border hills hide the edge of the world.
    const r = Math.hypot(x, z);
    h += smoothstep(WORLD.playRadius - 8, WORLD.size / 2, r) * (13 + this.noise.fbm(x * 0.04 + 50, z * 0.04, 3) * 7);
    return h;
  }

  _computeHeights() {
    const { res, step, half } = this;
    for (let iz = 0; iz < res; iz++) {
      for (let ix = 0; ix < res; ix++) {
        this.heights[iz * res + ix] = this._rawHeight(ix * step - half, iz * step - half);
      }
    }
  }

  _rasterizePaths() {
    const { res, step, half } = this;
    for (const path of this.paths) {
      const hw = path.width / 2;
      const pts = path.points;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i];
        const [bx, bz] = pts[i + 1];
        const pad = hw + 1.5;
        const x0 = Math.max(0, Math.floor((Math.min(ax, bx) - pad + half) / step));
        const x1 = Math.min(res - 1, Math.ceil((Math.max(ax, bx) + pad + half) / step));
        const z0 = Math.max(0, Math.floor((Math.min(az, bz) - pad + half) / step));
        const z1 = Math.min(res - 1, Math.ceil((Math.max(az, bz) + pad + half) / step));
        const abx = bx - ax, abz = bz - az;
        const len2 = abx * abx + abz * abz || 1;
        for (let iz = z0; iz <= z1; iz++) {
          for (let ix = x0; ix <= x1; ix++) {
            const x = ix * step - half, z = iz * step - half;
            const t = clamp(((x - ax) * abx + (z - az) * abz) / len2, 0, 1);
            const dist = Math.hypot(x - (ax + abx * t), z - (az + abz * t));
            const edge = hw * (1 + this.detail.noise(x * 0.3, z * 0.3) * 0.25);
            const m = 1 - smoothstep(edge * 0.55, edge + 0.4, dist);
            const k = iz * res + ix;
            if (path.paint && m > this.paintMask[k]) this.paintMask[k] = m;
            const c = 1 - smoothstep(hw, hw + 0.8, dist);
            if (c > this.clearMask[k]) this.clearMask[k] = c;
          }
        }
      }
    }
  }

  /**
   * Samples a grid value at world (x,z). With `triangles` the result
   * follows the mesh's two triangles per cell (diagonal from
   * (ix, iz+1) to (ix+1, iz)), otherwise bilinear.
   */
  _sampleGrid(grid, x, z, triangles) {
    const { res, step, half } = this;
    const gx = clamp((x + half) / step, 0, res - 1.0001);
    const gz = clamp((z + half) / step, 0, res - 1.0001);
    const ix = Math.floor(gx), iz = Math.floor(gz);
    const fx = gx - ix, fz = gz - iz;
    const a = grid[iz * res + ix];
    const d = grid[iz * res + ix + 1];
    const b = grid[(iz + 1) * res + ix];
    const c = grid[(iz + 1) * res + ix + 1];
    if (!triangles) {
      return a + (d - a) * fx + (b - a) * fz + (a - b - d + c) * fx * fz;
    }
    if (fx + fz <= 1) return a + (d - a) * fx + (b - a) * fz;
    return c + (b - c) * (1 - fx) + (d - c) * (1 - fz);
  }
}
