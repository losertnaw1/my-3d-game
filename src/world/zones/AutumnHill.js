// ⑥ AUTUMN HILL — Red/orange/yellow trees and a big boulder on top (Preview_1)
import { ZONES } from '../WorldConfig.js';
import { TREE_COMMON } from '../nature/NatureLibrary.js';

const AUTUMN = ['autumn:orange', 'autumn:red', 'autumn:yellow'];

export function buildAutumnHill(ctx) {
  const Z = ZONES.autumn;

  ctx.place('Rock_Medium_3', Z.x + 2, Z.z - 1, { scale: 3, rotY: 0.7, yOffset: -0.7, footprint: 4.5 });
  ctx.place('Rock_Medium_1', Z.x - 3.5, Z.z + 3, { scale: 1.6, rotY: 2.2, yOffset: -0.35, footprint: 2.4 });
  ctx.place('Rock_Medium_2', Z.x + 6, Z.z + 3.5, { scale: 1.1, rotY: 4.1, yOffset: -0.2, footprint: 1.6 });

  for (const [x, z] of ctx.scatter({ circle: Z, count: 38, spacing: 5.8, accept: (x, z) => ctx.canPlace(x, z, 2) })) {
    ctx.place(ctx.pick(TREE_COMMON), x, z, {
      variant: ctx.pick(AUTUMN), scale: ctx.rand(0.9, 1.3), yOffset: -0.1, footprint: 2, color: ctx.shade(0.9, 1.08),
    });
  }

  const free = (r) => (x, z) => ctx.canPlace(x, z, r, { footprint: false }) && !ctx.colliders.overlaps(x, z, r + 0.3);
  for (const [x, z] of ctx.scatter({ circle: Z, count: 14, spacing: 4, accept: free(0.8) })) {
    ctx.place('Bush_Common', x, z, { variant: ctx.pick(AUTUMN), scale: ctx.rand(0.8, 1.2) });
  }
  for (const [x, z] of ctx.scatter({ circle: Z, count: 16, spacing: 3, accept: free(0.6) })) {
    ctx.place('Plant_1', x, z, { variant: ctx.pick(AUTUMN), scale: ctx.rand(0.8, 1.3) });
  }
  for (const [x, z] of ctx.scatter({ circle: Z, count: 20, spacing: 1.8, accept: free(0.2) })) {
    ctx.place('Mushroom_Common', x, z, { scale: ctx.rand(0.8, 1.4) });
  }
}
