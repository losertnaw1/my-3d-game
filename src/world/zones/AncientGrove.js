// ③ ANCIENT GROVE — Giant twisted trees on a hill, stone ring, fairy ring
import { ZONES } from '../WorldConfig.js';
import { PATH_ROUND, PETALS } from '../nature/NatureLibrary.js';

export function buildAncientGrove(ctx) {
  const Z = ZONES.grove;

  // Centre landmark — visible from the spawn meadow.
  ctx.place('TwistedTree_2', Z.x, Z.z, { scale: 1.3, rotY: 0.6, yOffset: -0.3, collider: 1.8, footprint: 6 });

  // Four companions on the slopes, away from the path coming from the south-west.
  const companions = [['TwistedTree_1', -0.3], ['TwistedTree_4', 1.0], ['TwistedTree_3', 3.5], ['TwistedTree_5', 4.6]];
  for (const [name, angle] of companions) {
    for (let tries = 0; tries < 6; tries++) {
      const a = angle + ctx.rand(-0.25, 0.25);
      const d = ctx.rand(13, 16);
      const x = Z.x + Math.cos(a) * d, z = Z.z + Math.sin(a) * d;
      if (!ctx.canPlace(x, z, 3)) continue;
      const s = ctx.rand(0.75, 0.95);
      ctx.place(name, x, z, { scale: s, yOffset: -0.3, collider: 1.3 * s, footprint: 5 });
      break;
    }
  }

  // Ring of round paving stones around the trunk.
  const ringStones = 18;
  for (let i = 0; i < ringStones; i++) {
    const a = (i / ringStones) * Math.PI * 2;
    ctx.place(ctx.pick(PATH_ROUND.slice(0, 3)), Z.x + Math.cos(a) * 5.4, Z.z + Math.sin(a) * 5.4, {
      rotY: -a, scale: ctx.rand(1.0, 1.2), yOffset: 0.01, collider: 0,
    });
  }

  // Fairy ring of mushrooms.
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + ctx.rand(-0.08, 0.08);
    const d = 8.5 + ctx.rand(-0.4, 0.4);
    ctx.place('Mushroom_Common', Z.x + Math.cos(a) * d, Z.z + Math.sin(a) * d, { scale: ctx.rand(0.9, 1.4), collider: 0 });
  }

  // Fallen petals, flowers and clover under the canopy.
  for (const [x, z] of ctx.scatter({ circle: { x: Z.x, z: Z.z, r: 16 }, count: 150, spacing: 0.8, accept: (x, z) => Math.hypot(x - Z.x, z - Z.z) > 3 })) {
    ctx.place(ctx.pick(PETALS), x, z, { scale: ctx.rand(0.8, 1.3), yOffset: 0.01 });
  }
  for (const [x, z] of ctx.scatter({
    circle: { x: Z.x, z: Z.z, r: 17 }, count: 18, spacing: 2.5,
    accept: (x, z) => Math.hypot(x - Z.x, z - Z.z) > 6.5 && ctx.canPlace(x, z, 0.5, { footprint: false }) && !ctx.colliders.overlaps(x, z, 0.6),
  })) {
    ctx.place('Flower_4_Group', x, z, { scale: ctx.rand(0.8, 1.2) });
  }
  for (const [x, z] of ctx.scatter({
    circle: { x: Z.x, z: Z.z, r: 18 }, count: 24, spacing: 2,
    accept: (x, z) => Math.hypot(x - Z.x, z - Z.z) > 6 && !ctx.colliders.overlaps(x, z, 0.4),
  })) {
    ctx.place(ctx.pick(['Clover_1', 'Clover_2']), x, z, { scale: ctx.rand(0.8, 1.2) });
  }
}
