// ============================================================
// LIGHT SYSTEM — Hemisphere fill + one shadow-casting key light
// ============================================================
// The key light is the sun by day and the moon by night. Its shadow
// frustum follows the player so shadows stay sharp everywhere.
import * as THREE from 'three';

export class LightSystem {
  constructor(scene) {
    this.scene = scene;
    this.hemi = null;
    this.key = null;
    this.fogDensity = 0.0072;
  }

  build() {
    this.hemi = new THREE.HemisphereLight('#d6edff', '#70903c', 1);
    this.scene.add(this.hemi);

    this.ambient = new THREE.AmbientLight('#ffffff', 0.12);
    this.scene.add(this.ambient);

    this.key = new THREE.DirectionalLight('#fff2da', 2.7);
    this.key.castShadow = true;
    const sh = this.key.shadow;
    sh.mapSize.set(1024, 1024);
    sh.camera.near = 1;
    sh.camera.far = 260;
    sh.camera.left = -36;
    sh.camera.right = 36;
    sh.camera.top = 36;
    sh.camera.bottom = -36;
    sh.bias = -0.0004;
    sh.normalBias = 0.04;
    this.scene.add(this.key);
    this.scene.add(this.key.target);

    this.scene.fog = new THREE.Fog('#c3e2f0', 10, 28);
  }

  /**
   * @param {object} state  DayNightCycle.state
   * @param {THREE.Vector3} focus  point the shadow frustum centres on (player)
   */
  update(state, focus) {
    this.hemi.color.copy(state.hemiSky);
    this.hemi.groundColor.copy(state.hemiGround);
    this.hemi.intensity = state.hemiIntensity;

    this.key.color.copy(state.keyColor);
    this.key.intensity = state.keyIntensity;
    // Snap to a coarse grid to avoid shadow shimmering while walking.
    const fx = Math.round(focus.x / 2) * 2;
    const fz = Math.round(focus.z / 2) * 2;
    this.key.target.position.set(fx, 0, fz);
    this.key.position.set(fx, 0, fz).addScaledVector(state.keyDir, 120);
    this.key.castShadow = state.keyIntensity > 0.02;

    this.scene.fog.color.copy(state.fog);
  }
}
