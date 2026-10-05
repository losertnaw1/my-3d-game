import fs from 'fs';
import path from 'path';
// Temporary: inspect COLOR_0 and UV ranges per primitive.
const dir = process.argv[2];
for (const name of process.argv.slice(3)) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, name + '.gltf')));
  const bin = fs.readFileSync(path.join(dir, j.buffers[0].uri));
  const read = (acc) => {
    const a = j.accessors[acc], bv = j.bufferViews[a.bufferView];
    const n = { VEC2: 2, VEC3: 3, VEC4: 4, SCALAR: 1 }[a.type];
    const arr = new Float32Array(bin.buffer, bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0), a.count * n);
    const min = Array(n).fill(Infinity), max = Array(n).fill(-Infinity), avg = Array(n).fill(0);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) { const v = arr[i * n + k]; min[k] = Math.min(min[k], v); max[k] = Math.max(max[k], v); avg[k] += v / a.count; }
    return { min: min.map(v => v.toFixed(2)), max: max.map(v => v.toFixed(2)), avg: avg.map(v => v.toFixed(2)) };
  };
  j.meshes[0].primitives.forEach((p, i) => {
    console.log(name, i, j.materials[p.material].name, 'COLOR', p.attributes.COLOR_0 !== undefined ? JSON.stringify(read(p.attributes.COLOR_0)) : '-', 'UV', JSON.stringify(read(p.attributes.TEXCOORD_0)));
  });
}
