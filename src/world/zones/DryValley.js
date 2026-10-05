// ⑦ DRY VALLEY — Sand, dead trees, desert rocks and an S-shaped stone path (Preview_3)
import { ZONES } from '../WorldConfig.js';
import { TREE_DEAD, ROCKS, PATH_SQUARE, PEBBLES_SQUARE } from '../nature/NatureLibrary.js';

export function buildDryValley(ctx) {
  const Z = ZONES.dry;

  // Desert rock walls along the valley rim.
  const walls = 18;
  for (let i = 0; i < walls; i++) {
    const a = (i / walls) * Math.PI * 2 + ctx.rand(-0.15, 0.15);
    const d = Z.r * ctx.rand(0.78, 1.05);
    const x = Z.x + Math.cos(a) * d, z = Z.z + Math.sin(a) * d;
    const s = ctx.rand(1.6, 3.4);
    if (!ctx.canPlace(x, z, 1.1 * s)) continue;
    ctx.place(ctx.pick(ROCKS), x, z, { variant: 'desert', scale: s, yOffset: -0.3 * s, footprint: 1.3 * s });
  }
  for (const [x, z] of ctx.scatter({ circle: { x: Z.x, z: Z.z, r: Z.r * 0.8 }, count: 16, spacing: 4, accept: (x, z) => ctx.canPlace(x, z, 0.8) })) {
    const s = ctx.rand(0.3, 0.8);
    ctx.place(ctx.pick(ROCKS), x, z, { variant: 'desert', scale: s, yOffset: -0.15 * s, footprint: s });
  }

  for (const [x, z] of ctx.scatter({ circle: { x: Z.x, z: Z.z, r: Z.r * 0.85 }, count: 10, spacing: 9, accept: (x, z) => ctx.canPlace(x, z, 2.5) })) {
    ctx.place(ctx.pick(TREE_DEAD), x, z, { scale: ctx.rand(0.55, 0.85), yOffset: -0.1, footprint: 2.5, color: ctx.shade(0.85, 1.05) });
  }

  const free = (r) => (x, z) => ctx.canPlace(x, z, r, { footprint: false }) && !ctx.colliders.overlaps(x, z, r + 0.3);
  for (const [x, z] of ctx.scatter({ circle: Z, count: 8, spacing: 6, accept: free(0.6) })) {
    ctx.place('Plant_1', x, z, { scale: ctx.rand(0.8, 1.2) });
  }
  // Clumps of naturally yellow wispy grass.
  for (const [x, z] of ctx.scatter({ circle: Z, count: 40, spacing: 2.5, accept: free(0.4) })) {
    ctx.place('Grass_Wispy_Tall', x, z, { scale: ctx.rand(0.8, 1.3), variant: ctx.chance(0.25) ? 'grass:orange' : 'grass:yellow' });
  }
}
