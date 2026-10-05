// ============================================================
// MODEL ANALYZER — Phân tích cấu trúc file GLB/GLTF
// ============================================================
//
// CÁCH DÙNG trong browser console:
//   import { analyzeModel } from './utils/ModelAnalyzer.js';
//   analyzeModel('/models/forest_house.glb');
//
// Hoặc gọi từ code:
//   const result = await analyzeModel('/models/forest_house.glb');
//   console.log(result);
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

/**
 * Phân tích cấu trúc của 1 file GLB/GLTF.
 * In ra toàn bộ nodes, meshes, materials và geometry info.
 *
 * @param {string} path - URL đến file .glb (ví dụ '/models/forest_house.glb')
 * @returns {Promise<ModelReport>}
 */
export async function analyzeModel(path) {
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  const gltf = await new Promise((resolve, reject) => {
    loader.load(path, resolve, undefined, reject);
  });

  const report = _buildReport(path, gltf);
  _printReport(report);
  return report;
}

// ── Build report object ──────────────────────────────────────

function _buildReport(path, gltf) {
  const nodes    = [];
  const meshes   = [];
  const materials = new Map();

  gltf.scene.traverse(obj => {
    const box    = new THREE.Box3().setFromObject(obj);
    const size   = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const node = {
      name:     obj.name || '(unnamed)',
      type:     obj.type,
      uuid:     obj.uuid,
      visible:  obj.visible,
      position: _v3(obj.position),
      rotation: _v3euler(obj.rotation),
      scale:    _v3(obj.scale),
      worldPos: _v3(obj.getWorldPosition(new THREE.Vector3())),
      children: obj.children.length,
      boundingBox: {
        size:   _v3(size),
        center: _v3(center),
      },
    };

    nodes.push(node);

    if (obj.isMesh) {
      const geo  = obj.geometry;
      const mat  = obj.material;

      const meshInfo = {
        ...node,
        geometry: {
          vertices:  geo.attributes.position?.count ?? 0,
          triangles: geo.index
            ? geo.index.count / 3
            : (geo.attributes.position?.count ?? 0) / 3,
          hasUV:     !!geo.attributes.uv,
          hasNormals: !!geo.attributes.normal,
        },
        material: _matInfo(mat),
      };

      meshes.push(meshInfo);

      // Collect unique materials
      const mats = Array.isArray(mat) ? mat : [mat];
      mats.forEach(m => {
        if (m && !materials.has(m.name)) {
          materials.set(m.name || m.uuid, _matInfo(m));
        }
      });
    }
  });

  return {
    file:      path,
    nodeCount: nodes.length,
    meshCount: meshes.length,
    matCount:  materials.size,
    animations: gltf.animations.map(a => ({
      name:     a.name,
      duration: a.duration.toFixed(2) + 's',
      tracks:   a.tracks.length,
    })),
    nodes,
    meshes,
    materials: Object.fromEntries(materials),
    // Convenience: names list for copy-paste
    meshNames: meshes.map(m => m.name),
  };
}

// ── Pretty print to console ──────────────────────────────────

function _printReport(report) {
  const sep = '─'.repeat(60);

  console.log(`\n%c${sep}`, 'color: #4a9e4a');
  console.log(`%c 📦 MODEL ANALYZER — ${report.file}`, 'color: #a0d080; font-weight: bold; font-size: 13px');
  console.log(`%c${sep}`, 'color: #4a9e4a');

  console.log(`%c 📊 Tổng quan:`, 'color: #ffcc66; font-weight: bold');
  console.log(`    Nodes:      ${report.nodeCount}`);
  console.log(`    Meshes:     ${report.meshCount}`);
  console.log(`    Materials:  ${report.matCount}`);
  console.log(`    Animations: ${report.animations.length}`);

  if (report.animations.length > 0) {
    console.log(`%c\n 🎬 Animations:`, 'color: #ffcc66; font-weight: bold');
    report.animations.forEach(a => {
      console.log(`    "${a.name}" — ${a.duration}, ${a.tracks} tracks`);
    });
  }

  console.log(`%c\n 🧱 Meshes (tên để dùng getObjectByName):`, 'color: #ffcc66; font-weight: bold');
  console.table(
    report.meshes.map(m => ({
      'Tên mesh':     m.name,
      'Vị trí (world)': `(${m.worldPos.x}, ${m.worldPos.y}, ${m.worldPos.z})`,
      'Kích thước':   `${m.boundingBox.size.x.toFixed(2)} × ${m.boundingBox.size.y.toFixed(2)} × ${m.boundingBox.size.z.toFixed(2)}`,
      'Vertices':     m.geometry.vertices,
      'Triangles':    Math.round(m.geometry.triangles),
      'Material':     m.material.name,
    }))
  );

  console.log(`%c\n 🎨 Materials:`, 'color: #ffcc66; font-weight: bold');
  console.table(
    Object.entries(report.materials).map(([name, m]) => ({
      'Tên':   name,
      'Loại':  m.type,
      'Color': m.color,
      'Map':   m.map ? '✓' : '—',
    }))
  );

  console.log(`%c\n 📋 Tên mesh để copy (dùng cho extractMesh):`, 'color: #ffcc66; font-weight: bold');
  console.log(JSON.stringify(report.meshNames, null, 2));

  console.log(`%c\n 💡 Cách tách mesh theo tên:`, 'color: #44cccc; font-weight: bold');
  console.log(`%c   const part = model.getObjectByName("TÊN_MESH");
   const cloned = part.clone();
   scene.add(cloned);`, 'color: #aaaaaa');

  console.log(`%c${sep}\n`, 'color: #4a9e4a');
}

// ── Helpers ─────────────────────────────────────────────────

function _v3(v) {
  return { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) };
}
function _v3euler(e) {
  return {
    x: +(e.x * 180 / Math.PI).toFixed(1) + '°',
    y: +(e.y * 180 / Math.PI).toFixed(1) + '°',
    z: +(e.z * 180 / Math.PI).toFixed(1) + '°',
  };
}
function _matInfo(mat) {
  if (!mat) return { name: 'none', type: 'none', color: 'none', map: false };
  const c = mat.color;
  return {
    name:  mat.name || mat.uuid?.slice(0, 8),
    type:  mat.type,
    color: c ? `rgb(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)})` : 'none',
    map:   !!mat.map,
  };
}
