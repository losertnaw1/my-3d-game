// ============================================================
// NATURE LIBRARY — Loads Stylized Nature MegaKit glTF models once
// ============================================================
// - Extracts geometry + material per primitive (for instancing)
// - Deduplicates identical materials across files (one texture upload)
// - Provides material variants: grass colours, autumn leaves, desert rocks
// - Adds a lightweight wind sway to foliage via onBeforeCompile
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const NATURE_BASE = '/models/Stylized Nature MegaKit/glTF/';

const range = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}_${i + 1}`);

export const TREE_COMMON = range('CommonTree', 5);
export const TREE_PINE = range('Pine', 5);
export const TREE_TWISTED = range('TwistedTree', 5);
export const TREE_DEAD = range('DeadTree', 5);
export const ROCKS = range('Rock_Medium', 3);
export const PEBBLES_ROUND = range('Pebble_Round', 5);
export const PEBBLES_SQUARE = range('Pebble_Square', 6);
export const PETALS = range('Petal', 5);
export const GRASS = ['Grass_Common_Short', 'Grass_Common_Tall', 'Grass_Wispy_Short', 'Grass_Wispy_Tall'];
export const FLOWERS = ['Flower_3_Group', 'Flower_3_Single', 'Flower_4_Group', 'Flower_4_Single'];
export const PATH_ROUND = ['RockPath_Round_Small_1', 'RockPath_Round_Small_2', 'RockPath_Round_Small_3', 'RockPath_Round_Thin', 'RockPath_Round_Wide'];
export const PATH_SQUARE = ['RockPath_Square_Small_1', 'RockPath_Square_Small_2', 'RockPath_Square_Small_3', 'RockPath_Square_Thin', 'RockPath_Square_Wide'];

export const MODEL_NAMES = [
  ...TREE_COMMON, ...TREE_PINE, ...TREE_TWISTED, ...TREE_DEAD, ...ROCKS,
  ...PEBBLES_ROUND, ...PEBBLES_SQUARE, ...PETALS, ...GRASS, ...FLOWERS,
  ...PATH_ROUND, ...PATH_SQUARE,
  'Bush_Common', 'Bush_Common_Flowers', 'Clover_1', 'Clover_2', 'Fern_1',
  'Mushroom_Common', 'Mushroom_Laetiporus',
  'Plant_1', 'Plant_1_Big', 'Plant_7', 'Plant_7_Big',
];

/** Shadow casting + collision radius (at scale 1) per model. */
export function modelInfo(name) {
  if (name.startsWith('CommonTree')) return { shadow: true, collider: 0.4 };
  if (name.startsWith('Pine')) return { shadow: true, collider: 0.45 };
  if (name.startsWith('TwistedTree')) return { shadow: true, collider: 1.3 };
  if (name.startsWith('DeadTree')) return { shadow: true, collider: 0.45 };
  if (name.startsWith('Rock_Medium')) return { shadow: true, collider: 1.3 };
  if (name.startsWith('Bush')) return { shadow: true, collider: 0.6 };
  if (name === 'Plant_1_Big' || name === 'Mushroom_Laetiporus') return { shadow: true, collider: 0 };
  return { shadow: false, collider: 0 };
}

// Grass.png is a palette of 4 vertical colour strips, 28 px each on 512 px.
const STRIP_W = 28 / 512;
const GRASS_STRIPS = { yellow: 0, green: 1, orange: 2, light: 3 };
const AUTUMN_TINTS = {
  orange: new THREE.Color('#ee7b2a'),
  red: new THREE.Color('#dc4630'),
  yellow: new THREE.Color('#f0b935'),
};

function windFor(materialName) {
  if (materialName === 'Grass') return { strength: 0.09, power: 2 };
  if (materialName === 'Flowers' || materialName === 'Leaves') return { strength: 0.05, power: 2 };
  if (/^Lea/.test(materialName)) return { strength: 0.018, power: 1 };
  return null;
}

const WIND_GLSL = /* glsl */ `
#ifdef USE_INSTANCING
  vec3 wOrigin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
#else
  vec3 wOrigin = vec3(modelMatrix[3][0], modelMatrix[3][1], modelMatrix[3][2]);
#endif
  float wH = pow(max(position.y, 0.0), uWind.y);
  float wPhase = uTime * 1.6 + wOrigin.x * 0.35 + wOrigin.z * 0.27;
  float wSway = (sin(wPhase) * 0.65 + sin(wPhase * 2.3 + position.x * 1.7) * 0.25) * uWind.x * wH;
  transformed.x += wSway;
  transformed.z += wSway * 0.6;
`;

export class NatureLibrary {
  constructor(basePath = NATURE_BASE) {
    this.basePath = basePath;
    THREE.Cache.enabled = true; // shared PNGs are fetched only once
    this.loader = new GLTFLoader();
    this.models = new Map();
    this.uniforms = { uTime: { value: 0 } };
    this._materials = new Map(); // dedupe key → material
    this._variants = new Map();
    this.desertMap = null;
  }

  async load(names = MODEL_NAMES, onProgress) {
    let done = 0;
    const desert = new THREE.TextureLoader()
      .loadAsync(encodeURI(`${this.basePath}Rocks_Desert_Diffuse.png`))
      .then((tex) => {
        tex.flipY = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        this.desertMap = tex;
      })
      .catch((err) => console.warn('[NatureLibrary] desert rock texture missing', err));

    await Promise.all(names.map(async (name) => {
      try {
        const gltf = await this.loader.loadAsync(encodeURI(`${this.basePath}${name}.gltf`));
        this.models.set(name, this._extract(name, gltf.scene));
      } catch (err) {
        console.warn(`[NatureLibrary] failed to load ${name}`, err);
      }
      onProgress?.(++done / names.length);
    }));
    await desert;
    return this;
  }

  has(name) { return this.models.has(name); }
  get(name) { return this.models.get(name); }

  update(elapsed) {
    this.uniforms.uTime.value = elapsed;
  }

  /** Material for a model part, optionally in a colour variant. */
  getMaterial(part, variant = 'default') {
    const base = part.material;
    if (!variant || variant === 'default') return base;
    const [kind, arg] = variant.split(':');
    const name = base.name;
    let key = null;
    let make = null;

    if (kind === 'grass' && name === 'Grass' && arg in GRASS_STRIPS && base.map) {
      key = `${base.uuid}|grass:${arg}|${part.grassStrip}`;
      make = () => {
        const m = base.clone();
        m.map = base.map.clone();
        m.map.offset.x = (GRASS_STRIPS[arg] - part.grassStrip) * STRIP_W;
        this._patch(m, { wind: windFor(name) });
        return m;
      };
    } else if (kind === 'autumn' && /^Lea/.test(name) && AUTUMN_TINTS[arg]) {
      key = `${base.uuid}|autumn:${arg}`;
      make = () => {
        const m = base.clone();
        this._patch(m, { wind: windFor(name), tint: AUTUMN_TINTS[arg] });
        return m;
      };
    } else if (kind === 'desert' && name === 'Rocks' && this.desertMap) {
      key = `${base.uuid}|desert`;
      make = () => {
        const m = base.clone();
        m.map = this.desertMap;
        return m;
      };
    }
    if (!key) return base;
    if (!this._variants.has(key)) this._variants.set(key, make());
    return this._variants.get(key);
  }

  // ── Internals ───────────────────────────────────────────────

  _extract(name, root) {
    root.updateMatrixWorld(true);
    const parts = [];
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      const geometry = obj.geometry.clone();
      geometry.applyMatrix4(obj.matrixWorld);
      geometry.computeBoundingSphere();
      const material = this._dedupe(obj.material);
      const part = { geometry, material, grassStrip: 1 };
      if (material.name === 'Grass' && geometry.attributes.uv) {
        const uv = geometry.attributes.uv;
        let sum = 0;
        for (let i = 0; i < uv.count; i++) sum += uv.getX(i);
        part.grassStrip = Math.min(3, Math.max(0, Math.floor((sum / uv.count) / STRIP_W)));
      }
      parts.push(part);
    });
    const box = new THREE.Box3();
    parts.forEach((p) => { p.geometry.computeBoundingBox(); box.union(p.geometry.boundingBox); });
    return { name, parts, box };
  }

  _dedupe(material) {
    const key = [material.name, material.map?.name, material.normalMap?.name, material.vertexColors].join('|');
    if (!this._materials.has(key)) {
      if (material.name === 'Rocks' || material.name === 'PathRocks') material.roughness = 1;
      this._patch(material, { wind: windFor(material.name) });
      this._materials.set(key, material);
    }
    return this._materials.get(key);
  }

  _patch(material, { wind = null, tint = null }) {
    if (!wind && !tint) return;
    const uniforms = this.uniforms;
    material.onBeforeCompile = (shader) => {
      if (wind) {
        shader.uniforms.uTime = uniforms.uTime;
        shader.uniforms.uWind = { value: new THREE.Vector2(wind.strength, wind.power) };
        const fade = material.name === 'Grass' || material.name === 'Flowers' ? '\ntransformed *= 1.0 - smoothstep(16.0, 27.0, distance(wOrigin.xz, cameraPosition.xz));' : '';
        shader.vertexShader = `uniform float uTime;\nuniform vec2 uWind;\n${shader.vertexShader}`
          .replace('#include <begin_vertex>', `#include <begin_vertex>\n${WIND_GLSL}${fade}`);
      }
      if (tint) {
        shader.uniforms.uAutumnTint = { value: tint };
        shader.fragmentShader = `uniform vec3 uAutumnTint;\n${shader.fragmentShader}`
          .replace('#include <map_fragment>', `#include <map_fragment>
  float aLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  diffuseColor.rgb = uAutumnTint * (0.45 + aLum * 1.9);`);
      }
    };
    material.customProgramCacheKey = () => `nature|${material.name}|${wind ? 'wind' : ''}|${tint ? 'tint' : ''}`;
    material.needsUpdate = true;
  }
}
