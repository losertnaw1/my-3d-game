import { PEBBLES_ROUND, PEBBLES_SQUARE, PATH_ROUND, PATH_SQUARE } from '../nature/NatureLibrary.js';

// Equal arc-length rows follow the path tangent, with narrow earth joints.
export function pathRows(points, spacing = 0.85) {
  const rows = [];
  let next = spacing / 2, travelled = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1], [bx, bz] = points[i];
    const length = Math.hypot(bx - ax, bz - az);
    if (!length) continue;
    while (next <= travelled + length) {
      const t = (next - travelled) / length;
      rows.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, nx: -(bz - az) / length, nz: (bx - ax) / length, yaw: Math.atan2(bx - ax, bz - az) });
      next += spacing;
    }
    travelled += length;
  }
  return rows;
}
export function buildPaths(ctx) {
  const occupied = [];
  const stones = [...PEBBLES_ROUND, ...PEBBLES_SQUARE, ...PATH_ROUND.slice(0, 3), ...PATH_SQUARE.slice(0, 3)];
  for (const path of ctx.hm.paths) {
    const columns = 2;
    const lane = 0.64;
    for (const row of pathRows(path.points, 0.76)) {
      for (let col = 0; col < columns; col++) {
        const name = ctx.pick(stones);
        const box = ctx.placer.library.get(name).box;
        const width = box.max.x - box.min.x, depth = box.max.z - box.min.z;
        const offset = (col - 0.5) * lane + ctx.rand(-0.07, 0.07);
        const stagger = (col === 0 ? -0.1 : 0.1) + ctx.rand(-0.06, 0.06);
        const x = row.x + row.nx * offset + Math.sin(row.yaw) * stagger;
        const z = row.z + row.nz * offset + Math.cos(row.yaw) * stagger;
        if (occupied.some(p => Math.hypot(p.x - x, p.z - z) < 0.47) || ctx.hm.isUnderwater(x, z, 0.08)) continue;
        occupied.push({ x, z });
        const forwardX = Math.sin(row.yaw), forwardZ = Math.cos(row.yaw);
        const along = ctx.hm.getHeight(x + forwardX * 0.4, z + forwardZ * 0.4) - ctx.hm.getHeight(x - forwardX * 0.4, z - forwardZ * 0.4);
        const across = ctx.hm.getHeight(x - row.nx * 0.4, z - row.nz * 0.4) - ctx.hm.getHeight(x + row.nx * 0.4, z + row.nz * 0.4);
        ctx.place(name, x, z, { scale: [lane * ctx.rand(0.83, 1.03) / width, 0.18, ctx.rand(0.56, 0.72) / depth], rotY: row.yaw + ctx.rand(-0.22, 0.22), color: ctx.shade(0.88, 1.12, 0.015), tiltX: -Math.atan2(along, 0.8), tiltZ: Math.atan2(across, 0.8), yOffset: 0.025 - box.min.y * 0.18, collider: 0 });
      }
    }
  }
}
