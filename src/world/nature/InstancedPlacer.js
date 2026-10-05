// ============================================================
// INSTANCED PLACER — Batches placements into InstancedMeshes
// ============================================================
// Placements are grouped by (model, variant, chunk). One chunk per
// `chunkSize` metres lets the renderer frustum-cull whole patches.
import * as THREE from 'three';
import { modelInfo } from './NatureLibrary.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

export class InstancedPlacer {
  constructor(library, { chunkSize = 55 } = {}) {
    this.library = library;
    this.chunkSize = chunkSize;
    this.batches = new Map();
    this.count = 0;
  }

  /**
   * @param {string} name     model name
   * @param {string} variant  material variant ('default', 'grass:yellow', ...)
   * @param {object} t        { x, y, z, rotY, scale, tiltX, tiltZ, color }
   */
  add(name, variant, t) {
    if (!this.library.has(name)) return false;
    const cx = Math.floor(t.x / this.chunkSize);
    const cz = Math.floor(t.z / this.chunkSize);
    const key = `${name}|${variant}|${cx}|${cz}`;
    if (!this.batches.has(key)) this.batches.set(key, { name, variant, cx, cz, items: [] });

    const s = t.scale ?? 1;
    _e.set(t.tiltX ?? 0, t.rotY ?? 0, t.tiltZ ?? 0, 'YXZ');
    _q.setFromEuler(_e);
    _p.set(t.x, t.y, t.z);
    if (Array.isArray(s)) _s.set(s[0], s[1], s[2]); else _s.setScalar(s);
    this.batches.get(key).items.push({ matrix: _m.compose(_p, _q, _s).clone(), color: t.color ?? null });
    this.count++;
    return true;
  }

  build(parent, batches = this.batches.values()) {
    const group = new THREE.Group();
    group.name = 'Nature';
    let meshes = 0;
    for (const { name, variant, items } of batches) {
      const model = this.library.get(name);
      const info = modelInfo(name);
      for (const part of model.parts) {
        const mesh = new THREE.InstancedMesh(part.geometry, this.library.getMaterial(part, variant), items.length);
        mesh.name = `${name}:${variant}`;
        items.forEach((it, i) => {
          mesh.setMatrixAt(i, it.matrix);
          if (it.color) mesh.setColorAt(i, it.color);
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.castShadow = info.shadow;
        mesh.receiveShadow = true;
        mesh.computeBoundingSphere();
        group.add(mesh);
        meshes++;
      }
    }
    parent.add(group);
    return { group, meshes, instances: group.children.reduce((n, m) => n + m.count, 0) };
  }
}
