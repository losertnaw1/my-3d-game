// ⑧ BORDER — Dense trees on the rising hills around the playable area
import { WORLD } from '../WorldConfig.js';
import { TREE_PINE, TREE_COMMON, TREE_DEAD } from '../nature/NatureLibrary.js';

const AUTUMN = ['autumn:orange', 'autumn:red', 'autumn:yellow'];

export function buildBorder(ctx) {
  const lim = ctx.hm.half - 3;
  const pts = ctx.scatter({
    rect: { x0: -lim, z0: -lim, x1: lim, z1: lim }, count: 650, spacing: 6.8,
    accept: (x, z) => {
      const r = Math.hypot(x, z);
      return r > WORLD.playRadius - 9 && r < WORLD.size / 2 + 10 && ctx.canPlace(x, z, 2, { path: false });
    },
  });
  for (const [x, z] of pts) {
    const b = ctx.hm.biome(x, z);
    const opts = { scale: ctx.rand(1.1, 1.65), yOffset: -0.2, footprint: 2, color: ctx.shade(0.8, 1.02) };
    if (b.sand > 0.35) {
      if (ctx.chance(0.6)) continue;
      ctx.place(ctx.pick(TREE_DEAD), x, z, { ...opts, scale: ctx.rand(0.6, 0.9) });
    } else if (b.autumn > 0.35) {
      ctx.place(ctx.pick(TREE_COMMON), x, z, { ...opts, variant: ctx.pick(AUTUMN) });
    } else {
      ctx.place(ctx.chance(0.65) ? ctx.pick(TREE_PINE) : ctx.pick(TREE_COMMON), x, z, opts);
    }
  }
}
