# Kiến trúc sản phẩm cho thuê — bản nháp 2026-11-06

Mục tiêu: biến hệ thống Quán Bà Lùn thành sản phẩm cho thuê **2.799.000đ/tháng** cho quán nhỏ,
một người (chủ repo) vận hành + hỗ trợ online 9h–24h. Tên sản phẩm/domain: **chưa chốt** (dùng
`<sanpham>` làm chỗ giữ).

File này tạm đặt trong repo Bà Lùn; khi tạo repo sản phẩm thì chuyển sang đó.

---

## 1. Quyết định đã chốt

| # | Quyết định | Lý do / hệ quả |
|---|---|---|
| Q1 | Quán Bà Lùn **tách riêng hoàn toàn**, không chạy trên repo sản phẩm | Có 2 bản code. Chiều chảy: tính năng chung làm ở **sản phẩm trước**, Bà Lùn cherry-pick khi cần. Không đồng bộ hai chiều |
| Q2 | Tính năng quán xin = **chỉ quán đó dùng** | Làm thành module có công tắc, chỉ bật cho quán đó. KHÔNG fork code theo quán |
| Q3 | Dữ liệu quán hết hạn dùng thử: **giữ lại** | Lưu trữ lạnh (xem §6) |
| Q4 | Hạ tầng: **nhà cung cấp VPS hiện tại** | Bù rủi ro bằng backup ngoài nhà cung cấp + dựng lại VPS bằng script (§7) |
| Q5 | Dùng thử **1 tháng, đủ chức năng**, hết hạn thì không dùng được | Kiểm hạn ở API, không dựa vào cron (§5) |

## 2. Mã nguồn: một repo, khác biệt nằm ở cấu hình

```
repo <sanpham>  (clone từ repo Bà Lùn để giữ lịch sử, rồi gỡ dấu vết Bà Lùn)
 ├─ apps/api, apps/web, apps/shop, packages/*   ← lõi, chung mọi quán
 └─ apps/api/src/modules/rieng/<maquan>-<tinhnang>/  ← module riêng 1 quán, có công tắc
```

**Luật cứng:**
1. Không có nhánh/repo theo quán. Mọi quán chạy cùng một bản code, chỉ khác **phiên bản** và
   **cấu hình**.
2. Mỗi tính năng mới hỏi một câu: "quán khác có thể cần không?"
   - Có → làm vào lõi, có công tắc, mặc định tắt.
   - Không → module riêng `rieng/<maquan>-*`, công tắc chỉ bật cho quán đó.
3. Công tắc nằm trong **DB của từng quán** (bảng cài đặt). Vì mỗi quán có DB riêng, không cần
   thêm cột `shop_id` vào 45 bảng.
4. Mỗi module riêng ghi trong `docs/QUAN/<maquan>.md`: ai xin, ngày nào, thu phí bao nhiêu.

Vì sao không fork theo quán: 10 quán = 10 lần sửa cho mỗi lỗi bảo mật/tính tiền, mỗi lần xung
đột khác nhau. Chi phí thời gian tăng tuyến tính theo số quán, một người không gánh nổi.

## 3. Hạ tầng: mô hình cụm

```
              DNS (Cloudflare) *.<sanpham>.vn
                         │
     ┌───────────────────┴───────────────────┐
 VPS-1 (≈8GB)                            VPS-2 ...
  Caddy (wildcard TLS, định tuyến theo domain)
   ├─ quan-a: api + mysql + uploads (volume riêng)
   ├─ quan-b: api + mysql + uploads
   └─ quan-c: ...   (3–4 quán / VPS, giới hạn RAM/CPU từng container)
```

- **Mỗi quán = một docker compose project riêng** (`docker compose -p quan-a`). Hiện
  `docker-compose.prod.yml` đặt cứng `container_name: ordbl_*` → phải bỏ, để tên container theo
  project, không thì 2 quán trên cùng VPS đụng tên.
- Một Caddy dùng chung cho cả VPS (không phải mỗi quán một Caddy như hiện nay).
- Domain mỗi quán: `<maquan>.<sanpham>.vn` (khách), `admin-<maquan>.<sanpham>.vn` (quản lý).
- Quán lớn / trả thêm → chuyển sang VPS riêng. Dễ vì đơn vị triển khai là **một quán**.
- MySQL mỗi quán giới hạn `innodb_buffer_pool_size` nhỏ (bài học RAM/swap ở Bà Lùn).

## 4. Build và deploy

Hiện tại: deploy **build trên VPS**. Với N quán thì phải đổi:

1. CI build **một Docker image cho mỗi phiên bản** (`<sanpham>-api:1.5.0`), đẩy lên registry
   (GHCR). VPS chỉ `pull`, không build → không đầy ổ vì build cache, không phụ thuộc kết nối
   VPS↔github.com chập chờn khi build.
2. Web/shop **build một lần cho mọi quán**. Tên, logo, màu, công tắc tải từ API lúc chạy
   (`GET /api/public/thuong-hieu`) — không build riêng theo quán.
3. Repo **ops** riêng (private) chứa `shops.yaml`:
   ```yaml
   quan-a:
     vps: vps-1
     domain: quan-a.<sanpham>.vn
     phien_ban: 1.5.0
     goi: dung-thu          # dung-thu | tra-phi
     het_han: 2026-12-10
   ```
4. Lệnh vận hành (script trong repo ops):
   - `tao-quan <maquan>` — tạo DB, container, domain, tài khoản chủ quán, hạn dùng thử.
   - `deploy <maquan> <phienban>` / `deploy --tat-ca <phienban>`.
   - `gia-han <maquan> <ngay>`.
   - `dong-bang <maquan>` / `khoi-phuc <maquan>` (§6).
5. Lên phiên bản **dần**: quán dùng thử trước → 1 quán trả phí → tất cả.

## 5. Dùng thử 1 tháng

- Bảng `license` trong DB mỗi quán: `goi`, `het_han_luc`. Do `tao-quan` / `gia-han` ghi.
- **Middleware API kiểm hạn ở mỗi request** → không phụ thuộc cron (cron có thể không chạy khi
  server khởi động lại / Docker treo, và khi đó quán dùng miễn phí mãi).
- Mốc thời gian:

| Thời điểm | Hành vi |
|---|---|
| Ngày 1–24 | Đủ chức năng |
| Ngày 25–30 | Dải cảnh báo "Còn N ngày dùng thử" + Telegram báo chủ repo |
| Hết hạn | **Chỉ xem**: đăng nhập, xem báo cáo/lịch sử được; không tạo đơn, không nhập hàng. Trang khách báo "tạm ngừng nhận đơn" |
| Giờ khoá | **10h sáng**, không phải 0h — không cắt giữa ca đêm đông khách |

- Cron chỉ làm việc phụ: nhắc qua Telegram, liệt kê quán sắp hết hạn.
- Vì chủ repo giữ server, quán không sửa được hạn. Nếu sau này có quán đòi cài máy riêng mới
  cần bản quyền ký số.

## 6. Giữ dữ liệu quán hết hạn

Giữ mãi không có nghĩa là để container chạy mãi:

1. Hết hạn → **chỉ xem** 30 ngày (container vẫn chạy).
2. Sau 30 ngày → `dong-bang`: dump DB + nén `uploads/` → lưu trữ ngoài VPS (§7), **dừng và gỡ
   container**, nhả chỗ trên VPS.
3. Quán quay lại mua → `khoi-phuc`: dựng lại từ bản dump, dữ liệu còn nguyên.

⚠ Dữ liệu có SĐT/địa chỉ khách của quán (đơn online) — là dữ liệu cá nhân. Nên ghi rõ trong
hợp đồng thời gian lưu và quyền yêu cầu xoá. Cần kiểm với người hiểu luật.

## 7. Bù rủi ro nhà cung cấp VPS hiện tại

Đã biết: VPS hay reinstall đổi IP/mật khẩu, sshd rate-limit, kết nối github.com chập chờn.

- **Backup ngoài nhà cung cấp**: dump DB mỗi quán hằng đêm → object storage khác (vd Cloudflare
  R2 / Backblaze B2). Backup chỉ nằm trên cùng VPS = không phải backup.
- **DNS qua Cloudflare**: đổi IP là sửa 1 bản ghi, không chờ lan truyền lâu.
- **Dựng lại VPS bằng script**: `dung-vps <ten>` cài Docker, Caddy, fail2ban, khoá SSH, rồi
  `khoi-phuc` từng quán từ backup. Mục tiêu: VPS mất trắng → quán chạy lại trong < 1 giờ.
- Image lấy từ registry (§4) nên dựng lại không cần build.

## 8. Thứ tự làm

| Giai đoạn | Việc | Ra gì |
|---|---|---|
| 0 | Tạo repo `<sanpham>` (clone giữ lịch sử), gỡ 45 chỗ viết cứng tên quán → cài đặt thương hiệu | Repo sạch dấu Bà Lùn |
| 1 | Tối ưu tính năng + giao diện cho quán mới: công tắc module, mặc định chỉ bật Order/Bếp/Thanh toán/Báo cáo | Bản sản phẩm |
| 2 | `synchronize` → migration | Nâng cấp không mất dữ liệu khách |
| 3 | Bỏ `container_name` cứng, compose theo project, Caddy chung, build image trên CI | Chạy nhiều quán / VPS |
| 4 | Repo ops: `tao-quan`, `deploy`, `gia-han`, `dong-bang`, `khoi-phuc` | Vận hành 1 lệnh |
| 5 | License + middleware dùng thử | Dùng thử 1 tháng |
| 6 | Backup ngoài + script dựng lại VPS | Chịu được VPS mất trắng |
| 7 | Deploy **bản mẫu** (dữ liệu demo) để chào bán | Link demo |

### ⛔ Bắt buộc trước khi có khách thật đầu tiên

- [ ] **`synchronize` → migration.** Đổi schema bằng `synchronize` trên DB khách có thể drop cột
      = mất dữ liệu khách khi nâng cấp.
- [ ] **Bỏ `container_name` cứng (`ordbl_*`) trong `docker-compose.prod.yml`**, đặt tên theo
      compose project (`-p <maquan>`). Không bỏ thì 2 quán trên cùng VPS đụng tên, không chạy
      cùng lúc được.

## 9. Việc để sau

- Tên sản phẩm, domain.
- Hoá đơn điện tử từ máy tính tiền (tích hợp qua API nhà cung cấp hoá đơn, không tự làm).
- Nhập menu từ file Excel của KiotViet/MISA.
- Cảnh báo sự cố tự động.
- Hợp đồng thuê, chính sách dữ liệu.
