// ④ POND — Bowl with lily pads, rocky banks and trees leaning over the water
import { ZONES, WORLD } from '../WorldConfig.js';
import { TREE_COMMON, PEBBLES_ROUND, PETALS, PATH_SQUARE } from '../nature/NatureLibrary.js';

export function buildPond(ctx) {
  const Z = ZONES.pond;
  const level = WORLD.waterLevel;
  const at = (a, d) => [Z.x + Math.cos(a) * d, Z.z + Math.sin(a) * d];
  // The path arrives from the east (angle ≈ 0); keep that side open.
  const nearPathEntry = (a) => {
    const w = Math.atan2(Math.sin(a), Math.cos(a));
    return Math.abs(w) < 0.4;
  };

  // Rocky banks.
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + ctx.rand(-0.12, 0.12);
    if (nearPathEntry(a)) continue;
    const [x, z] = at(a, Z.r + ctx.rand(0.2, 2));
    const s = ctx.rand(0.35, 1.0);
    ctx.place(ctx.pick(['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3']), x, z, { scale: s, yOffset: -0.25 * s, footprint: 1.2 * s });
  }

  // Lily pads and floating petals.
  for (const [x, z] of ctx.scatter({
    circle: { x: Z.x, z: Z.z, r: Z.r - 2 }, count: 26, spacing: 1.6,
    accept: (x, z) => ctx.hm.getHeight(x, z) < level - 0.35,
  })) {
    const s = ctx.rand(0.8, 1.4);
    ctx.place(ctx.chance(0.5) ? 'Plant_7' : 'Plant_7_Big', x, z, { y: level - 0.06 * s + 0.01, scale: s, collider: 0 });
  }
  for (const [x, z] of ctx.scatter({
    circle: { x: Z.x, z: Z.z, r: Z.r - 2 }, count: 20, spacing: 1,
    accept: (x, z) => ctx.hm.getHeight(x, z) < level - 0.2,
  })) {
    ctx.place(ctx.pick(PETALS), x, z, { y: level + 0.01, scale: ctx.rand(0.7, 1.1), collider: 0 });
  }

  // Trees leaning toward the water.
  let trees = 0;
  for (let tries = 0; tries < 40 && trees < 6; tries++) {
    const a = ctx.rand(0, Math.PI * 2);
    if (nearPathEntry(a)) continue;
    const [x, z] = at(a, Z.r + ctx.rand(5, 9));
    if (!ctx.canPlace(x, z, 2.2)) continue;
    const rotY = ctx.rand(0, Math.PI * 2);
    ctx.place(ctx.pick(TREE_COMMON), x, z, {
      rotY, scale: ctx.rand(0.9, 1.2), yOffset: -0.15, footprint: 2.2, color: ctx.shade(),
      ...ctx.leanToward(rotY, Z.x - x, Z.z - z, ctx.rand(0.08, 0.16)),
    });
    trees++;
  }

  // Bank vegetation.
  const bank = (count, spacing, rMin, rMax, fn) => {
    for (const [x, z] of ctx.scatter({
      circle: { x: Z.x, z: Z.z, r: Z.r + rMax }, count, spacing,
      accept: (x, z) => {
        const d = Math.hypot(x - Z.x, z - Z.z);
        return d > Z.r + rMin && ctx.canPlace(x, z, 0.4, { footprint: false }) && !ctx.colliders.overlaps(x, z, 0.5);
      },
    })) fn(x, z);
  };
  bank(10, 4, 1, 7, (x, z) => ctx.place('Fern_1', x, z, { scale: ctx.rand(0.25, 0.38), color: ctx.shade() }));
  bank(26, 1.8, -1, 6, (x, z) => ctx.place(ctx.pick(['Clover_1', 'Clover_2']), x, z, { scale: ctx.rand(0.8, 1.2) }));
  bank(16, 2.2, 0, 7, (x, z) => ctx.place('Flower_3_Group', x, z, { scale: ctx.rand(0.8, 1.2) }));
  bank(7, 4, 2, 8, (x, z) => ctx.place('Bush_Common_Flowers', x, z, { scale: ctx.rand(0.8, 1.1), color: ctx.shade() }));
  bank(36, 0.9, -1.5, 2, (x, z) => ctx.place(ctx.pick(PEBBLES_ROUND), x, z, { scale: ctx.rand(0.8, 1.6), rotY: ctx.rand(0, 6.28) }));

  // Stepping stones from the end of the path down to the water's edge.
  for (let x = -41.5; x > Z.x + Z.r - 3; x -= 1.15) {
    const z = 1 + ctx.rand(-0.3, 0.3);
    if (ctx.hm.isUnderwater(x, z, 0.05)) break;
    ctx.place(ctx.pick(PATH_SQUARE.slice(0, 3)), x, z, { scale: ctx.rand(0.9, 1.1), yOffset: 0.01, collider: 0 });
  }
}
