// ============================================================
// SCATTER — Poisson-disc-like point sampling with masks
// ============================================================

/**
 * Dart-throwing Poisson sampling inside a circle, ellipse or rectangle.
 *
 * @param {Function} rng
 * @param {object} o
 *   o.circle  {x, z, r}            or
 *   o.ellipse {x, z, rx, rz}       or
 *   o.rect    {x0, z0, x1, z1}
 *   o.count    max points
 *   o.spacing  min distance between points
 *   o.accept   (x, z) => boolean   extra mask
 *   o.attempts tries per point (default 30)
 * @returns {Array<[number, number]>}
 */
export function scatter(rng, o) {
  const { count, spacing = 1, accept = () => true, attempts = 30 } = o;
  let sample;
  if (o.circle) {
    const { x, z, r } = o.circle;
    sample = () => {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * r;
      return [x + Math.cos(a) * d, z + Math.sin(a) * d];
    };
  } else if (o.ellipse) {
    const { x, z, rx, rz } = o.ellipse;
    sample = () => {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng());
      return [x + Math.cos(a) * d * rx, z + Math.sin(a) * d * rz];
    };
  } else {
    const { x0, z0, x1, z1 } = o.rect;
    sample = () => [x0 + rng() * (x1 - x0), z0 + rng() * (z1 - z0)];
  }

  const cell = spacing;
  const grid = new Map();
  const key = (cx, cz) => `${cx},${cz}`;
  const out = [];
  const tooClose = (x, z) => {
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const list = grid.get(key(cx + i, cz + j));
        if (!list) continue;
        for (const [px, pz] of list) {
          if ((px - x) ** 2 + (pz - z) ** 2 < spacing * spacing) return true;
        }
      }
    }
    return false;
  };

  const maxTries = count * attempts;
  for (let t = 0; t < maxTries && out.length < count; t++) {
    const [x, z] = sample();
    if (tooClose(x, z) || !accept(x, z)) continue;
    out.push([x, z]);
    const k = key(Math.floor(x / cell), Math.floor(z / cell));
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push([x, z]);
  }
  return out;
}
