// ============================================================
// WATER — Pond surface with scrolling procedural ripples
// ============================================================
import * as THREE from 'three';

/** Tileable ripple normal map generated from integer-frequency sines (no DOM needed). */
function createRippleNormalMap(size = 128) {
  const waves = [
    [3, 1, 0.0], [1, 4, 1.7], [5, -2, 3.1], [-2, 6, 4.4], [7, 3, 2.2],
  ];
  const height = (u, v) => waves.reduce(
    (s, [kx, kz, p], i) => s + Math.sin(Math.PI * 2 * (kx * u + kz * v) + p) / (i + 1), 0,
  );
  const data = new Uint8Array(size * size * 4);
  const e = 1 / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const dx = (height(u + e, v) - height(u - e, v)) * 0.6;
      const dz = (height(u, v + e) - height(u, v - e)) * 0.6;
      const len = Math.hypot(dx, dz, 1);
      const i = (y * size + x) * 4;
      data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      data[i + 1] = ((-dz / len) * 0.5 + 0.5) * 255;
      data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

export class Water {
  constructor(scene, { x, z, radius, level }) {
    this.normalMap = createRippleNormalMap();
    this.normalMap.repeat.set(radius / 4, radius / 4);
    const material = new THREE.MeshStandardMaterial({
      color: '#3e9fc2',
      transparent: true,
      opacity: 0.8,
      roughness: 0.08,
      metalness: 0.1,
      normalMap: this.normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
    });
    const geometry = new THREE.CircleGeometry(radius, 48);
    geometry.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'PondWater';
    this.mesh.position.set(x, level, z);
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }

  update(elapsed) {
    this.normalMap.offset.set(elapsed * 0.012, elapsed * 0.007);
  }
}
