// ============================================================
// SKY SYSTEM — Shader sky dome (gradient, sun, moon, stars) + clouds
// ============================================================
import * as THREE from 'three';
import { mulberry32 } from '../utils/Random.js';

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww; // always at the far plane
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSunVisible;
  uniform float uNight;
  uniform float uTime;
  varying vec3 vDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;
    vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.02, 0.65, h), 0.75));
    col = mix(col, uHorizon * 0.85, smoothstep(0.0, -0.3, h));

    // Sun disc + glow.
    float sd = max(dot(dir, uSunDir), 0.0);
    col += uSunColor * (smoothstep(0.9985, 0.9992, sd) * 4.0 + pow(sd, 10.0) * 0.35 + pow(sd, 120.0) * 0.6) * uSunVisible;

    // Moon opposite the sun.
    float md = max(dot(dir, -uSunDir), 0.0);
    col += vec3(0.9, 0.93, 1.0) * smoothstep(0.9994, 0.9997, md) * 1.5 * uNight;
    col += vec3(0.35, 0.45, 0.8) * pow(md, 30.0) * 0.18 * uNight;

    // Twinkling stars.
    vec3 cell = floor(dir * 260.0);
    float s = hash(cell);
    float star = step(0.9965, s) * smoothstep(0.02, 0.3, h);
    star *= 0.6 + 0.4 * sin(uTime * 2.0 + s * 300.0);
    col += vec3(star) * uNight;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class SkySystem {
  constructor(scene) {
    this.scene = scene;
    this.dome = null;
    this.clouds = [];
    this.cloudMaterial = null;
  }

  build() {
    this.uniforms = {
      uTop: { value: new THREE.Color('#3a8ade') },
      uHorizon: { value: new THREE.Color('#bfe4f7') },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color('#fff2da') },
      uSunVisible: { value: 1 },
      uNight: { value: 0 },
      uTime: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), material);
    this.dome.name = 'SkyDome';
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -1;
    this.scene.add(this.dome);
    this._buildClouds();
  }

  _buildClouds() {
    const rng = mulberry32(77);
    this.cloudMaterial = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#9fb4c8', emissiveIntensity: 0.35, fog: false });
    for (let i = 0; i < 16; i++) {
      const group = new THREE.Group();
      const blobs = 4 + Math.floor(rng() * 4);
      for (let b = 0; b < blobs; b++) {
        const r = 5 + rng() * 6;
        const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), this.cloudMaterial);
        blob.position.set((b - blobs / 2) * 6 + rng() * 4, rng() * 3, (rng() - 0.5) * 8);
        blob.scale.y = 0.6;
        group.add(blob);
      }
      const a = rng() * Math.PI * 2;
      const d = 140 + rng() * 120;
      group.position.set(Math.cos(a) * d, 70 + rng() * 40, Math.sin(a) * d);
      group.userData.speed = 0.6 + rng() * 0.8;
      this.clouds.push(group);
      this.scene.add(group);
    }
  }

  /** @param {object} state DayNightCycle.state */
  update(elapsed, delta, state, camera) {
    const u = this.uniforms;
    u.uTime.value = elapsed;
    u.uTop.value.copy(state.top);
    u.uHorizon.value.copy(state.horizon);
    u.uSunDir.value.copy(state.sunDir);
    u.uSunColor.value.copy(state.keyColor);
    u.uSunVisible.value = state.sunVisible;
    u.uNight.value = state.night;
    if (camera) this.dome.position.copy(camera.position);

    this.cloudMaterial.emissive.copy(state.horizon).multiplyScalar(0.5);
    for (const cloud of this.clouds) {
      cloud.position.x += cloud.userData.speed * delta;
      if (cloud.position.x > 260) cloud.position.x = -260;
    }
  }
}
