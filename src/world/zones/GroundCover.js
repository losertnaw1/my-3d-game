// Generated per loaded tile; the seed makes revisits identical.
import { WORLD } from '../WorldConfig.js';
export function buildGroundCover(ctx, bounds) {
  const step = WORLD.grassSpacing;
  for (let z0 = bounds.z; z0 < bounds.z + bounds.size; z0 += step) {
    for (let x0 = bounds.x; x0 < bounds.x + bounds.size; x0 += step) {
      const x = x0 + ctx.rand(0.04, step - 0.04), z = z0 + ctx.rand(0.04, step - 0.04);
      if (Math.hypot(x, z) > WORLD.playRadius + 6 || !ctx.canPlace(x, z, 0, { footprint: false, path: false }) || ctx.hm.getClear(x, z) > 0.92 || ctx.colliders.overlaps(x, z, 0.12)) continue;
      const b = ctx.hm.biome(x, z);
      const patch = ctx.hm.noise.noise(x * 0.13 + 50, z * 0.13);
      if (ctx.rng() > (b.sand > 0.5 ? 0.28 : patch > -0.35 ? 1.0 : 0.96)) continue;
      const variant = b.sand > 0.5 ? 'grass:yellow' : b.autumn > 0.5 ? 'grass:orange' : 'grass:green';
      // Common_Short is the lightest mesh. Three overlapping, wide low tufts form a bushy carpet.
      for (let i = 0; i < 3; i++) {
        const gx = x + ctx.rand(-0.16, 0.16), gz = z + ctx.rand(-0.16, 0.16);
        if (ctx.hm.getClear(gx, gz) > 0.92 || ctx.hm.isUnderwater(gx, gz, 0.08) || ctx.colliders.overlaps(gx, gz, 0.08)) continue;
        ctx.place('Grass_Common_Short', gx, gz, { variant, scale: [ctx.rand(2.0, 2.7), ctx.rand(0.6, 0.95), ctx.rand(2.0, 2.7)], collider: 0, color: ctx.shade(0.96, 1.18) });
      }
      const flowers = ctx.hm.detail.noise(x * 0.16 + 70, z * 0.16);
      if (b.sand < 0.2 && flowers > (b.flowers > 0.3 ? -0.1 : 0.32) && ctx.chance(b.flowers > 0.3 ? 0.2 : 0.055)) {
        const name = flowers > 0.26 ? 'Flower_3_Single' : 'Flower_4_Single';
        ctx.place(name, x, z, { scale: ctx.rand(0.85, 1.3), collider: 0 });
      }
    }
  }
}
