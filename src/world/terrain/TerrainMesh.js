// ============================================================
// TERRAIN MESH — Vertex-coloured ground built from the Heightmap
// ============================================================
import * as THREE from 'three';
import { lerp, smoothstep } from '../../utils/Random.js';

const COL = {
  grassA: new THREE.Color('#92754d'),
  grassB: new THREE.Color('#b59a68'),
  forestA: new THREE.Color('#665638'),
  forestB: new THREE.Color('#8a7850'),
  grove: new THREE.Color('#978455'),
  autumnA: new THREE.Color('#a18147'),
  autumnB: new THREE.Color('#b18a50'),
  sandA: new THREE.Color('#e4c47f'),
  sandB: new THREE.Color('#d2a862'),
  border: new THREE.Color('#786443'),
  mud: new THREE.Color('#8f8050'),
  lakebed: new THREE.Color('#5d6a44'),
  pathA: new THREE.Color('#cba76c'),
  pathB: new THREE.Color('#b48f58'),
};

/** Builds the terrain mesh. Triangulation must match Heightmap._sampleGrid. */
export function createTerrainMesh(heightmap, bounds = null) {
  const { step, half, waterLevel } = heightmap;
  const res = bounds ? Math.round(bounds.size / step) + 1 : heightmap.res;
  const x0 = bounds ? bounds.x : -half, z0 = bounds ? bounds.z : -half;
  const count = res * res;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();
  const tmp = new THREE.Color();

  for (let iz = 0; iz < res; iz++) {
    for (let ix = 0; ix < res; ix++) {
      const i = iz * res + ix;
      const x = ix * step + x0;
      const z = iz * step + z0;
      const y = heightmap.getHeight(x, z);
      positions.set([x, y, z], i * 3);

      const b = heightmap.biome(x, z);
      const n = heightmap.noise.noise(x * 0.09, z * 0.09) * 0.5 + 0.5;
      c.copy(COL.grassA).lerp(COL.grassB, n);
      c.lerp(tmp.copy(COL.forestA).lerp(COL.forestB, n), b.forest);
      c.lerp(COL.grove, b.grove * 0.6);
      c.lerp(tmp.copy(COL.autumnA).lerp(COL.autumnB, n), b.autumn * 0.85);
      c.lerp(tmp.copy(COL.sandA).lerp(COL.sandB, n), b.sand);
      c.lerp(COL.border, b.border * 0.7);
      // Pond banks turn to mud, deeper parts to a dark lake bed.
      const wet = (1 - smoothstep(waterLevel, waterLevel + 0.6, y)) * b.shore;
      c.lerp(COL.mud, wet);
      c.lerp(COL.lakebed, (1 - smoothstep(waterLevel - 0.8, waterLevel, y)) * b.shore);
      c.lerp(tmp.copy(COL.pathA).lerp(COL.pathB, n), b.path * lerp(1, 0.55, b.sand));

      // Fine per-vertex grain keeps large areas from looking flat.
      const grain = 1 + heightmap.detail.noise(x * 0.9, z * 0.9) * 0.06;
      colors.set([c.r * grain, c.g * grain, c.b * grain], i * 3);
    }
  }

  const indices = new Uint32Array((res - 1) * (res - 1) * 6);
  let k = 0;
  for (let iz = 0; iz < res - 1; iz++) {
    for (let ix = 0; ix < res - 1; ix++) {
      const a = iz * res + ix;
      const b = (iz + 1) * res + ix;
      const cc = (iz + 1) * res + ix + 1;
      const d = iz * res + ix + 1;
      indices.set([a, b, d, b, cc, d], k);
      k += 6;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Terrain';
  mesh.receiveShadow = true;
  return mesh;
}
