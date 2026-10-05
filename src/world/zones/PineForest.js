// ② PINE FOREST — Dense pines with a winding path to a clearing (Preview_2)
import { ZONES } from '../WorldConfig.js';
import { TREE_PINE, TREE_COMMON } from '../nature/NatureLibrary.js';

export function buildPineForest(ctx) {
  const Z = ZONES.pine;
  const clearing = { x: -8, z: -78, r: 9 };
  const inClearing = (x, z) => Math.hypot(x - clearing.x, z - clearing.z) < clearing.r;

  // Clearing centrepiece: a mossy boulder and a lonely dead tree.
  ctx.place('Rock_Medium_1', -3, -81, { scale: 2.6, rotY: 0.9, yOffset: -0.6, footprint: 4 });
  ctx.place('DeadTree_1', -15, -71, { scale: 0.75, rotY: 2.4, footprint: 2.5 });

  const trees = ctx.scatter({
    ellipse: Z, count: 230, spacing: 4.2,
    accept: (x, z) => !inClearing(x, z) && ctx.canPlace(x, z, 2),
  });
  for (const [x, z] of trees) {
    const pine = ctx.chance(0.7);
    const rotY = ctx.rand(0, Math.PI * 2);
    ctx.place(pine ? ctx.pick(TREE_PINE) : ctx.pick(TREE_COMMON), x, z, {
      rotY, scale: ctx.rand(0.95, 1.45), yOffset: -0.15, footprint: 2, color: ctx.shade(0.82, 1.02),
    });
    // Shelf mushrooms growing on some trunks.
    if (ctx.chance(0.22)) {
      const a = ctx.rand(0, Math.PI * 2);
      ctx.place('Mushroom_Laetiporus', x + Math.cos(a) * 0.45, z + Math.sin(a) * 0.45, {
        rotY: -a + Math.PI / 2, scale: ctx.rand(0.6, 0.9), yOffset: ctx.rand(0.2, 0.9), collider: 0,
      });
    }
  }

  const under = (count, spacing, radius, fn) => {
    for (const [x, z] of ctx.scatter({
      ellipse: Z, count, spacing,
      accept: (x, z) => ctx.canPlace(x, z, radius, { footprint: false }) && !ctx.colliders.overlaps(x, z, radius),
    })) fn(x, z);
  };
  under(50, 3.5, 0.6, (x, z) => ctx.place('Fern_1', x, z, { scale: ctx.rand(0.22, 0.4), color: ctx.shade(0.8, 1) }));
  under(18, 5, 0.8, (x, z) => ctx.place('Plant_1_Big', x, z, { scale: ctx.rand(0.55, 0.85) }));
  under(40, 2, 0.2, (x, z) => ctx.place('Mushroom_Common', x, z, { scale: ctx.rand(0.7, 1.3) }));
  under(45, 2.2, 0.3, (x, z) => ctx.place(ctx.pick(['Clover_1', 'Clover_2']), x, z, { scale: ctx.rand(0.8, 1.2) }));
  under(24, 4, 0.8, (x, z) => ctx.place('Bush_Common', x, z, { scale: ctx.rand(0.8, 1.2), color: ctx.shade(0.8, 1) }));
}
