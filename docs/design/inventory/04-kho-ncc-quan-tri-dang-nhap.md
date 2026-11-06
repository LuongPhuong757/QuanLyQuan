# Kiểm kê tính năng — Kho / NCC / Quản trị / Đăng nhập

Nguồn: đọc code `apps/web/src` ngày 2026-11-06. Nhãn nguyên văn, kèm `file:dòng`.
- `/admin/settings` chỉ là chuyển hướng sang `/admin/online-orders?view=settings` (7 tab con — xem `02-bep-don-online.md` §B10).
- **Không có màn tồn kho riêng** — tồn kho chỉ là hệ quả của phiếu nhập.
- **Lỗi đang có:** `/admin/audit` phân trang không chạy (luôn trang 1) — AdminAuditPage.tsx:49-55, 132-144.
- Code chết, không cần vẽ: `SupplierBalancePanel`, `PriceChangesPanel`, `PriceMatrixPanel`.

## A. Nhà cung cấp — `pages/SuppliersPage.tsx` (`/suppliers`, admin + report)
- Nav "🚚 NCC" (admin có badge phiếu chờ duyệt). Report được lập **phiếu nháp**.
- **Tab** (cuộn ngang): Tổng quan · Thống kê · Chuyển khoản NCC (admin) · Phiếu nhập · Biến động giá · Mặt hàng nhập · Giá vốn món · Món đã bán.
- Nút admin: "Mặt hàng" (danh mục nguyên liệu) · "＋ Nhập hàng". Đầu trang: "Tổng mua" · "Tổng nợ". Nút "Xuất Excel" ở một số tab. Kỳ xem dùng chung, mặc định 30 ngày.
- **Thêm / Sửa NCC**: Tên, SĐT, "Số tiền đang nợ" (khi tạo), Xoá.
- **FilterBar dùng chung** (5 màn): kỳ Tất cả / Hôm nay / 7 / 30 ngày / Tháng này / Tháng trước / Tuỳ chọn (+ Ca này / Ca trước), Từ–Đến, NCC, ô tìm, dòng "Đang xem".

### A1. Tổng quan (`SupplierOverview.tsx`)
- KPI: Tổng còn phải trả (+ nợ lớn nhất) · Tổng mua kỳ này · Số NCC đang nợ.
- **"Cần bạn xử lý"**: Phiếu nháp chờ duyệt · Mặt hàng vừa tăng giá ≥10% · Còn nợ mà lâu chưa giao (≥30 ngày).
- Danh sách NCC: tìm tên/SĐT, sắp xếp (Nợ nhiều / Mua nhiều / Nhập gần đây / A→Z), chip Tất cả / Đang nợ / Hết nợ; dòng: avatar chữ, tên, SĐT, tiền kỳ, số phiếu, nợ đỏ / "Hết nợ", lần giao gần nhất.

### A2. Chi tiết NCC (`SupplierDetailScreen.tsx`)
- "Còn phải trả" to, lần trả gần nhất, [Gọi …].
- Admin: Nhập hàng · Trả tiền · Sửa thông tin · Mẫu hoá đơn · Tài khoản NCC · Xoá. Report: Lập phiếu nháp.
- **Sổ giao dịch** (lọc Tất cả / Phiếu nhập / Thanh toán): phiếu +tiền đỏ, trả −tiền xanh, dư sau mỗi dòng, số dư đầu kỳ.
- Tóm tắt kỳ; liên hệ; **Mặt hàng hay giao** (giá hiện tại, thay đổi %, số lần, lần cuối).
- Hộp con: **Ghi nhận thanh toán** (số tiền, ngày, Chuyển khoản / Tiền mặt, tài khoản nguồn, ghi chú) · **Nợ cũ (số dư đầu kỳ)** · **Tài khoản NCC** (cấp tài khoản theo SĐT, đặt lại PIN, tắt; PIN hiện một lần) · **Mẫu hoá đơn** (chọn món, Tải Excel / CSV).

### A3. Thống kê (`SupplierStatsPanel.tsx`)
- Kỳ; tổng nhập / số phiếu / số NCC; biểu đồ chi theo thời gian (đường theo NCC + cột chồng); thẻ NL chính / bán nguyên / phụ (+ % phụ / doanh thu); "📉 Nợ mới và tiền đã trả" (3 nút bật/tắt); "🏦 Còn nợ NCC"; "🏧 Tiền vào / ra theo tài khoản"; bảng mặt hàng nhập nhiều nhất (sắp xếp, 15/trang); phiếu nhập lớn nhất; đã trả cho NCC.

### A4. Chuyển khoản NCC (`SupplierTransfersPanel.tsx`, admin)
- "💳 Trả tiền NCC" + "＋ Ghi trả NCC"; tổng quan kỳ (đã trả, CK / tiền mặt, còn nợ, trả cho ai nhiều nhất); thẻ theo tài khoản nguồn (lọc); danh sách theo ngày, Sửa / Xoá (điện thoại: ⋯ bảng đáy).

### A5. Phiếu nhập (`SupplierDeliveryScreen.tsx`)
- Nút "Tạo phiếu nhập" / "Lập phiếu nháp"; tìm theo mặt hàng trong phiếu; trạng thái Tất cả / Phiếu nháp / Phiếu nhập / Phiếu huỷ.
- Bảng: Ngày, NCC, Số tiền, Người nhập, Trạng thái (Đã nhập xanh / Phiếu nháp – chờ duyệt vàng / Đã huỷ xám), Ảnh, [Xem chi tiết] [Sửa]; 15/trang.
- **Chi tiết phiếu** (`DeliveryDetailDialog.tsx`): [Duyệt phiếu] [Huỷ phiếu] [Sửa phiếu] theo quyền; bảng mặt hàng (giá tăng / giảm / lần đầu); ghi chú; ảnh; duyệt → hộp đổi giá.
- **Form phiếu nhập** — xem `02-bep-don-online.md` §C.
- **Ảnh phiếu** (`DeliveryPhotosDialog.tsx`): lưới ảnh, phóng to, xoá có xác nhận.
- **Phiếu nháp của bạn** (report, `MyDraftsBlock.tsx`).

### A6. Biến động giá (`SupplierPriceScreen.tsx`)
- Xu hướng giá 8 lần nhập gần nhất (top 5 món); nhóm Tăng mạnh ≥20% / Tăng đáng chú ý 10–20% / Tăng nhẹ / Giảm; **So giá giữa các NCC** (rẻ nhất tô xanh).

### A7. Mặt hàng nhập (`SupplierReports.tsx`)
- Lọc nhóm Chính / Phụ / Bán nguyên; **Xuất Excel** (CSV); bảng: Mặt hàng (mở lịch sử giá) · Nhóm (sửa tại chỗ) · NCC · Lần · Lượng · Tổng tiền · Bình quân · Gần nhất; quy đổi về đơn vị mua.
- **Lịch sử nhập & giá** (`SupplierPriceHistory.tsx`): KPI, biểu đồ so sánh ngày nhập (Lượng / Tiền / Đơn giá; 30 / 90 ngày / Tất cả), bảng từng lần nhập.

### A8. Giá vốn món (`FoodCostPanel.tsx`)
- Chi phí NL phụ thực tế 90 ngày; cảnh báo món thiếu giá; bảng: Món (mở ra từng NL) · Giá bán · % phụ (admin sửa tại chỗ) · Giá vốn · Lãi/phần · **Biên LN** (<25% đỏ, <50% vàng); biên mỏng nhất lên đầu.

### A9. Món đã bán (`DishSalesScreen.tsx`)
- Lọc ca / tìm / nhóm; KPI doanh thu, số phần, số món; bảng sắp xếp được, mở một món → danh sách đơn đã gọi.

### A10. Danh mục nguyên liệu (`IngredientsPanel.tsx`, admin)
- Tìm, chip nhóm, dòng (đơn vị, dùng ở N món, nhóm sửa tại chỗ), Sửa · **Gộp** · Xoá (chặn nếu đang dùng); form tên, đơn vị (khoá nếu đang dùng), ghi chú.

## B. Cổng NCC — `pages/NccPortalPage.tsx` (`/ncc`, công khai, token NCC)
- Đăng nhập SĐT + PIN 6 số ("Quên mã PIN? Gọi cho quán").
- Trang chủ: tên NCC, [Thoát], nút to "＋ GIAO HÀNG HÔM NAY", danh sách phiếu đã gửi + trạng thái.
- Soạn "Hôm nay giao gì?": mặt hàng từng giao, nút −/＋ 56px, ô số, ĐVT; thanh dính "{n} mặt hàng · tổng · GỬI"; NCC không được đặt giá; "✅ Đã gửi!".

## C. Quản trị
### C1. Nhân sự — `pages/AdminUsersPage.tsx` (`/admin/users`, admin)
- Lọc Tất cả / Đang làm / Tạm nghỉ + chip quyền (👑 Admin / 🍽 NV Order / 👨‍🍳 NV Bếp / 📊 Báo cáo / 🖨 Máy in).
- Thẻ nhân viên: avatar, tên, tài khoản, quyền (hoặc "⚠ Chưa gán quyền"), trạng thái; công tắc **"Thu chuyển khoản"** + "Mã QR được dùng" (ẩn x/y mã).
- ⋯: Sửa · Đổi mật khẩu · Tạm nghỉ / Cho làm lại · Xoá vĩnh viễn.
- Tạo nhân viên (tên, tài khoản, mật khẩu ≥8 + đo độ mạnh, 5 ô quyền); Sửa; Đổi mật khẩu (hoặc sinh mật khẩu tạm — đăng xuất mọi máy); **Mã QR của nhân viên** (bật/tắt từng mã).

### C2. Nhật ký hệ thống — `pages/AdminAuditPage.tsx` (`/admin/audit`, admin, chỉ vào từ Dashboard)
- Lọc theo hành động / người; bảng Thời gian · Người làm · IP · Hành động · Đối tượng; "📥 CSV"; phân trang (đang lỗi).

### C3. Cài đặt — xem `02-bep-don-online.md` §B10 (7 tab).
- Bổ sung: Mã QR nhận tiền có tick **"Đây là mã QR của HKD"** (bật nút Misa ở Lịch sử), "Quét thử"; Máy in có cảnh báo "Không có cầu in nào đang chạy" + mục "Hoá đơn tự do đã in".

## D. Đăng nhập & tài khoản
- **Header** mọi màn: "Quán Bà Lùn · QUẢN TRỊ", chip người dùng theo quyền, 🔔, Đăng xuất.
- **Đăng nhập** `/login`: tài khoản, mật khẩu (👁, cảnh báo Caps Lock, đo độ mạnh), "Quên mật khẩu? Nhập mã khôi phục". Màn đầu theo quyền: bếp → /kitchen, order → /orders, report → /dashboard, máy in → /print-bridge, admin → /orders.
- **Setup lần đầu** `/setup`: tạo chủ quán (mật khẩu ≥12) → hiện **mã khôi phục một lần**.
- **Khôi phục** `/recover`: mã 16 ký tự + mật khẩu mới.
- **Tài khoản** `/account`: thông tin + đổi mật khẩu (nav "T/khoản" cho order / kitchen / report; admin không có trên nav).
- **Cầu in** `/print-bridge` (máy POS Android): cảnh báo WebUSB / chưa bật in / đang để LAN / cầu chưa chạy; trạng thái; tự ghép; token; [Kết nối máy in] [In thử tại chỗ] [Bắt đầu / Dừng]; giữ màn sáng; nhật ký.

## E. Luật nghiệp vụ xuyên suốt
- Đơn vị: DB g/ml, màn hiện KG/L; ≥1000 g/ml hiện kg/l; đơn vị viết hoa.
- Sửa phiếu → tính lại tồn kho, công nợ, bảng giá và biến động giá của các phiếu sau (price replay).
- Phiếu nháp không tính vào tổng / công nợ cho tới khi admin duyệt.
- "Còn nợ" luôn là số mọi thời điểm, kể cả khi màn đang lọc kỳ.
- Chặn ngày tương lai cho phiếu nhập và lần trả; so ngày theo giờ VN.
