// ============================================================
// MODEL EXTRACTOR — Tách và đặt nhiều bản sao của 1 mesh/node
// trong file GLB theo tên.
// ============================================================
//
// WORKFLOW:
//   1. Chạy analyzeModel() để biết tên các mesh trong file
//   2. Dùng ModelExtractor để tách từng phần và đặt vào scene
//
// VÍ DỤ:
//   import { ModelExtractor } from './utils/ModelExtractor.js';
//
//   const ex = new ModelExtractor('/models/forest_house.glb');
//   await ex.load();
//
//   // In ra tất cả tên mesh có trong model
//   ex.listParts();
//
//   // Đặt 1 bản sao tại vị trí cố định
//   const ground = ex.place('Ground_Tile', scene, {
//     position: [0, 0, 0], scale: 1
//   });
//
//   // Đặt nhiều bản sao (lặp lại) theo danh sách vị trí
//   ex.repeat('Ground_Tile', scene, [
//     { position: [0,  0,  0]  },
//     { position: [10, 0,  0]  },
//     { position: [0,  0, 10]  },
//     { position: [10, 0, 10]  },
//   ]);
//
//   // Lấy Group gộp chứa toàn bộ model gốc
//   const fullModel = ex.getRoot();
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export class ModelExtractor {
  /**
   * @param {string} path - '/models/forest_house.glb'
   */
  constructor(path) {
    this.path  = path;
    this._gltf = null;
    this._root = null;

    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    this._loader = new GLTFLoader();
    this._loader.setDRACOLoader(draco);
  }

  // ── Load ────────────────────────────────────────────────────

  async load() {
    if (this._gltf) return this; // đã load rồi

    this._gltf = await new Promise((resolve, reject) => {
      this._loader.load(this.path, resolve, undefined, reject);
    });
    this._root = this._gltf.scene;
    console.log(`[ModelExtractor] Loaded: ${this.path}`);
    return this;
  }

  // ── Inspect ─────────────────────────────────────────────────

  /**
   * In danh sách tất cả tên mesh/node ra console.
   * Gọi sau load() để biết tên để dùng trong place() / repeat().
   */
  listParts() {
    this._assertLoaded();
    const parts = [];
    this._root.traverse(obj => {
      parts.push({
        'Tên':  obj.name || '(unnamed)',
        'Loại': obj.type,
        'Mesh': obj.isMesh ? '✓' : '',
        'Children': obj.children.length,
      });
    });
    console.log(`[ModelExtractor] Cấu trúc của "${this.path}":`);
    console.table(parts);
  }

  /**
   * Lấy 1 node theo tên (bao gồm toàn bộ children của nó).
   * @param {string} name - tên mesh/node từ listParts()
   * @returns {THREE.Object3D|null}
   */
  getPart(name) {
    this._assertLoaded();
    const obj = this._root.getObjectByName(name);
    if (!obj) {
      console.warn(`[ModelExtractor] Không tìm thấy part: "${name}"`);
      return null;
    }
    return obj;
  }

  /**
   * Lấy toàn bộ root scene của model.
   * @returns {THREE.Group}
   */
  getRoot() {
    this._assertLoaded();
    return this._root.clone(true);
  }

  // ── Place ────────────────────────────────────────────────────

  /**
   * Clone 1 part và đặt vào scene tại vị trí chỉ định.
   *
   * @param {string} partName - tên node từ listParts()
   * @param {THREE.Scene|THREE.Group} scene
   * @param {object} opts
   *   opts.position  {[x,y,z]}     - default [0,0,0]
   *   opts.scale     {number|[x,y,z]} - default 1
   *   opts.rotation  {[x,y,z]}     - radian, default [0,0,0]
   *   opts.castShadow    {boolean} - default true
   *   opts.receiveShadow {boolean} - default true
   * @returns {THREE.Object3D|null}
   */
  place(partName, scene, opts = {}) {
    const part = this.getPart(partName);
    if (!part) return null;

    const clone = part.clone(true);
    this._applyOpts(clone, opts);
    scene.add(clone);
    return clone;
  }

  /**
   * Clone 1 part nhiều lần theo mảng vị trí.
   * Hiệu quả vì geometry/material được tái sử dụng qua clone.
   *
   * @param {string} partName
   * @param {THREE.Scene|THREE.Group} scene
   * @param {Array<object>} placements - mảng opts (position, scale, rotation)
   * @returns {THREE.Object3D[]}
   */
  repeat(partName, scene, placements = []) {
    const part = this.getPart(partName);
    if (!part) return [];

    return placements.map(opts => {
      const clone = part.clone(true);
      this._applyOpts(clone, opts);
      scene.add(clone);
      return clone;
    });
  }

  /**
   * Đặt toàn bộ model (full scene) tại 1 vị trí.
   * Dùng khi muốn đặt nguyên model không tách.
   *
   * @param {THREE.Scene|THREE.Group} scene
   * @param {object} opts
   * @returns {THREE.Group}
   */
  placeRoot(scene, opts = {}) {
    this._assertLoaded();
    const clone = this._root.clone(true);
    this._applyOpts(clone, opts);
    scene.add(clone);
    return clone;
  }

  // ── Helpers ─────────────────────────────────────────────────

  _applyOpts(obj, opts) {
    const {
      position      = [0, 0, 0],
      rotation,
      scale         = 1,
      castShadow    = true,
      receiveShadow = true,
    } = opts;

    if (Array.isArray(position)) {
      obj.position.set(...position);
    }

    // Chỉ ghi đè rotation nếu người dùng truyền vào rõ ràng dạng mảng [x, y, z] hoặc THREE.Euler.
    // Nếu không truyền, giữ nguyên rotation gốc từ model GLTF.
    if (Array.isArray(rotation)) {
      obj.rotation.set(...rotation);
    } else if (rotation && rotation.isEuler) {
      obj.rotation.copy(rotation);
    }

    if (Array.isArray(scale)) {
      obj.scale.set(...scale);
    } else {
      obj.scale.setScalar(scale);
    }

    obj.traverse(child => {
      if (child.isMesh) {
        child.castShadow    = castShadow;
        child.receiveShadow = receiveShadow;
      }
    });
  }

  _assertLoaded() {
    if (!this._gltf) {
      throw new Error('[ModelExtractor] Chưa gọi await load() trước.');
    }
  }
}
