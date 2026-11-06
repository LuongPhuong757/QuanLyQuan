# Kiểm kê tính năng & đối chiếu bản vẽ

Lập 2026-11-06 từ code thật (5 nhóm đọc song song). Chi tiết từng màn, kèm `file:dòng`, ở `inventory/`:

| File | Phạm vi |
|---|---|
| [01-ban-order-thanh-toan.md](inventory/01-ban-order-thanh-toan.md) | Sơ đồ bàn, chi tiết bàn, Gọi món, Thu tiền, Hoá đơn tự do, Bàn ăn, khung app |
| [02-bep-don-online.md](inventory/02-bep-don-online.md) | Bếp, Đơn online, Cài đặt (7 tab), form Phiếu nhập |
| [03-menu-lich-su-bao-cao.md](inventory/03-menu-lich-su-bao-cao.md) | Menu (+5 hộp), Lịch sử, Dashboard, Thống kê truy cập, Sổ ngân hàng |
| [04-kho-ncc-quan-tri-dang-nhap.md](inventory/04-kho-ncc-quan-tri-dang-nhap.md) | NCC (8 tab), Cổng NCC, Nhân sự, Nhật ký, Đăng nhập, Cầu in |
| [05-trang-khach-shop.md](inventory/05-trang-khach-shop.md) | Trang khách: đặt online + QR gọi món tại bàn |

**Quy mô:** khoảng **32 màn chính + hơn 45 hộp thoại / bảng con**. Bản vẽ v0.2 mới phủ **4 màn, và chỉ một phần**.

---

## 1. Bản vẽ v0.2 so với code thật — cái gì sai / thiếu

### 1a. Bốn màn đã vẽ nhưng thiếu nhiều

| Màn | Bản vẽ đang có | Code thật có mà bản vẽ thiếu |
|---|---|---|
| **Sơ đồ bàn** | 3 lọc, thẻ: tên/tiền/trạng thái | 8 lọc (Đang dùng · Mang về · Giao hàng · Còn món chưa giao · Trống · KiotViet · Tại quán); **3 loại bàn** (tại quán / mang về / ship); trạng thái **bếp chậm ≥15'**, **QR chờ duyệt** (badge "📱 n lượt"), **đã giao hết**, **khoá KiotViet**; chip vòng đời món (gọi / báo bếp / đang làm / xong) + "đã giao"; đồng hồ từ lần báo bếp đầu |
| **Chi tiết bàn** | danh sách món phẳng, − SL + / Ghi chú / Huỷ | Món **nhóm theo vòng đời** (Đang gọi → Đã báo bếp → Đang làm → Xong chờ giao → Đã giao → Đã huỷ); nút từng món **📢 Báo bếp / 🍽 Đã giao / ⭐ Ưu tiên**; Huỷ vs **Trả món** (món đã giao); đồng hồ chờ từng món; **thẻ duyệt lượt QR** của khách; **khối khách giao hàng** (tên, SĐT, địa chỉ, km, bản đồ); **🛵 Đã đi ship**; menu ⋯: **Chuyển bàn · Ghi chú cho bếp (chip chọn nhanh) · Huỷ cả bàn · In phiếu tạm tính**; quy tắc đơn ONLINE ẩn bớt nút |
| **Bếp** | 1 danh sách, "Xong" | **2 bảng** Chờ chế biến / Đã xong (bước **Đã giao** riêng); **3 chế độ xem** Ưu tiên / Theo món / Theo bàn + sắp xếp A→Z / Nhiều nhất; **thẻ món đã huỷ** "Đã biết"; **🚫 đánh dấu HẾT món** (tự huỷ order chưa nấu); **lọc nhóm** (Bếp nấu / Có sẵn); yêu cầu phục vụ "📝 YC PHỤC VỤ"; size phần; dải bật âm thanh; nút "🛎 Đơn online N"; toàn màn, không có nav |
| **Thanh toán** | 2 cách trả, 2 bước | **4 cách trả: Tiền mặt · Chuyển khoản · Cả hai · Ghi nợ**; bước **Soát bill** (đã giao / chưa mang ra / đã huỷ); **VietQR** có số tiền + nội dung CK; **chụp bill bắt buộc** khi CK (hoặc ghi lý do); quyền `can_collect_transfer`; dùng lại cho **Thu nợ** ở Lịch sử |

### 1b. Bản vẽ v0.2 có cái code KHÔNG có (tính năng MỚI — cần chủ repo quyết)
- **"Xuất hoá đơn điện tử"** ở bước ② — code chưa có tính năng này.
- **"Khách đưa / Trả lại khách"** (tính tiền thừa) trên máy tính — code chưa có.
- **"Xong cả bàn"** ở chế độ Ưu tiên — code chỉ có "» Xong tất cả" ở chế độ nhóm.
- **Hoàn tác 5 giây** — code chưa có (Xong món hiện không hoàn tác được; Huỷ có hộp xác nhận).
- **Thanh điều hướng 5 mục "Bàn · Bếp · Lịch sử · Kho · Thêm"** — không có màn "Kho" (chỉ có NCC); nav thật **khác theo quyền** (admin 9 mục, bếp 7, order 5, báo cáo 5).

### 1c. Phần khung app chưa vẽ
Header (tên quán, chip người dùng theo quyền, 🔔, Đăng xuất) · **dải "📱 n bàn QR"** (duyệt lượt gọi món, gọi nhân viên, xin tính tiền) · **dải đỏ "⚠ n bàn chưa trả"** · hộp Thông báo 🔔 · hộp xác nhận 5 kiểu · hộp "Phiên đăng nhập đã hết hạn" · dải DEV · badge trên nav.

## 2. Màn chưa vẽ gì

**Quản lý (`apps/web`)**
- Gọi món (tìm viết tắt, tab nhóm + "🔥 Nên mời", lưới món, giỏ — tấm trượt trên điện thoại)
- Hoá đơn tự do + nhật ký đã in · Bàn ăn (thêm / thêm hàng loạt)
- Đơn online: hàng chờ (4 tab, chặng, bản đồ), thẻ đơn (khách, km, phí ship, sửa món, chuyển hình thức, từ chối 5 lý do + chặn số) · Món online · Thống kê truy cập
- Cài đặt 7 tab: nhận đơn & giờ mở cửa (bảng phí giao nhiều bậc), số bị chặn, top món, mã QR nhận tiền, mã QR gọi món, máy in (+ cầu in, hàng đợi), cảnh báo bàn
- Menu: danh sách + % nguyên liệu, nhóm, thêm/sửa món, Import Excel, Menu xem (sắp trang), Combo gợi ý, **Công thức nguyên liệu** (màn chữ to cố ý)
- Lịch sử: 6 tab + 8 bộ lọc + ca, KPI, biểu đồ, đối soát tiền, bảng đơn, chi tiết + nhật ký đơn, Misa, in lại
- Dashboard · Sổ webhook ngân hàng (+ gán vào đơn)
- NCC 8 tab + chi tiết NCC, trả tiền, nợ cũ, tài khoản NCC, mẫu hoá đơn, phiếu nhập + duyệt giá, ảnh phiếu, biến động giá, lịch sử giá, giá vốn món, món đã bán, danh mục nguyên liệu (gộp)
- Cổng NCC `/ncc` · Nhân sự (+ quyền thu CK, mã QR theo nhân viên) · Nhật ký hệ thống
- Đăng nhập · Setup lần đầu (mã khôi phục) · Khôi phục · Tài khoản · Cầu in

**Trang khách (`apps/shop`)**
- Đặt online: menu, giỏ (+ sửa đơn), thông tin nhận hàng (GPS / nhập tay, phí ship, quá xa, OTP, xác nhận), theo dõi đơn, đơn của tôi, món bán chạy, hướng dẫn, thông báo quán đóng
- QR tại bàn: thực đơn, sheet món (+ ăn kèm), cổng chọn bàn, giỏ, "Món của bàn" (gọi NV / xin tính tiền), bạn nhỏ đồng hành
- Trang chụp ảnh món `/anh-mon`

## 3. Lỗi / lệch phát hiện khi kiểm kê (chưa sửa — ghi để xử lý riêng)
1. `/admin/audit` phân trang không chạy, luôn trang 1 (AdminAuditPage.tsx:49-55).
2. Sơ đồ bàn dừng cập nhật thì nhắc bấm "↻ Làm mới" nhưng nút đã bị gỡ (OrdersPage.tsx:148, 569).
3. Hướng dẫn trong drawer & màn Bếp chữ đã lỗi thời so với nút thật.
4. Sửa SL: câu "món chưa giao không ảnh hưởng tiền bàn" lệch với cách tính tổng (OrderDrawer.tsx:1422).
5. Admin không có mục Báo cáo / Tài khoản trên nav; Dashboard chỉ vào được qua trang 404.

## 4. Đề xuất thứ tự vẽ

| Đợt | Màn | Lý do |
|---|---|---|
| **1** | Khung app + nav theo quyền + 2 dải cảnh báo · Sơ đồ bàn (đủ trạng thái) · Chi tiết bàn · **Gọi món** · Thu tiền (4 cách trả, soát bill, QR, chụp bill) · Bếp (2 bảng, 3 chế độ) | Dùng mỗi ngày, mỗi phút; vẽ lại 4 màn đã vẽ cho khớp code |
| 2 | Đơn online · Lịch sử · Hoá đơn tự do · Menu + Công thức | Dùng hằng ngày |
| 3 | NCC + phiếu nhập + Cổng NCC · Cài đặt · Nhân sự | Dùng hằng tuần |
| 4 | Trang khách: đặt online + QR tại bàn | Khách thấy — cần đồng bộ thương hiệu |
| 5 | Báo cáo / thống kê · Sổ ngân hàng · Nhật ký · Đăng nhập · Cầu in | Ít dùng |
