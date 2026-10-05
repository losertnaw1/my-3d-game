// ⑤ FLOWER VALLEY — Flowers grouped into colour patches
import { ZONES } from '../WorldConfig.js';
import { TREE_COMMON, FLOWERS, PETALS } from '../nature/NatureLibrary.js';

export function buildFlowerValley(ctx) {
  const Z = ZONES.flowers;
  const free = (r) => (x, z) => ctx.canPlace(x, z, r, { footprint: false }) && !ctx.colliders.overlaps(x, z, r + 0.3);

  for (const [x, z] of ctx.scatter({ circle: Z, count: 12, spacing: 7, accept: (x, z) => ctx.canPlace(x, z, 2.2) })) {
    ctx.place(ctx.pick(TREE_COMMON), x, z, { scale: ctx.rand(0.9, 1.2), yOffset: -0.1, footprint: 2.2, color: ctx.shade() });
  }
  for (const [x, z] of ctx.scatter({ circle: Z, count: 5, spacing: 5, accept: free(0.8) })) {
    ctx.place('Bush_Common_Flowers', x, z, { scale: ctx.rand(0.8, 1.3), color: ctx.shade() });
  }

}
