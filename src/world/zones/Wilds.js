// WILDS — Filler between zones: lone trees, rocks, bushes, pebbles along paths
import { WORLD, ZONES, SPAWN } from '../WorldConfig.js';
import { TREE_COMMON, TREE_PINE, ROCKS, PEBBLES_ROUND, PEBBLES_SQUARE } from '../nature/NatureLibrary.js';

export function buildWilds(ctx) {
  const Z = ZONES;
  const dist = (x, z, zone) => Math.hypot(x - zone.x, z - zone.z);
  const open = (x, z) => {
    const b = ctx.hm.biome(x, z);
    return b.sand < 0.3 && b.flowers < 0.5 && b.autumn < 0.5 && b.forest < 0.6
      && dist(x, z, Z.meadow) > 12 && dist(x, z, Z.pond) > Z.pond.r + 4
      && dist(x, z, Z.grove) > 19 && Math.hypot(x - SPAWN.x, z - SPAWN.z) > 7;
  };

  for (const [x, z] of ctx.scatter({
    circle: { x: 0, z: 0, r: WORLD.playRadius - 8 }, count: 1700, spacing: 6.5,
    accept: (x, z) => open(x, z) && ctx.canPlace(x, z, 2.5, { inside: true }),
  })) {
    const pine = z < -20 ? ctx.chance(0.6) : ctx.chance(0.2);
    ctx.place(pine ? ctx.pick(TREE_PINE) : ctx.pick(TREE_COMMON), x, z, {
      scale: ctx.rand(0.9, 1.35), yOffset: -0.15, footprint: 2.5, color: ctx.shade(),
    });
  }

  for (const [x, z] of ctx.scatter({
    circle: { x: 0, z: 0, r: WORLD.playRadius - 6 }, count: 120, spacing: 8,
    accept: (x, z) => ctx.canPlace(x, z, 1.5, { inside: true }) && Math.hypot(x - SPAWN.x, z - SPAWN.z) > 6,
  })) {
    const s = ctx.rand(0.4, 1.3);
    const desert = ctx.hm.biome(x, z).sand > 0.5;
    ctx.place(ctx.pick(ROCKS), x, z, { variant: desert ? 'desert' : 'default', scale: s, yOffset: -0.25 * s, footprint: 1.3 * s });
  }

  for (const [x, z] of ctx.scatter({
    circle: { x: 0, z: 0, r: WORLD.playRadius - 6 }, count: 45, spacing: 6,
    accept: (x, z) => ctx.hm.biome(x, z).sand < 0.3 && ctx.canPlace(x, z, 0.9, { inside: true }),
  })) {
    ctx.place(ctx.pick(['Bush_Common', 'Bush_Common_Flowers']), x, z, { scale: ctx.rand(0.8, 1.3), color: ctx.shade() });
  }

}
