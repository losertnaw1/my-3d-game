// ============================================================
// FIREFLIES — Glowing particles that appear at night
// ============================================================
import * as THREE from 'three';
import { mulberry32 } from '../utils/Random.js';

function glowTexture() {
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2);
      const a = Math.max(0, 1 - d) ** 2;
      const i = (y * size + x) * 4;
      data.set([255, 255, 255, a * 255], i);
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  return tex;
}

export class Fireflies {
  /**
   * @param {THREE.Scene} scene
   * @param {Array<{x:number,z:number,r:number,count:number}>} areas
   * @param {(x:number,z:number)=>number} heightAt
   */
  constructor(scene, areas, heightAt) {
    const rng = mulberry32(99);
    const seeds = [];
    for (const area of areas) {
      for (let i = 0; i < area.count; i++) {
        const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * area.r;
        const x = area.x + Math.cos(a) * d, z = area.z + Math.sin(a) * d;
        seeds.push({ x, z, y: Math.max(heightAt(x, z), -0.3) + 0.6 + rng() * 2, p: rng() * 100, s: 0.4 + rng() * 0.6 });
      }
    }
    this.seeds = seeds;
    this.positions = new Float32Array(seeds.length * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.material = new THREE.PointsMaterial({
      color: '#d8ff7a',
      size: 0.35,
      map: glowTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.points = new THREE.Points(geometry, this.material);
    this.points.name = 'Fireflies';
    this.points.frustumCulled = false;
    this.points.visible = false;
    scene.add(this.points);
  }

  update(elapsed, night) {
    this.material.opacity = night;
    this.points.visible = night > 0.02;
    if (!this.points.visible) return;
    this.seeds.forEach((f, i) => {
      const t = elapsed * f.s + f.p;
      this.positions[i * 3] = f.x + Math.sin(t * 0.7) * 1.5;
      this.positions[i * 3 + 1] = f.y + Math.sin(t * 1.3) * 0.4;
      this.positions[i * 3 + 2] = f.z + Math.cos(t * 0.5) * 1.5;
    });
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
