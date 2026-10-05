# 📦 Thư mục Models — Hướng dẫn import 3D model

Đặt tất cả file 3D model của bạn vào đây.

## Ground và điều khiển hiện tại

World dùng mặt phẳng 215×215 với texture lá trong `public/textures/ground/`.
Bản chạy dùng diffuse WebP, normal PNG và roughness PNG ở độ phân giải 1024×1024;
các file `.blend` và EXR 4K là nguồn, không được tải khi vào map.

- Click vào map để dùng chuột nhìn xung quanh; Esc thả chuột.
- WASD di chuyển ngang theo hướng nhìn, Shift chạy, R về điểm xuất phát.
- Nếu trình duyệt không hỗ trợ khóa chuột, giữ chuột trái và kéo để nhìn.
- Camera cao 1,7 đơn vị và bị giới hạn trong nền; chưa có va chạm cây/nhà.

Để tạo lại texture từ nguồn, chạy `npm run optimize:ground` ở thư mục dự án.
Máy yếu có thể dùng `npm run optimize:ground -- 512`, rồi reload trang.
Khôi phục bản 1K bằng `npm run optimize:ground -- 1024`.
`textureWorldSize` trong `src/world/World.js` chỉnh kích thước lá trên mặt đất,
không giảm dung lượng ảnh. Chạy `npm test` để kiểm tra điều khiển.

## Format được hỗ trợ

| Format | Extension | Ghi chú |
|--------|-----------|---------|
| ✅ GLTF Binary | `.glb`  | **Khuyến nghị** — 1 file duy nhất |
| ✅ GLTF Text   | `.gltf` | Kèm thư mục textures riêng |
| ❌ FBX, OBJ, etc | — | Cần thêm loader riêng |

## Cách import model vào game

1. **Copy file `.glb` vào thư mục này** (`public/models/`)

2. **Mở `src/world/World.js`**, tìm block `MODELS`:
   ```js
   const MODELS = {
     // tree:     '/models/fantasy_tree.glb',   ← bỏ comment dòng này
     // mushroom: '/models/mushroom.glb',
     // ...
   };
   ```

3. **Bỏ comment dòng tương ứng** và điền đúng tên file:
   ```js
   const MODELS = {
     tree: '/models/my_beautiful_tree.glb',   ← đã bật
   };
   ```

4. **Save → Vite tự reload** — model xuất hiện ngay!

## Thêm loại object hoàn toàn mới

Tạo file mới trong `src/world/entities/MyObject.js`:

```js
import * as THREE from 'three';

export class MyObject {
  constructor(scene, rng, modelLoader) {
    this.scene       = scene;
    this.rng         = rng;
    this.modelLoader = modelLoader;
  }

  async build(modelPath = null) {
    if (modelPath && this.modelLoader) {
      // Dùng 3D model
      const obj = await this.modelLoader.load(modelPath, {
        position: [0, 0, 0],
        scale:    1,
      });
      this.scene.add(obj);
    } else {
      // Fallback procedural...
    }
  }
}
```

Rồi import vào `World.js` và thêm vào `buildProps()`.

## Nguồn tải model miễn phí

- [Sketchfab](https://sketchfab.com) (filter: free, GLTF)
- [Quaternius](https://quaternius.com) (low-poly, miễn phí hoàn toàn)
- [KayKit](https://kaylousberg.itch.io) (stylized, rất đẹp)
- [Kenney](https://kenney.nl/assets) (game assets free)
- [Google Poly Archive](https://poly.pizza)
