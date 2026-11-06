# Kiểm kê tính năng — Menu / Lịch sử / Báo cáo

Nguồn: đọc code `apps/web/src` ngày 2026-11-06. Nhãn nguyên văn, kèm `file:dòng`.
- Không có xuất Excel / in ở Báo cáo. Excel chỉ ở Import menu + tải template; in chỉ "🖨 In lại hoá đơn" ở Lịch sử.
- Admin KHÔNG có mục Báo cáo / Thống kê trên nav; vào Dashboard chỉ qua trang 404. `/admin/bank-ledger` không có trên nav, chỉ vào từ link ở Lịch sử.

## 0. Route & role (`App.tsx`)
- `/menu` admin + kitchen · `/history` admin + order + kitchen + report (nhãn "L/sử" / "N/ký") · `/dashboard` & `/admin/analytics` admin + report · `/admin/bank-ledger` admin.

## 1. Menu — `pages/MenuManagementPage.tsx` (`/menu`)
- Quyền: `canManage` = chủ quán / admin; bếp chỉ thấy "Hết / Có lại" + "🔥 Đẩy bán".
- Thanh công cụ: "Nhóm" · "📥 Import" · "📖 Menu xem" · "🎯 Combo gợi ý" · "+ Món".
- Lọc: tìm tên/mã · sắp xếp (Mới nhất / A→Z / Theo nhóm / Giá cao / Giá thấp / Tiền NL cao / % NL cao) · "✕ Xoá lọc" · chip tình trạng (Tất cả / ✅ Còn hàng / 🚫 Hết hàng / 🔥 Đang đẩy bán / 📷 Chưa có ảnh) · cột nhóm bên trái (hàng ngang trên điện thoại).
- Danh sách 30 món/trang, "Hiển thị a–b của N món".
- **Thẻ món** (521-682): ảnh (bấm phóng to) · mã · tên · nhóm · ĐVT · giá · badge **"% NL"** (đỏ >75 / vàng >50 / xanh) · nhãn HẾT / 🔥 ĐẨY BÁN / ⭐ ĐỀ XUẤT · nút Hết/Có lại · Sửa · Xoá · 🔥 Đẩy bán · "Khai nguyên liệu / N nguyên liệu" · ⭐ Đề xuất (admin). Món hết thì khoá Sửa / Xoá / Đẩy bán / công thức.
- **Quản lý nhóm**: nhóm có icon, tên, mã, loại bếp "🔥 Bếp nấu / 🥤 Có sẵn"; thêm / xoá.
- **Thêm / Sửa món**: Mã (khoá khi sửa) · Tên · Nhóm · Giá · ĐVT · Mô tả ngắn (160, khách đọc ở menu tại bàn) · Mấy người ăn (1–20) · Ảnh (tải lên / dán URL, ≤10MB).
- **Import Excel/CSV**: tải template; xem trước bảng (lỗi đỏ, cảnh báo xanh); tick "Giá trong file là nghìn VND (×1000)" (tự tick); tự tạo nhóm mới; tối đa 500 dòng.
- **📖 Menu xem** (`MenuBookPanel.tsx`) — sắp thực đơn khách xem: chip nhóm (ẩn = 🚫), "↕ Thứ tự nhóm", xem trước theo Điện thoại 2 cột / Máy tính 3 cột, ngắt trang ước lượng, kéo thả món, 👁 Hiện / 🚫 Ẩn, ↑↓, "Ẩn cả nhóm", [Lưu thứ tự].
- **🎯 Combo gợi ý** (`MenuComboPanel.tsx`): danh sách combo bật/tắt, Sửa, Xoá; "✨ Tạo 6 combo mẫu"; sửa combo: icon, tên, chọn món (≥2).
- **📋 Công thức / nguyên liệu món** (`RecipePanel.tsx`) — màn chữ to cố ý: % nguyên liệu phụ (admin sửa, gợi ý theo 90 ngày); tóm tắt giá vốn (NL chính / Hàng bán nguyên / NL phụ / **Giá vốn một phần** + % giá bán); dòng NL (Phụ / Bán nguyên, NCC hoặc "Chưa chọn NCC", định lượng tự đổi g→kg); thêm dòng: tìm hoặc "+ Tạo mới", NCC, đơn vị mua, giá, định lượng nhận phân số "1/24".

## 1b. Món online — `pages/OnlineMenuPanel.tsx` (tab của Đơn online, admin)
- Tìm, chip Đang bán online / Đã ẩn, chip nhóm + "↕ Sắp xếp nhóm", ẩn/hiện cả nhóm, thẻ món: "🚫 Ẩn khỏi web" / "✓ Bán online lại", "📷 Thêm/Đổi ảnh", cảnh báo đang hết.

## 2. Lịch sử — `pages/HistoryPage.tsx` (`/history`)
- Quyền: tiền & thống kê chỉ admin + report; đối soát chỉ admin; order/kitchen chỉ thấy 48 giờ và tiền đơn mình thu; Misa: admin + order; in lại: admin + order + kitchen.
- Đầu: "📊 Quản lý giao dịch" · link "🏦 Sổ webhook ngân hàng" (admin).
- **Lọc**: tab Tất cả / ✓ Đã thanh toán / ⏳ Chưa thanh toán / 🗑 Đã huỷ / 📒 Đang nợ / 📋 Misa; chọn bàn (nhóm bàn ngồi / mang về / ship); thu ngân; hình thức trả; xác thực ngân hàng; ảnh bill (có / thiếu); tài khoản nhận; sắp xếp giờ vào / giờ TT; **thời gian**: Tất cả / 🌙 Ca này (mặc định) / 🌓 Ca trước / Hôm nay / 7 ngày / 30 ngày / 📅 Tuỳ chọn.
- **2 ô KPI** đổi theo tab (Doanh thu đã thanh toán / Tiền đang chờ thu / Giá trị đơn đã huỷ / Khách đang nợ / Doanh thu đã lên Misa).
- **Biểu đồ** (gập sẵn): theo Doanh thu / Số đơn — theo ngày, giờ cao điểm (30'), top món, doanh thu theo thu ngân, tiêu hao nguyên liệu, tỉ lệ thanh toán (donut).
- **Đối soát tiền** (admin, gập sẵn): 💵 Tiền mặt phải có trong két · 🏦 CK phải về ngân hàng · Tổng thu · 📒 Đang nợ · tiền về từng tài khoản.
- **Bảng đơn**: Giờ vào · Giờ TT · Bàn (+ khách ship) · Thu ngân · Món (✓ n · huỷ m) · Tổng · Trạng thái · Xác thực · Thao tác; hàng tiêu đề theo ngày + doanh thu ngày; 20/trang.
  - Nhãn: Đã thanh toán (thu nợ) · 📒 Đang nợ · 🗑 Đã huỷ · ⏳ Chưa thanh toán · hình thức trả · **🌓 Ca trước** · ảnh bill "📷 n" / "⚠ Thiếu ảnh".
  - Thao tác: **💰 Thu nợ** (mở CheckoutDialog chế độ thu nợ) · 📋 Misa ✓ / Chưa Misa · ⋯ (🖨 In lại hoá đơn · 📒 Chuyển sang nợ) · ▼ mở chi tiết.
- **Chi tiết đơn**: thông tin CK + nội dung, lý do không chụp bill, ảnh bill, ghi nợ / đã thu nợ, khách ship, món theo trạng thái (NV gọi, người giao, lý do huỷ), **🧾 Nhật ký đơn** (che tiền với nhân viên).

## 3. Báo cáo
### 3a. Dashboard — `pages/DashboardPage.tsx` (`/dashboard`)
- "Chào {tên}!"; widget **Nhận đơn online** (admin): trạng thái + [Tắt nhận đơn] / [Bật lại nhận đơn] + link cài đặt.
- Thẻ "Truy cập nhanh": admin (Nhân viên, Truy cập & khách hàng, Nhà cung cấp, Nhật ký hệ thống, Cài đặt nhận đơn); report (Doanh thu & đơn đã bán, Giá vốn & NCC, Truy cập & khách hàng); mọi người (Đổi mật khẩu).

### 3b. Truy cập & khách hàng — `pages/AdminAnalyticsPage.tsx` (`/admin/analytics` + tab "📈 Thống kê")
- Kỳ Hôm nay / 7 / 30 / 90 ngày + ↻; "🟢 N khách đang xem web"; KPI lượt vào, thiết bị, lượt xem, đơn online + tỉ lệ chuyển đổi.
- Biểu đồ lượt vào theo ngày (kèm đơn), giờ đông khách, trang xem nhiều.
- Khách chia sẻ vị trí (tỉ lệ hỏng, bảng lỗi gần nhất); Giỏ hàng đang treo; Số điện thoại khách (mới / quay lại); bảng **Khách đặt nhiều nhất**.

### 3c. Sổ webhook ngân hàng — `pages/BankLedgerPage.tsx` (`/admin/bank-ledger`)
- Tổng quan: Tiền vào / Tiền ra / Chênh lệch; thẻ theo tài khoản (bấm để lọc); cảnh báo **Tiền lạ chưa khớp** + **Bàn đã CK nhưng chưa bấm thanh toán**.
- Lọc: khoảng ngày, tài khoản, chiều tiền, tìm nội dung CK.
- Danh sách theo ngày, 20/trang: giờ, ± tiền, tài khoản, 💬 nội dung, liên kết đơn (chưa khớp → [Gán vào đơn]; trạng thái bàn; gán tay + Gỡ); cờ Khách chuyển thiếu / thừa / về sai tài khoản.
- Hộp **Gán vào đơn** (`BankAssignDialog.tsx`): ứng viên + "ĐÚNG SỐ TIỀN", cảnh báo lệch tiền.
