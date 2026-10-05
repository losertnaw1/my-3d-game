// ============================================================
// DAY / NIGHT CYCLE — Time of day → sun direction + colour palette
// ============================================================
import * as THREE from 'three';
import { smoothstep } from '../utils/Random.js';

// Palette keyframes ordered by sun elevation (sunDir.y).
const KEYS = [
  { e: -0.35, top: '#040816', horizon: '#0e1a34', fog: '#0c1528', hemiSky: '#2a3a6a', hemiGround: '#0c140e', hemi: 0.38 },
  { e: -0.08, top: '#17244c', horizon: '#3e4b7c', fog: '#313d60', hemiSky: '#3d4c7c', hemiGround: '#1a2418', hemi: 0.45 },
  { e: 0.04, top: '#3e5f9e', horizon: '#ffa266', fog: '#e8a882', hemiSky: '#ffc9a2', hemiGround: '#4c5c2c', hemi: 0.7 },
  { e: 0.22, top: '#4d98e0', horizon: '#ffe0b6', fog: '#d8e6e6', hemiSky: '#d0e8ff', hemiGround: '#6b8a3a', hemi: 0.95 },
  { e: 0.6, top: '#3a8ade', horizon: '#bfe4f7', fog: '#c3e2f0', hemiSky: '#d6edff', hemiGround: '#70903c', hemi: 1.05 },
].map((k) => ({
  ...k,
  top: new THREE.Color(k.top),
  horizon: new THREE.Color(k.horizon),
  fog: new THREE.Color(k.fog),
  hemiSky: new THREE.Color(k.hemiSky),
  hemiGround: new THREE.Color(k.hemiGround),
}));

const SUN_LOW = new THREE.Color('#ffa565');
const SUN_HIGH = new THREE.Color('#fff2da');
const MOON = new THREE.Color('#9fb6ff');

export class DayNightCycle {
  /**
   * @param {object} o
   *   o.dayLength  real seconds for a full 24h day (default 480 = 8 min)
   *   o.startHour  starting time of day (default 9)
   */
  constructor({ dayLength = 480, startHour = 9 } = {}) {
    this.dayLength = dayLength;
    this.hour = startHour;
    this.speed = 1;
    this.state = {
      hour: startHour,
      sunDir: new THREE.Vector3(),
      elevation: 0,
      night: 0,
      top: new THREE.Color(),
      horizon: new THREE.Color(),
      fog: new THREE.Color(),
      hemiSky: new THREE.Color(),
      hemiGround: new THREE.Color(),
      hemiIntensity: 1,
      keyDir: new THREE.Vector3(),
      keyColor: new THREE.Color(),
      keyIntensity: 1,
      sunVisible: 1,
    };
    this._compute();
  }

  update(delta) {
    this.hour = (this.hour + (delta * this.speed * 24) / this.dayLength) % 24;
    if (this.hour < 0) this.hour += 24;
    this._compute();
    return this.state;
  }

  setHour(hour) {
    this.hour = ((hour % 24) + 24) % 24;
    this._compute();
  }

  get clock() {
    const h = Math.floor(this.hour);
    const m = Math.floor((this.hour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  _compute() {
    const s = this.state;
    s.hour = this.hour;
    // 06:00 sunrise in the east (+X), 12:00 zenith, 18:00 sunset in the west.
    const theta = ((this.hour - 6) / 12) * Math.PI;
    s.sunDir.set(Math.cos(theta), Math.sin(theta), 0.35).normalize();
    const e = s.sunDir.y;
    s.elevation = e;
    s.night = smoothstep(0.05, -0.2, e);

    // Interpolate palette.
    let i = 0;
    while (i < KEYS.length - 2 && e > KEYS[i + 1].e) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const t = smoothstep(a.e, b.e, e);
    for (const k of ['top', 'horizon', 'fog', 'hemiSky', 'hemiGround']) s[k].copy(a[k]).lerp(b[k], t);
    s.hemiIntensity = a.hemi + (b.hemi - a.hemi) * t;

    // One shadow-casting key light: the sun by day, the moon by night.
    if (e > -0.02) {
      s.keyDir.copy(s.sunDir);
      s.keyColor.copy(SUN_LOW).lerp(SUN_HIGH, smoothstep(0.02, 0.35, e));
      s.keyIntensity = 2.7 * smoothstep(-0.02, 0.18, e);
    } else {
      s.keyDir.copy(s.sunDir).negate();
      s.keyColor.copy(MOON);
      s.keyIntensity = 0.55 * smoothstep(-0.02, -0.2, e);
    }
    s.sunVisible = smoothstep(-0.1, 0.02, e);
  }
}
