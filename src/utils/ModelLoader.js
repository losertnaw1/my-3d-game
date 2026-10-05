// ============================================================
// MODEL LOADER — Import GLTF / GLB 3D models vào scene
// ============================================================
//
// CÁCH DÙNG:
//   import { ModelLoader } from '../utils/ModelLoader.js';
//
//   const loader = new ModelLoader();
//
//   // Load 1 model:
//   const tree = await loader.load('/models/tree.glb', {
//     position: [10, 0, -5],
//     scale:    [2, 2, 2],
//     rotation: [0, Math.PI / 2, 0],
//   });
//   scene.add(tree);
//
//   // Đặt nhiều bản sao của cùng 1 model (dùng clone để tiết kiệm memory):
//   await loader.loadInstanced('/models/rock.glb', scene, [
//     { position: [5, 0, 3],   scale: 1.2 },
//     { position: [-8, 0, 10], scale: 0.8, rotation: [0, 1.5, 0] },
//   ]);
//
// FORMAT HỖ TRỢ:
//   - .glb  (khuyến nghị — binary, 1 file duy nhất)
//   - .gltf (text + textures riêng)
//
// ĐẶT FILE MODEL Ở ĐÂU:
//   → public/models/ten_model.glb
//   (Vite sẽ serve thư mục public/ ở root URL)
//
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export class ModelLoader {
  constructor() {
    // DRACO decoder giúp load model nén nhanh hơn nhiều
    this._draco = new DRACOLoader();
    this._draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

    this._gltf = new GLTFLoader();
    this._gltf.setDRACOLoader(this._draco);

    // Cache để không load lại cùng 1 file nhiều lần
    this._cache = new Map();
  }

  /**
   * Load 1 GLTF/GLB model, trả về Group đã được transform.
   *
   * @param {string} path - đường dẫn từ thư mục public/
   *   Ví dụ: '/models/fantasy_tree.glb'
   *
   * @param {object} opts - tuỳ chọn transform
   *   opts.position  {[x,y,z]}    - vị trí (default [0,0,0])
   *   opts.scale     {number|[x,y,z]} - tỉ lệ (default 1)
   *   opts.rotation  {[x,y,z]}    - góc xoay radian (default [0,0,0])
   *   opts.castShadow    {boolean} - default true
   *   opts.receiveShadow {boolean} - default true
   *
   * @returns {Promise<THREE.Group>}
   */
  async load(path, opts = {}) {
    const gltf = await this._loadRaw(path);
    const root = gltf.scene.clone(true);

    this._applyTransform(root, opts);
    this._applyMeshOptions(root, opts);

    return root;
  }

  /**
   * Giống load() nhưng bắt lỗi — trả về null nếu file không tồn tại.
   * Dùng khi muốn fallback về procedural thay vì crash.
   */
  async loadSafe(path, opts = {}) {
    try {
      return await this.load(path, opts);
    } catch {
      console.warn(
        `[ModelLoader] ⚠️ Bỏ qua model "${path}" — file chưa có trong public/models/\n` +
        `   → Copy file .glb vào: public/models/${path.split('/').pop()}`
      );
      return null;
    }
  }

  /**
   * Đặt nhiều bản sao của cùng 1 model vào scene.
   * Dùng clone() để tái sử dụng geometry/material → nhẹ hơn.
   *
   * @param {string} path
   * @param {THREE.Scene|THREE.Group} scene
   * @param {Array<object>} instances - mảng các opts (position, scale, rotation)
   */
  async loadInstanced(path, scene, instances = []) {
    let gltf;
    try {
      gltf = await this._loadRaw(path);
    } catch {
      console.warn(
        `[ModelLoader] ⚠️ Bỏ qua model "${path}" — file chưa có trong public/models/\n` +
        `   → Copy file .glb vào: public/models/${path.split('/').pop()}`
      );
      return; // bỏ qua, entity tự dùng fallback
    }
    const origin = gltf.scene;

    instances.forEach(opts => {
      const clone = origin.clone(true);
      this._applyTransform(clone, opts);
      this._applyMeshOptions(clone, opts);
      scene.add(clone);
    });
  }

  // ── Internals ───────────────────────────────────────────────

  _loadRaw(path) {
    if (this._cache.has(path)) {
      return Promise.resolve(this._cache.get(path));
    }
    return new Promise((resolve, reject) => {
      this._gltf.load(
        path,
        (gltf) => {
          this._cache.set(path, gltf);
          resolve(gltf);
        },
        undefined,
        (err) => {
          console.error(`[ModelLoader] Failed to load "${path}":`, err);
          reject(err);
        }
      );
    });
  }

  _applyTransform(obj, opts) {
    const { position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 } = opts;

    obj.position.set(...position);
    obj.rotation.set(...rotation);

    if (Array.isArray(scale)) {
      obj.scale.set(...scale);
    } else {
      obj.scale.setScalar(scale);
    }
  }

  _applyMeshOptions(obj, opts) {
    const castShadow    = opts.castShadow    ?? true;
    const receiveShadow = opts.receiveShadow ?? true;

    obj.traverse(child => {
      if (child.isMesh) {
        child.castShadow    = castShadow;
        child.receiveShadow = receiveShadow;
      }
    });
  }
}
