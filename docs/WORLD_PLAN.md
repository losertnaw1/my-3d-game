# Plan: Build lại thế giới bằng Stylized Nature MegaKit

## Tiếp tục ngày 03/10/2026

### Cập nhật theo góp ý Preview

- Map 440 × 440 m, bán kính chơi 204 m (diện tích gấp 4 bản 220 m). Thêm cây/đá ở vùng ngoài, chuyển đồi viền ra mép mới; giữ các landmark chính.
- `ChunkStreamer.js`: ô 24 m, tải trong 64 m, gỡ ngoài 84 m để tránh tải/gỡ liên tục ở biên. Mỗi frame dựng tối đa một ô mới; preload diễn ra ngoài sương mù (18–48 m). Terrain geometry và instance buffers được dispose khi gỡ. Heightmap, công thức placement, collider và model/texture dùng chung còn được giữ trong RAM/cache; đây chưa phải network streaming từng asset.
- Cỏ/hoa sinh có seed theo ô; tải lớp phủ gần trong 32 m, giải phóng ngoài 44 m; shader thu nhỏ từ 24–42 m tính từ camera. Cỏ ngắn, cụm kép rộng, hoa nhỏ và lặp theo noise thành vùng. Bóng đổ dùng 1024 px và phạm vi 72 m.
- Đường lát nhiều hàng Pebble_Square_1, cách hàng 0,85 m, bám tiếp tuyến và độ dốc; bỏ sỏi rải ngẫu nhiên/đường đá cũ, tránh chồng viên tại giao lộ.
- `?debug` hiển thị FPS, calls, triangles, GPU geometries, chunks, meshes, instances. Lần kiểm tra cuối: 35 FPS, 323 calls, 2.269.021 triangles, 36 chunks, 19.813 primitive instances. Đây là snapshot trong trình duyệt kiểm tra, không phải cam kết FPS hay benchmark cùng góc nhìn với phiên bản trước.
- 9 test qua; gồm kiểm tra giải phóng instance buffer, giới hạn số ô, sinh lại giống hệt khi quay về và hàng đá đều qua các đoạn spline. Build thành công; còn cảnh báo bundle >500 kB. Ảnh: `docs/world-streaming-preview.jpg`.

Các ghi chép bên dưới là mốc trước lần tinh chỉnh này.

- Đã nối world mới với main, nhân vật stick figure, camera góc nhìn thứ ba, input và chu kỳ ngày/đêm theo ThinkingFlow. Chu kỳ hiện tại dài 480 giây; T tăng tốc 30 lần.
- Đã gỡ code entities/map cũ, Palette, CameraController và test cũ; giữ nguyên asset cũ trong public.
- Đã sửa collider tại đúng tâm vật cản, camera xuyên địa hình khi nội suy qua dốc, xóa wheel input khi mất focus; thêm thông báo khi khởi tạo thất bại.
- Bộ test mới `tests/world.test.js`: 7 test qua, bao gồm raycast so với heightmap, seed, scatter, collision, camera, player, day/night và tài nguyên glTF. Build production qua (còn cảnh báo bundle >500 kB).
- Browser smoke test: cảnh spawn hiển thị, nhân vật và cây/cỏ tải được; console không ghi lỗi ở lần kiểm tra. Thống kê world: 6.998 placements, 910 instanced meshes, 767 colliders. Số mesh toàn thế giới không đồng nghĩa draw call mỗi frame.
- Còn cần đo FPS/draw calls trên máy mục tiêu và đi kiểm tra từng khu cả ngày lẫn đêm; chưa xác nhận đạt ngân sách 120–150 draw call. Chưa có ảnh kiểm chứng từng khu.


## Mục tiêu
- **Xóa toàn bộ map cũ**: Terrain phẳng + texture lá, cây procedural, ruins, crystal, nấm, hoa, forest_house, lotus, các đèn "magic glow".
- **Dựng một thế giới mới** chỉ dùng model trong `public/models/Stylized Nature MegaKit/glTF`. Phong cách theo `Preview_1..3`: ban ngày, nắng sáng, màu tươi kiểu anime.

---

## 1. Kho asset (kích thước đo trực tiếp từ file glTF)

| Nhóm | Model | Kích thước (R×C, m) | Dùng cho |
|---|---|---|---|
| Cây thường | `CommonTree_1..5` | ~4×7–9.4 | Đồng cỏ, rìa rừng, đồi thu (đổi màu lá) |
| Cây thông | `Pine_1..5` | ~5×7–10 | Rừng thông, viền bản đồ |
| Cổ thụ xoắn | `TwistedTree_1..5` | ~11×16–19 | Landmark của Khu Cổ Thụ |
| Cây chết | `DeadTree_1..5` | ~7×9.5–16 | Thung Khô |
| Bụi cây | `Bush_Common`, `Bush_Common_Flowers` | 1.9×1.6 | Khắp nơi |
| Dương xỉ / cây lá | `Fern_1` (9×2.7!), `Plant_1(_Big)`, `Plant_7(_Big)` | — | Dưới tán rừng, bờ hồ. `Plant_7` dẹt (cao 0.25) → làm lá súng trên mặt hồ |
| Hoa | `Flower_3/4_Group/Single`, `Clover_1/2`, `Petal_1..5` | 1–2.5 | Thung lũng Hoa, bờ hồ, cánh hoa rơi |
| Cỏ | `Grass_Common_Short/Tall`, `Grass_Wispy_Short/Tall` | 0.6–1.5 | Phủ toàn map (instanced) |
| Nấm | `Mushroom_Common`, `Mushroom_Laetiporus` | 0.5–1.4 | Gốc cây, vòng nấm tiên |
| Đá | `Rock_Medium_1..3` | ~3×2 | Scale 0.5–3.5× → từ đá nhỏ tới tảng lớn như Preview_1 |
| Đá lát / sỏi | `RockPath_Round/Square_*`, `Pebble_Round/Square_*` | 0.3–2 | Lối đi đá, sỏi rải dọc đường đất |

> **Biến thể không cần model mới:**
> - `Grass.png` là dải 4 màu (vàng / xanh / cam / xanh nhạt) → dịch UV để có **cỏ khô vàng** (Thung Khô) và **cỏ cam** (Đồi Thu).
> - Có sẵn `Rocks_Desert_Diffuse.png` → thay texture cho `Rock_Medium` để có **đá sa mạc** như Preview_3.
> - Lá `CommonTree` được hue-shift trong shader → **cây lá đỏ/cam** như Preview_1.

---

## 2. Bố cục bản đồ (220×220 m, vùng chơi ±100 m, −Z = Bắc)

```
                         BẮC (-Z)
   ┌──────────────────── Đồi viền + Thông dày ────────────────────┐
   │                                                              │
   │            ② RỪNG THÔNG              ③ KHU CỔ THỤ            │
   │         (Pine + Common dày,          (đồi cao ~5m,           │
   │          đường đất uốn lượn)          TwistedTree khổng lồ)  │
   │                    ║                     ╱                    │
   │  ④ HỒ LẶNG ═══════ ① ĐỒNG CỎ KHỞI ĐẦU ════ ⑤ THUNG LŨNG HOA  │
   │  (trũng, mặt nước,   (spawn, ngã tư       (hoa dày, bụi hoa)  │
   │   lá súng, đá bờ)     đường đất)                              │
   │                    ╱              ╲                           │
   │        ⑦ THUNG KHÔ                   ⑥ ĐỒI THU               │
   │     (cát, cây chết,                (cây lá đỏ/cam,           │
   │      lối đá chữ S)                  tảng đá lớn)             │
   │                                                              │
   └──────────────────── Đồi viền + Thông dày ────────────────────┘
                         NAM (+Z)
```

| # | Khu vực | Tâm (x, z) | Bán kính | Tham khảo |
|---|---|---|---|---|
| ① | Đồng Cỏ Khởi Đầu (spawn) | (0, 10) | 28 | Preview_1 bên trái |
| ② | Rừng Thông | (−5, −65) | ~40 | Preview_2 |
| ③ | Khu Cổ Thụ | (60, −60) | 22 | Preview_4 (cây xoắn) |
| ④ | Hồ Lặng | (−58, 0) | 16 (nước) | — |
| ⑤ | Thung Lũng Hoa | (60, 15) | 24 | Preview_4 (dải hoa) |
| ⑥ | Đồi Thu | (55, 68) | 26 | Preview_1 bên phải |
| ⑦ | Thung Khô | (−58, 65) | 28 | Preview_3 |
| ⑧ | Viền bản đồ | r > 92 | — | Che biên, tạo chiều sâu |

---

## 3. Chi tiết từng khu vực

### ① Đồng Cỏ Khởi Đầu — spawn tại (0, 35), nhìn về Bắc
- **Địa hình**: đồi thấp lượn sóng (±0.8 m), ngã tư đường đất ở trung tâm (đường nối tới mọi khu).
- **Cây**: 10–14 `CommonTree` rải thưa thành cụm 2–3 cây, chừa khoảng trống rộng để nhìn xa.
- **Điểm nhấn**: cụm 3 tảng `Rock_Medium` scale 2.5–3.5× chồng lệch nhau ở Tây Bắc (giống tảng đá lớn Preview_1), bụi cây và nấm quanh chân đá.
- **Phủ đất**: cỏ xanh dày (`Grass_Common` + `Wispy`), `Bush_Common_Flowers`, `Flower_3_Single`, `Fern_1` nhỏ, sỏi rải mép đường.

### ② Rừng Thông
- **Mật độ**: ~120 cây (70% `Pine`, 30% `CommonTree`), Poisson-disc khoảng cách 5–7 m, xoay/scale ngẫu nhiên 0.9–1.4.
- **Lối đi**: đường đất uốn lượn từ ① lên một **khoảng trống giữa rừng** ở (−10, −75) có 1 tảng đá lớn và `DeadTree_1` đơn độc (như Preview_2).
- **Tầng thấp**: `Fern_1`, `Plant_1_Big`, `Clover`, cỏ cao, `Mushroom_Laetiporus` ở chân thân cây, `Mushroom_Common` rải rác.
- **Màu đất**: xanh đậm hơn dưới tán.

### ③ Khu Cổ Thụ (landmark)
- **Địa hình**: đồi tròn cao ~5 m, đường dốc thoải từ ①.
- **Trung tâm**: `TwistedTree_2` scale 1.3 (cao ~25 m) — nhìn thấy từ spawn.
- **Xung quanh**: 4 `TwistedTree` khác trên sườn đồi, vòng đá lát `RockPath_Round_*` quanh gốc, **vòng nấm tiên** (`Mushroom_Common` xếp vòng), thảm `Petal_*` dưới tán, `Flower_4_Group`.

### ④ Hồ Lặng
- **Địa hình**: lòng chảo sâu ~1.5 m, mặt nước ở y = −0.6 (shader nước: gradient màu + gợn sóng nhẹ).
- **Mặt nước**: ~20 `Plant_7`/`Plant_7_Big` làm lá súng, `Petal` nổi.
- **Bờ hồ**: vòng `Rock_Medium` scale 0.5–1.2, `Pebble`, `Fern_1`, `Clover`, `Flower_3_Group`, cỏ cao; 2–3 `CommonTree` nghiêng ra hồ.
- **Lối đi**: nhánh đá lát `RockPath_Square_*` dẫn tới mép nước.

### ⑤ Thung Lũng Hoa
- **Địa hình**: thung lũng nông, thoải.
- **Hoa**: ~600 hoa instanced (`Flower_3/4_Group/Single`) phân theo **mảng màu** (noise mask) thành từng dải thay vì rải đều.
- **Khác**: `Bush_Common_Flowers`, `Clover`, vài `CommonTree` lẻ, đường đất xuyên giữa.

### ⑥ Đồi Thu
- **Cây**: ~35 `CommonTree` lá cam / đỏ / vàng (hue-shift theo instance), cỏ cam/vàng.
- **Điểm nhấn**: tảng đá lớn scale 3× trên đỉnh đồi, nấm, `Plant_1`.
- **Chuyển tiếp**: rìa giáp ① trộn dần xanh → cam.

### ⑦ Thung Khô
- **Đất**: vertex color màu cát, chuyển dần từ cỏ ở rìa.
- **Cây**: 8–10 `DeadTree` rải thưa.
- **Đá**: `Rock_Medium` texture sa mạc, scale 1.5–3.5× hai bên thung (tạo vách như Preview_3).
- **Lối đi**: **đá lát chữ S** (`RockPath_Square_*` + `Pebble_Square_*`) chạy dọc thung.
- **Thực vật**: cỏ khô vàng, `Plant_1` lẻ, ít cỏ cam.

### ⑧ Viền bản đồ
- Địa hình dâng 8–15 m khi r > 92, phủ thông + cây thường dày → che biên, fog làm mờ xa.
- `CameraController` giữ giới hạn mềm ở r ≈ 95.

### Mạng đường đi
- 6 đường Catmull-Rom từ ngã tư ① tới từng khu, rộng 2.5–3.5 m.
- Đường "sơn" vào vertex color terrain (nâu vàng), san phẳng nhẹ, viền sỏi + cỏ thấp hai bên.
- Scatter tự **loại trừ** đường, mặt nước, vùng landmark.

---

## 4. Kiến trúc kỹ thuật

| File | Vai trò |
|---|---|
| `src/world/WorldConfig.js` | Tâm/bán kính khu, đường đi, mật độ, seed — chỉnh layout ở một chỗ |
| `src/world/terrain/Heightmap.js` | Noise có seed + chỉnh theo khu (đồi, lòng hồ, viền), khoảng cách tới đường; `getHeight(x,z)` |
| `src/world/terrain/TerrainMesh.js` | Plane 220 m, 256×256 segment, vertex color trộn cỏ / cỏ đậm / đất / cát / cam |
| `src/world/terrain/Water.js` | Shader nước gợn sóng |
| `src/world/nature/NatureLibrary.js` | Load glTF một lần, cache geometry + material; biến thể (cỏ vàng/cam, đá sa mạc, lá thu); shader gió lá + cỏ |
| `src/world/nature/InstancedPlacer.js` | Gom placement → `InstancedMesh` cho từng primitive, y theo terrain |
| `src/world/nature/Scatter.js` | Poisson-disc + mask (khu, đường, nước, loại trừ) |
| `src/world/zones/*.js` | 8 file, mỗi khu một file, trả về placement + collider |
| `src/world/World.js` | Viết lại: terrain → library → zones → instancing |
| `LightSystem.js`, `SkySystem.js` | Trời xanh ban ngày, nắng ấm, fog xanh nhạt, bỏ đèn glow |
| `CameraController.js` | Bám độ cao terrain, va chạm tròn với thân cây/đá, chặn xuống nước, spawn mới |

**Ngân sách hiệu năng**: ~300 cây, ~8–10k cỏ/hoa đều instanced → ~120–150 draw call. Cỏ/hoa không cast shadow. Shadow camera đi theo người chơi.

---

## 5. Thay đổi file

- **Xóa**: `src/world/entities/*`, `src/utils/Palette.js`, `tests/props.test.js`, `scripts/gltf-bbox.mjs` (script tạm đo model)
- **Sửa**: `World.js`, `main.js`, `LightSystem.js`, `SkySystem.js`, `CameraController.js`, `tests/camera-controller.test.js`
- **Tạo**: các file mục 4 + `tests/heightmap.test.js`, `tests/scatter.test.js`

---

## 6. Kiểm tra
- `npm test`: heightmap xác định theo seed, scatter tôn trọng mask/khoảng cách, camera bám terrain + va chạm.
- `npm run build` không lỗi.
- `npm run dev` + trình duyệt: chụp ảnh spawn và từng khu, kiểm tra FPS / draw call qua `renderer.info`.

---

## 7. Câu hỏi cần xác nhận
1. **File model cũ** trong `public/models/` (`forest_house.glb`, `lotus.glb`, `flower.glb`, `tree-group.glb`, `theme.glb`, `ground.glb`, thư mục Kenney/Medieval) và `public/textures/ground` → mặc định **chỉ gỡ khỏi code, giữ file**. Có xóa luôn không?
2. **Va chạm** (không đi xuyên cây/đá, không lội nước) — mặc định **có**.
3. **Tên game**: giữ "Mystic Forest" hay đổi?
4. **Ngày/đêm**: mặc định ban ngày cố định như Preview.

### Tinh chỉnh tự nhiên — hai hàng đá, đất nâu, phủ sát đường
- Đường rộng 1,6 m, hai dải đá; trộn 17 model pebble/path tròn và vuông, lệch hàng, xoay nhẹ, thay đổi tỷ lệ và sắc độ có seed.
- Nền đất chủ đạo nâu ấm, nâu tối dưới rừng và nâu vàng ở đồi thu. Màu xanh chủ yếu đến từ thực vật.
- Khoảng cách điểm trồng 0,48 m (trước 0,8 m); cỏ cụm kép, hoa đơn lặp dày theo mảng noise. Cho phép cỏ sát viền đường, vẫn chừa lõi lối đi và tránh nước/vật cản.
- Ưu tiên cảnh gần: fog 10–28 m, preload 42 m, gỡ tile ngoài 56 m. Lớp phủ tạo trong 18 m, gỡ ngoài 28 m, chia batch 8 m và loại khỏi render ngoài phạm vi gần; shader thu nhỏ dần 16–27 m.
- 9 test và build qua; cảnh báo bundle >500 kB còn nguyên. Không so sánh FPS với số đo cũ vì góc nhìn và điều kiện trình duyệt khác nhau.

### Ưu tiên cây và cỏ hơn hoa
- Cỏ: 3 bụi thấp/điểm thay vì 2, tán ngang 2,0–2,7 trước hệ số scale 0,4; tăng tỷ lệ phủ vùng thưa lên 96%. Sửa jitter trục Z vượt bước lưới khiến phân bố không đều.
- Hoa: xác suất ở vùng đủ điều kiện còn 5,5% ngoài thung lũng hoa và 20% trong thung lũng; noise mask ngoài thung lũng chặt hơn. Giảm hoa trang trí và bụi có hoa quanh spawn.
- Cây: thêm 4 cụm quanh spawn, mỗi cụm tối đa 6 cây; tăng cây lẻ đồng cỏ, tăng thông và giảm khoảng cách cây vùng ngoài từ 10 xuống 6,5 m. Số thực tế còn phụ thuộc mask lối đi, hồ và vật cản.
- Giữ fog và streaming gần như lần trước. 9 test qua, build thành công; còn cảnh báo kích thước bundle.
