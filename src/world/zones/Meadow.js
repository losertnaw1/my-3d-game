// ① MEADOW — Spawn clearing: sparse tree clusters, landmark boulders (Preview_1)
import { ZONES, SPAWN } from '../WorldConfig.js';
import { TREE_COMMON } from '../nature/NatureLibrary.js';

export function buildMeadow(ctx) {
  const Z = ZONES.meadow;
  const nearSpawn = (x, z, r) => Math.hypot(x - SPAWN.x, z - SPAWN.z) < r;

  // Landmark boulder pile (north-west of the hub).
  const boulders = [
    ['Rock_Medium_1', -15, -12, 3.4, 0.4],
    ['Rock_Medium_3', -10.5, -15.5, 2.6, 2.1],
    ['Rock_Medium_2', -18.5, -8, 2.0, 4.0],
  ];
  for (const [name, x, z, s, rotY] of boulders) {
    ctx.place(name, x, z, { scale: s, rotY, yOffset: -0.25 * s, footprint: 1.5 * s });
  }
  // Bushes + mushrooms hugging the boulders.
  for (let i = 0; i < 8; i++) {
    const a = ctx.rand(0, Math.PI * 2), d = ctx.rand(5.5, 8);
    const x = -14 + Math.cos(a) * d, z = -12 + Math.sin(a) * d;
    if (ctx.canPlace(x, z, 0.8)) ctx.place((ctx.chance(0.85) ? 'Bush_Common' : 'Bush_Common_Flowers'), x, z, { scale: ctx.rand(0.8, 1.3), color: ctx.shade() });
  }
  for (let i = 0; i < 10; i++) {
    const a = ctx.rand(0, Math.PI * 2), d = ctx.rand(4.5, 7);
    const x = -14 + Math.cos(a) * d, z = -12 + Math.sin(a) * d;
    if (ctx.canPlace(x, z, 0.2)) ctx.place('Mushroom_Common', x, z, { scale: ctx.rand(0.8, 1.4) });
  }
  // A smaller rock near spawn as a first point of interest.
  ctx.place('Rock_Medium_2', 8, 29, { scale: 1.1, rotY: 1.2, yOffset: -0.2, footprint: 2 });

  // Tree clusters of 2–3 trees, leaving wide open lines of sight.
  const clusters = [[-25, -1], [-22, 22], [19, -9], [23, 30], [-7, -23], [26, 4], [-10, 31], [12, 42], [-15, 44], [14, 15]];
  for (const [cx, cz] of clusters) {
    const pts = ctx.scatter({
      circle: { x: cx, z: cz, r: 6 }, count: 6, spacing: 2.9,
      accept: (x, z) => ctx.canPlace(x, z, 2) && !nearSpawn(x, z, 8),
    });
    for (const [x, z] of pts) {
      ctx.place(ctx.pick(TREE_COMMON), x, z, { scale: ctx.rand(0.9, 1.25), yOffset: -0.1, footprint: 2, color: ctx.shade() });
    }
  }
  // A few lone trees.
  for (const [x, z] of ctx.scatter({
    circle: Z, count: 16, spacing: 6,
    accept: (x, z) => ctx.canPlace(x, z, 2.5) && !nearSpawn(x, z, 9),
  })) {
    ctx.place(ctx.pick(TREE_COMMON), x, z, { scale: ctx.rand(1, 1.3), yOffset: -0.1, footprint: 2.5, color: ctx.shade() });
  }

  // Undergrowth.
  for (const [x, z] of ctx.scatter({ circle: Z, count: 18, spacing: 4, accept: (x, z) => ctx.canPlace(x, z, 0.9) })) {
    ctx.place(ctx.pick(['Bush_Common', 'Bush_Common_Flowers']), x, z, { scale: ctx.rand(0.8, 1.3), color: ctx.shade() });
  }
  for (const [x, z] of ctx.scatter({ circle: Z, count: 8, spacing: 3, accept: (x, z) => ctx.canPlace(x, z, 0.3) })) {
    ctx.place(ctx.pick(['Flower_3_Single', 'Flower_4_Single']), x, z, { scale: ctx.rand(0.7, 1.1) });
  }
  for (const [x, z] of ctx.scatter({ circle: Z, count: 7, spacing: 6, accept: (x, z) => ctx.canPlace(x, z, 1.5) && !nearSpawn(x, z, 5) })) {
    ctx.place('Fern_1', x, z, { scale: ctx.rand(0.28, 0.42), color: ctx.shade() });
  }
}
