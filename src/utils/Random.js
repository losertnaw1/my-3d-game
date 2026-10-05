// ============================================================
// RANDOM — Seeded RNG, value noise and small math helpers
// ============================================================
// Everything that shapes the world is driven by a seed so the
// map is identical on every reload (and testable in Node).

/** Fast seeded PRNG → returns a function producing floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 2D value noise with smooth interpolation + fractal sum. */
export class ValueNoise {
  constructor(seed = 1) {
    const rng = mulberry32(seed);
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    this.values = new Float32Array(256);
    for (let i = 0; i < 256; i++) this.values[i] = rng() * 2 - 1;
  }

  _v(ix, iz) {
    return this.values[this.perm[(ix & 255) + this.perm[iz & 255]]];
  }

  /** Smooth noise in [-1, 1]. */
  noise(x, z) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx);
    const uz = fz * fz * (3 - 2 * fz);
    const a = this._v(ix, iz);
    const b = this._v(ix + 1, iz);
    const c = this._v(ix, iz + 1);
    const d = this._v(ix + 1, iz + 1);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
  }

  /** Fractal Brownian motion, normalised to roughly [-1, 1]. */
  fbm(x, z, octaves = 4) {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.noise(x * freq + i * 17.3, z * freq - i * 9.1);
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  }
}

export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
export const randRange = (rng, min, max) => min + (max - min) * rng();
export const pick = (rng, list) => list[Math.floor(rng() * list.length) % list.length];

/** Picks a key from { key: weight } using rng. */
export function pickWeighted(rng, weights) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let r = rng() * total;
  for (const k in weights) {
    r -= weights[k];
    if (r <= 0) return k;
  }
  return Object.keys(weights)[0];
}
