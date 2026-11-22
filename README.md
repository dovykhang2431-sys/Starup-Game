# STARUP — Bản Full PWA (Cài App & Chơi Offline 100%)

## Cấu trúc thư mục
- `index.html` — Trang chính đã gắn đầy đủ thẻ PWA (Android & iOS)
- `manifest.webmanifest` — Cấu hình App toàn màn hình ngang (`fullscreen` + `landscape`)
- `sw.js` — Service Worker lưu đệm toàn bộ mã nguồn & ảnh để chơi không cần mạng
- `css/starup.css` — Giao diện 16:9 tràn viền, khóa zoom
- `js/` — 9 module tách riêng (`config.js`, `audio.js`, `avatars.js`, `finance.js`, `marketing.js`, `empire.js`, `quests.js`, `pwa.js`, `engine.js`)
- `assets/` — 4 mặt bằng đã làm nét (TP.HCM Ngày/Đêm, Tokyo, New York), 6 token nhân vật 3D và 4 bộ App Icon (`192px`, `512px`, `maskable`, `apple-touch-icon`)

## Cách đưa lên mạng để cài thành App trên điện thoại (Miễn phí trong 1 phút)
> Lưu ý: Để trình duyệt cho phép cài PWA và chạy Offline (`sw.js`), game cần chạy qua **HTTPS** (hoặc `localhost`).

1. **Cách nhanh nhất (Netlify Drop):**
   - Giải nén thư mục `starup/` trong file ZIP này.
   - Truy cập `https://app.netlify.com/drop` và kéo thả cả thư mục `starup/` vào là có ngay link HTTPS.
2. **Hoặc dùng GitHub Pages / Vercel:**
   - Tải toàn bộ nội dung thư mục `starup/` lên repo GitHub → bật **Settings → Pages**.
3. **Cài thành App trên điện thoại:**
   - **Android (Chrome):** Mở link → bấm nút **Cài App ngay** trong mục `⚙️ Cài Đặt` (hoặc menu Chrome → *Cài đặt ứng dụng*).
   - **iPhone (Safari):** Mở link → bấm biểu tượng **Chia sẻ (↑)** → chọn **Thêm vào Màn hình chính**.
