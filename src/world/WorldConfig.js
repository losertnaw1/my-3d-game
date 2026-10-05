// ============================================================
// WORLD CONFIG — Layout of the whole map in one place
// ============================================================
// Coordinates: X = East(+)/West(-), Z = South(+)/North(-), metres.
// Tweak zone centres / radii / paths here; terrain, colours and
// vegetation all follow automatically.

export const WORLD = {
  seed: 1337,
  size: 440,          // terrain side length
  segments: 440,      // 1 m grid
  playRadius: 204,     // player cannot walk beyond this radius
  waterLevel: -0.45,
  chunkSize: 24,      // instancing chunk → frustum culling per chunk
  grassSpacing: 0.48, // near-field ground-cover grid; generated only in active tiles
};

export const ZONES = {
  meadow:  { x: 0,   z: 8,   r: 30 },               // ① spawn meadow
  pine:    { x: -5,  z: -64, rx: 60, rz: 32 },      // ② pine forest (ellipse)
  grove:   { x: 60,  z: -58, r: 22 },               // ③ ancient twisted grove (hill)
  pond:    { x: -58, z: 0,   r: 15, depth: -1.9 },  // ④ pond
  flowers: { x: 60,  z: 14,  r: 24 },               // ⑤ flower valley
  autumn:  { x: 52,  z: 66,  r: 26 },               // ⑥ autumn hill
  dry:     { x: -56, z: 62,  r: 30 },               // ⑦ dry valley
};

export const SPAWN = { x: 0, z: 36, yaw: 0 }; // facing north

export const HUB = [0, 8];

// Dirt paths (Catmull-Rom through points). paint=false → only keeps
// the area clear of vegetation (used for the stone path in the desert).
export const PATHS = [
  { name: 'spawn',   width: 1.6, points: [[0, 46], [1, 30], [-1, 18], HUB] },
  { name: 'pine',    width: 1.6, points: [HUB, [-4, -10], [4, -30], [-6, -52], [-10, -74]] },
  { name: 'grove',   width: 1.6, points: [HUB, [16, -6], [32, -24], [46, -42], [55, -51]] },
  { name: 'pond',    width: 1.6, points: [HUB, [-16, 6], [-30, 2], [-41, 1]] },
  { name: 'flowers', width: 1.6, points: [HUB, [20, 11], [40, 15], [60, 17], [82, 12]] },
  { name: 'autumn',  width: 1.6, points: [HUB, [12, 24], [28, 42], [44, 58]] },
  { name: 'dry',     width: 1.6, points: [HUB, [-12, 24], [-28, 40], [-40, 52]] },
  {
    name: 'dryStones', width: 1.6, paint: false,
    points: [[-40, 52], [-48, 58], [-58, 56], [-66, 64], [-62, 74], [-70, 84]],
  },
];
