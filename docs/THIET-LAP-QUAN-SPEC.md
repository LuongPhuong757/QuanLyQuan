# Spec — Màn "Thiết lập quán" (bản nháp 2026-11-18)

Mục tiêu: giao một quán mới cho khách mà **chủ repo ngồi một lần trên một màn là xong**, quán
bán được ngay. Màn mở lại sửa được bất cứ lúc nào. Bối cảnh sản phẩm: `docs/SAN-PHAM-KIEN-TRUC.md`.

Nhánh: `feat/thiet-lap-quan` cắt từ `origin/develop`, chạy DB local riêng.
**KHÔNG merge vào `develop` / `production`** (push là tự deploy lên Bà Lùn thật). Xong thì chuyển
sang repo sản phẩm `~/Desktop/QuanLyQuan`.

---

## 1. Quyết định đã chốt

| # | Quyết định |
|---|---|
| D-01 | Người dùng màn là **chủ repo, làm hộ chủ quán**. Không tự đăng ký, không link kích hoạt |
| D-02 | Màn là **danh sách việc mở lại được**, không phải wizard chạy một lần |
| D-03 | Mỗi lần vào màn phải nhập **mật khẩu của bất kỳ tài khoản admin nào** của quán |
| D-04 | Bắt buộc để "Sẵn sàng bán": tên quán + tài khoản chủ quán + bàn + menu + TK ngân hàng QR |
| D-05 | Tuỳ chọn: nhân viên, máy in, giờ bán, bật/tắt tính năng |
| D-06 | Menu nhập bằng Excel → **xem trước** → xác nhận. Trùng tên thì cập nhật giá/nhóm; món không có trong file **giữ nguyên** |
| D-07 | Mọi thay đổi trên màn ghi **nhật ký** (ai, lúc nào, cũ → mới) |

## 2. Vào màn

- Đường dẫn: `/thiet-lap` (apps/web). Có trong menu của role admin, nhãn "Thiết lập quán".
- Mở màn → hộp **"Nhập mật khẩu admin"**: một ô mật khẩu, nút "Mở khoá".
- BE `POST /setup/unlock { password }`: so `bcrypt` với mọi user có `is_owner=true` hoặc
  `role='admin'` còn hoạt động. Khớp một người → trả phiên mở khoá **15 phút**, gia hạn mỗi lần
  thao tác; ghi nhật ký "mở khoá bằng mật khẩu của <tên admin>".
- Rời màn / hết 15 phút → khoá lại, phải nhập lại.
- Chống dò: `@Throttle` 5 lần / 5 phút như `/auth/login`.
- Mọi API ghi của màn này kiểm phiên mở khoá ngoài `AdminGuard` thường.
- Vì sao chỉ một ô mật khẩu, không hỏi tên đăng nhập: theo D-03 "mật khẩu của bất kỳ admin nào".
  Đổi lại BE phải so với nhiều hash (quán nhỏ < 5 admin → không đáng kể).

## 3. Bố cục

```
┌ Thiết lập quán ───────────────── [● Sẵn sàng bán] / [⚠ Còn thiếu 2 mục] ┐
│ BẮT BUỘC                                                               │
│ ✓ 1 Thông tin quán        Quán Cô Ba · 0909…               [Sửa]       │
│ ✓ 2 Tài khoản chủ quán    co.ba (chủ quán)                 [Sửa]       │
│ ⚠ 3 Bàn                   Chưa có bàn                       [Tạo bàn]   │
│ ⚠ 4 Menu                  Chưa có món                       [Nhập Excel]│
│ ✓ 5 Tài khoản ngân hàng   VCB …1234 · đang nhận             [Sửa]       │
│ TUỲ CHỌN                                                               │
│ – 6 Nhân viên             0 người                           [Thêm]      │
│ – 7 Máy in                Chưa cài                          [Cài]       │
│ – 8 Giờ bán               Chưa đặt                          [Đặt]       │
│ – 9 Tính năng             Đặt online: tắt · QR tại bàn: tắt [Đổi]       │
│ Nhật ký thay đổi (20 dòng gần nhất)                                    │
└────────────────────────────────────────────────────────────────────────┘
```

Mỗi mục bấm vào mở **bảng con** ngay trong màn (không chuyển trang). Lưu xong, trạng thái mục
cập nhật luôn. Trạng thái tính từ DB mỗi lần mở màn, **không lưu cờ "đã xong"** (cờ sẽ lệch khi
ai đó xoá bàn ở màn khác).

## 4. Từng mục

| # | Mục | Điều kiện ✓ | Bảng con | Dùng lại |
|---|---|---|---|---|
| 1 | Thông tin quán | `store_name` khác rỗng **và** khác mặc định; `store_phone` có | Tên, SĐT, địa chỉ | `store_settings` |
| 2 | Tài khoản chủ quán | Có user `is_owner=true` | Tên đăng nhập, đặt mật khẩu mới | `auth` |
| 3 | Bàn | ≥ 1 bàn `dine-in` | "Từ bàn số __ đến __" → tạo | `POST /tables/bulk` (tối đa 100/lần) |
| 4 | Menu | ≥ 1 món đang bán | Tải file mẫu · Chọn file · Xem trước · Xác nhận | `ImportMenuModal` + `POST /menu/bulk-import` |
| 5 | TK ngân hàng | ≥ 1 `payment_qr_account` đang nhận | Ngân hàng, số TK, tên chủ TK, xem thử QR | `payment-qr.controller` |
| 6 | Nhân viên | — | Tên, vai trò, mật khẩu tạm | `admin` users |
| 7 | Máy in | — | LAN/USB, địa chỉ, khổ giấy, **In thử** | `printer_*` settings |
| 8 | Giờ bán | — | Giờ mở, giờ đóng (cho qua 0h) | `open_hours` |
| 9 | Tính năng | — | Công tắc: đặt online, gọi món tại bàn, in | settings có sẵn |

## 5. Menu Excel — khớp theo tên

Import hiện có khớp theo **mã món** (`code` bắt buộc). Quán mới không có mã, nên ở màn này:

- File mẫu 4 cột: **Tên món · Giá · Nhóm · Đơn vị** (+ cột **Mã** tuỳ chọn).
- Khớp: có Mã thì theo mã; không có thì theo **tên** (bỏ khoảng trắng thừa, không phân biệt hoa
  thường, **có phân biệt dấu**: "Bò" ≠ "Bơ").
- Món mới không có mã → BE tự sinh mã.
- Xem trước 3 nhóm: **Món mới** · **Đổi giá/nhóm** (hiện cũ → mới) · **Dòng lỗi** (không ghi).
- Luật cũ giữ nguyên: ô trống = **giữ nguyên**, không phải xoá (bài học mất ảnh 304 món
  2026-09-07). Không bao giờ ghi `image_url`.
- Hai dòng trùng tên trong cùng file → dòng lỗi, bắt sửa file.

## 6. Nhật ký

Ghi vào `audit_log` sẵn có, đánh dấu nguồn `thiet-lap`. Hiện 20 dòng gần nhất cuối màn.
TK ngân hàng ghi **đủ số TK cũ → mới** (đổi số TK là đổi nơi nhận tiền khách).

## 7. Không thuộc nhánh này

- Logo, màu thương hiệu → Phase 9 của QuanLyQuan.
- Lệnh `tao-quan`, migration, bỏ `container_name` cứng → `SAN-PHAM-KIEN-TRUC.md` §8.
- Gỡ 23 file còn viết cứng tên Bà Lùn (riêng `settings.defaults.ts` đổi mặc định
  `store_name` thành rỗng thì **làm** trên nhánh này, vì điều kiện mục 1 dựa vào nó).

## 8. Kiểm khi xong

- DB trống → mở `/thiet-lap` → làm đủ 5 mục bắt buộc → dải "Sẵn sàng bán" → tạo được đơn,
  thu được tiền QR.
- Nhập sai mật khẩu 5 lần → bị chặn 5 phút.
- Nhập lại cùng file Excel lần 2 → 0 món mới, 0 thay đổi.
- Test tích hợp: khớp theo tên + ô trống giữ nguyên.

## 8b. Đã làm (2026-11-18, nhánh `feat/thiet-lap-quan`, chưa commit)

- API: `apps/api/src/modules/thiet-lap/` — route `/admin/thiet-lap/*`, vé mở khoá ở header
  `x-thiet-lap`. Web: `/thiet-lap` (menu admin → "Thiết lập quán").
- Lệch so với §4: mục 6 Nhân viên, 7 Máy in, 8 Giờ bán **mở thẳng màn có sẵn** (Nhân viên,
  Cài đặt → Máy in, Cài đặt → Giờ mở cửa) thay vì làm bảng con mới — các màn đó đã đủ chức năng
  (in thử, giờ qua 0h).
- DB hoàn toàn trống thì chưa có admin để mở khoá → tài khoản chủ quán ĐẦU TIÊN vẫn tạo qua
  `/setup` (chỉ mở từ máy chủ) hoặc lệnh `tao-quan` sau này. Sau đó mọi thứ làm trên màn này.
- `online_ordering_enabled` mặc định vẫn BẬT cho DB mới — cân nhắc đổi về tắt khi làm `tao-quan`.

## 8c. Thương hiệu: logo + tên + màu (chốt 2026-11-19)

QuanLyQuan **bỏ** (thư mục máy đã xoá, backup `~/Backups/QuanLyQuan-2026-11-19.bundle`, GitHub giữ).
Mọi việc sản phẩm làm trong repo này, trên nhánh `feat/thiet-lap-quan`; cách tổ chức nhánh lâu dài
**quyết sau**.

| # | Quyết định |
|---|---|
| T-01 | Mục mới "Thương hiệu" (tuỳ chọn) trong màn Thiết lập |
| T-02 | Tên đầy đủ (`store_name`, đã có) + **Tên ngắn** tuỳ chọn (tab trình duyệt, chữ đầu trang khách); trống thì dùng tên đầy đủ |
| T-03 | **1 ảnh logo**, server tự sinh: vuông 512/180/32 (tab, màn hình chính), bản đen trắng cho hoá đơn in, ảnh chia sẻ 1200×630. Có bước xem trước khung vuông |
| T-04 | Logo hiện ở: trang quản lý (thanh bên, đăng nhập), trang khách (đầu trang), favicon + icon màn hình chính, hoá đơn in nhiệt |
| T-05 | **Hai màu riêng**: màu trang quản lý + màu trang khách, chọn từ **bảng ~10 màu** đã kiểm chữ trắng ≥ 4.5:1, tự sinh sắc đậm/nhạt |
| T-06 | Bảng màu admin **không có đỏ / cam / xanh lá** (trùng màu lỗi / cảnh báo / xong — quy tắc --ds-*). Trang khách được chọn đỏ |
| T-07 | Đổi màu admin ⇒ dọn ~160 chỗ viết cứng `#0f766e` / `teal-*` về biến `--brand-*` (kể cả Order/Bếp/Lịch sử — chỉ đổi màu, không đổi bố cục) |
| T-08 | Linh vật + ảnh nền Quyển menu: **công tắc, mặc định tắt**; Bà Lùn bật |
| T-09 | SMS (OTP, báo đơn chờ): tên quán **tự bỏ dấu** |
| T-10 | Ảnh + tiêu đề chia sẻ link (Facebook/Zalo): **server tự điền theo quán** vào thẻ meta của trang khách |
| T-11 | Mặc định cho DB đã có (Bà Lùn): logo hiện tại, xanh ngọc `#0f766e` / đỏ ớt `#b82a1e`, linh vật BẬT → nhìn không đổi |

Ngoài phạm vi: tên miền `quanbalun.site` (CSRF, gtag, og:url) — theo quán, thuộc `tao-quan`.

## 9. Đã chốt thêm

- Mục 2: đổi được **hết** — tên hiển thị, tên đăng nhập, mật khẩu của chủ quán (2026-11-18).
