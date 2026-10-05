// ============================================================
// COLLIDERS — Circle colliders on the XZ plane (spatial hash)
// ============================================================

export class Colliders {
  constructor(cellSize = 8) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.list = [];
  }

  _key(cx, cz) { return `${cx},${cz}`; }

  add(x, z, r) {
    const c = { x, z, r };
    this.list.push(c);
    const s = this.cellSize;
    for (let cx = Math.floor((x - r) / s); cx <= Math.floor((x + r) / s); cx++) {
      for (let cz = Math.floor((z - r) / s); cz <= Math.floor((z + r) / s); cz++) {
        const k = this._key(cx, cz);
        if (!this.cells.has(k)) this.cells.set(k, []);
        this.cells.get(k).push(c);
      }
    }
    return c;
  }

  /** Colliders whose circles may touch the circle (x, z, r). */
  query(x, z, r = 0) {
    const s = this.cellSize;
    const found = new Set();
    for (let cx = Math.floor((x - r) / s); cx <= Math.floor((x + r) / s); cx++) {
      for (let cz = Math.floor((z - r) / s); cz <= Math.floor((z + r) / s); cz++) {
        const cell = this.cells.get(this._key(cx, cz));
        if (cell) cell.forEach((c) => found.add(c));
      }
    }
    return found;
  }

  overlaps(x, z, r = 0) {
    for (const c of this.query(x, z, r)) {
      if (Math.hypot(x - c.x, z - c.z) < c.r + r) return true;
    }
    return false;
  }

  /**
   * Pushes `pos` (object with x, z) out of every overlapping collider.
   * Returns true when a collision happened. Sliding falls out naturally
   * because only the penetrating component is removed.
   */
  resolve(pos, radius) {
    let hit = false;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const c of this.query(pos.x, pos.z, radius)) {
        const dx = pos.x - c.x;
        const dz = pos.z - c.z;
        const min = c.r + radius;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min) continue;
        if (d2 === 0) {
          pos.x += min;
          moved = hit = true;
          continue;
        }
        const d = Math.sqrt(d2);
        const push = min - d;
        pos.x += (dx / d) * push;
        pos.z += (dz / d) * push;
        moved = hit = true;
      }
      if (!moved) break;
    }
    return hit;
  }
}
