# Kiểm kê tính năng — Bàn / Order / Thanh toán

Nguồn: đọc code `apps/web` ngày 2026-11-06. Mỗi mục kèm `file:dòng`. Nhãn tiếng Việt chép nguyên văn.

**KHÔNG có trong code:** tách bill, giảm giá, gộp bàn (chỉ Chuyển bàn sang bàn trống), in hoá đơn sau
thanh toán (chỉ "In phiếu tạm tính" + "In hoá đơn" tự do).

## 1. Sơ đồ bàn — `apps/web/src/pages/OrdersPage.tsx` (`/orders`)
- Role: admin, order, kitchen (App.tsx:173-175). Link sâu `/orders?table=<id>` mở thẳng drawer (220-233).
- Trạng thái: "Đang tải bàn...", "Chưa có bàn nào…", `Không có bàn khớp filter "{label}".` (575-620)
- **Lọc** (vuốt ngang, 41-52, 590-615): Tất cả · 🔥 Đang dùng · 🥡 Mang về · 🛵 Giao hàng · 🍽 Còn món chưa giao · ⚪ Trống · 🔒 KiotViet · 🪑 Tại quán — mỗi nút kèm `(n)` đếm trên toàn bộ.
- **Lưới** `minmax(150px)`; sắp xếp tại quán trước (y, x), còn lại theo mã (292-302).
- **Thẻ bàn** (304-565):
  - Tên + mã (monospace); đồng hồ từ lần báo bếp đầu `45p / 1h5p` (433-452).
  - Ưu tiên màu (380-399): bếp chậm ≥15' chưa giao món nào = đỏ · có lượt QR chờ duyệt = tím · đã giao hết = xanh lá · có món đang xử lý = nền theo loại bàn (vàng tại quán / xanh dương mang về / xanh lá ship) · còn lại trắng.
  - Badge "📱 {n} lượt chờ duyệt" (455-472); chip vòng đời món ✎ gọi · 📢 báo bếp · 🔥 đang làm · ✓ xong + số (491-509); chip "📱 QR" (476-490); "🍽 {n} đã giao" (512-526); "Trống — bấm để gọi món" (528-536).
  - Nút 🔒 "Đánh dấu bàn dùng KiotViet" khi bàn rỗng & không có QR chờ (538-562, 401-405).
- **Thẻ bàn khoá KiotViet** (306-347): thẻ tím "🔒 KiotViet" → hộp "Bàn đang dùng KiotViet" [↩ Chuyển về hệ thống] / [Đóng] (174-195).
- Chú thích màu "Vòng đời:" (636-664).
- **Tự cập nhật** 2 giây `/tables` `/orders` `/table-requests/pending`; nghỉ khi drawer mở; dừng sau 3 lỗi với toast nhắc nút "↻ Làm mới" — **nút này đã bị gỡ** (148, 569) → không có cách bật lại ngoài đổi màn.

## 2. Drawer chi tiết bàn — `apps/web/src/components/OrderDrawer.tsx`
- Đầu (594-768): tên bàn · badge đơn online "🌐 Đơn online / 🛵 Đang giao / ✓ Khách đã nhận" (601-620).
- **Thẻ lượt QR chờ duyệt** (629-689): "👤 Khách vừa gọi · {n} món", từng món, món hết gạch + "hết — sẽ bỏ", "Tạm tính theo giá hiện tại", [✓ Nhận món] / [✕ Bỏ]; cập nhật 3 giây.
- **Tổng tiền** to (691-700): xanh lá khi có món để thu; "(món X + ship Y)"; mọi món chưa huỷ đều tính tiền (485-493).
- **Menu ⋯** (702-766): ↪ Chuyển bàn · 📝 Ghi chú cho bếp · 🗑 Huỷ cả bàn · 🖨 In phiếu tạm tính (519-534) · ❓ Hướng dẫn. Ba mục đầu ẩn với đơn ONLINE.
- Hộp Hướng dẫn (770-802) — chữ đã lỗi thời so với nút thật.
- Trạng thái: "Bàn chưa gọi món nào…" (947-951), "✓ Đã thanh toán lúc {giờ}" (1032-1045).
- **Khối khách giao hàng** (809-886): tên · SĐT `tel:` · 📍 địa chỉ · km; nguồn địa chỉ (khách chia sẻ vị trí / nhập tay); "🗺 Mở bản đồ chỉ đường"; [Nhập thông tin] / [Sửa].
- **Thanh hành động** (891-944): [🛵 Đã đi ship] (đơn online ship chưa rời quán); [💰 Thanh toán] cả dòng — xám nếu ship chưa rời quán, xanh lá nếu xong hết, cam nếu còn món chưa mang ra.
- **Danh sách món** (953-1026): nhóm theo trạng thái Đang gọi · Đã báo bếp · Đang làm · Xong, chờ giao · Đã giao · Đã huỷ; gộp dòng cùng món + ghi chú thành "N×".
- **Thẻ món** (1630-1868): viền trái theo trạng thái · "⭐ ƯU TIÊN" · dòng ghi chú bếp "📝" giá 0 · đồng hồ "⏱ Đã chờ X" (vàng >10', đỏ >20' kèm "⚠ … quá lâu") · "👤 NV gọi" · lý do huỷ.
  - Nút luôn hiện: "📢 Báo bếp" / "🍽 Đã giao" · "⭐ Ưu tiên" / "★ Bỏ ƯT".
  - Hàng ẩn (vuốt ngang ≥40px hoặc nút "⋯"): [✎ Sửa SL] · [✕ Huỷ] / [⚠ Huỷ] (đã qua bếp) / [↩ Trả món] (đã giao).
  - Huỷ / Trả món có xác nhận, không hỏi lý do (335-371).
- **Huỷ cả bàn** (389-443): hộp nguy hiểm, ô đỏ "Số tiền bị xoá khỏi bill −X".
- **Nút + tròn** góc dưới phải → Gọi món; ẩn với đơn ONLINE (1049-1066).
- Thông báo sau thanh toán: thường / ghi nợ / kèm "N món chưa mang ra" / "chuyển khoản → mã" / "tiền mặt X + CK Y" (546-564).
- Tự cập nhật 2 giây (211-233).
- **2a DeliveryInfoModal** (1139-1267): Tên người nhận · SĐT 10 số · Địa chỉ; [Huỷ] / [Lưu thay đổi].
- **2b ServiceNoteModal** (1269-1382): "Cần bếp chuẩn bị gì?", chọn nhanh Lấy bát · Đũa thìa · Nước mắm · Thêm đá · Giấy ăn; tick "Báo bếp luôn"; [📝 Gửi ghi chú].
- **2c EditQtyModal** (1384-1628): [−] ô số [+] [Bỏ hết] 0–99; tóm tắt thay đổi (bớt / bỏ hẳn / gọi thêm + ảnh hưởng tiền); "Lý do (không bắt buộc)" khi giảm; nút [Lưu: N → M phần] đỏ khi giảm. ⚠ chữ "món chưa giao không ảnh hưởng tiền bàn" lệch với cách tính tổng.
- **2d TransferTableModal** (1870-1972): chỉ sang bàn TRỐNG, bàn bận hiện mờ "🔴 chưa thanh toán"; xác nhận "Chuyển bàn?".

## 3. Gọi món — `apps/web/src/components/BulkOrderModal.tsx`
- "Gọi món · {bàn}" / "Chọn món · Hoá đơn tự do" (1030-1038).
- **Tìm**: "🔍 Tên, mã hoặc viết tắt (vd: ktl = khoai tây lắc)", không dấu + viết tắt; giữ chữ & con trỏ sau khi chọn (263-274, 1043-1067).
- **Tab nhóm** cuộn ngang: Tất cả · "🔥 Nên mời" (bếp đẩy bán) · nhóm theo cấu hình (241-245, 1068-1080).
- **Lưới món** (62-111, 1082-1099): mã · tên 2 dòng · nhóm · đơn vị · giá; "🚫 HẾT"; chạm +1 (≤99), badge SL; nút "Ghi chú" / "📝 …".
- Tự thêm khăn lạnh/khăn ướt ×5 cho bàn tại quán mới (182-195; `packages/schemas/src/auto-items.ts:35-44`).
- Ô ghi chú món: "vd: ít cay, không hành..." [Xoá chữ] [Xong] (1249-1275).
- **Giỏ máy tính** ≥768px (1103-1137): "{n} món · {m} phần", Xoá hết; dòng: tên · tiền · [−] số [+] · ghi chú · 🗑 Xoá; "Tổng tạm tính" + [Báo bếp] / [Thêm vào hoá đơn].
- **Điện thoại**: thanh dưới "Xem đơn và xác nhận lại" + badge số phần (1146-1165) → tấm giỏ trượt lên: [+ Gọi thêm món] [Báo bếp] (1169-1244).
- Gửi = báo bếp luôn; toast "📢 Đã báo bếp N món (M phần) — {tiền}" (318-359).

## 4. Thu tiền — `apps/web/src/components/CheckoutDialog.tsx`
- Mở từ 💰 Thanh toán (drawer) và 💰 **Thu nợ** ở Lịch sử (chế độ `settleDebt`, HistoryPage:790-795).
- 4 màn: 🧾 Soát bill → 💰 Khách trả bằng gì? → 📱 Khách quét mã → ✅ Xác nhận (119-139, 498-514). Đầu hộp vàng nếu còn món chưa mang ra.
- "Tổng cần thu" + "N món X + phí ship Y" (523-533).
- **Soát bill** (535-564, 867-917): ✓ Đã giao (tính tiền) · ⚠ N món CHƯA MANG RA (vẫn tính tiền) · Đã huỷ (gạch giá); người không được thu CK thấy "📒 Khách nợ, ghi sổ →".
- **Hình thức** (570-608): 💵 Tiền mặt · 🏦 Chuyển khoản · 💵+🏦 **Cả hai** · 📒 **Ghi nợ** (ô "Ai nợ?", cảnh báo chưa vào doanh thu). CK chỉ khi `can_collect_transfer`. Không chọn sẵn (91-100).
- **Quét mã** (609-643, 746-862): "Cả hai" có ô số tiền CK + "Còn lại thu tiền mặt"; chọn mã QR (không chọn sẵn, thứ tự theo cài đặt); VietQR có số tiền · NH · STK · tên · nội dung CK; mã dạng ảnh nhắc khách gõ tiền; các lỗi không tải được / không có mã; mã đơn 6 số chạy ngầm (241-263).
- **Chụp bill** (939-1119): bắt buộc với CK — 📷 Chụp / 🖼 Chọn ảnh, ảnh thu nhỏ, xoá ảnh; "Không chụp được bill?" → lý do.
- Chân (663-707): [Huỷ] / [← Quay lại]; nút chính đổi chữ theo màn; **không dùng disabled**, bấm thì toast lý do (`lib/checkout-block.ts`). Tiền mặt / Ghi nợ chốt ở màn 2; CK luôn qua chụp bill.

## 5. Hoá đơn tự do — `apps/web/src/pages/CustomReceiptPage.tsx` (`/custom-receipt`)
- Role admin, order, kitchen. "…không tính doanh thu, không trừ kho, không tạo đơn."
- "Ghi chú đầu tờ"; dòng món: SL [−][+], ⋯ sửa Tên · Đơn giá · Ghi chú · Bỏ dòng; [+ Chọn món từ menu] [+ Dòng tự gõ]; "Phí giao hàng", "Khách chuyển khoản"; TỔNG CỘNG; [🖨 In hoá đơn].
- **Nhật ký đã in** `CustomReceiptsLog.tsx` (admin): 50 tờ gần nhất, [Chi tiết] [In lại].

## 6. Bàn ăn — `apps/web/src/pages/TablesManagementPage.tsx` (`/tables`, admin)
- [+ Hàng loạt] [+ Thêm]; lọc Tất cả · Tại quán · Mang về · Giao hàng; thẻ: tên, mã, loại, vị trí (x,y), [Sửa] [Xoá].
- TableFormModal: Mã bàn (tự viết hoa, khoá khi sửa) · Tên · Loại (3 nút) · Vị trí X/Y.
- BulkTablesModal: loại · Từ số · Đến số · xem trước · tối đa 100.

## 7. Khung app — `apps/web/src/App.tsx` + components
- **Header** (398-439): tên quán · chip người dùng theo role (👑 Admin · 🍽 Order · 👨‍🍳 Bếp · 📊 Báo cáo · 🖨 Máy in) · 🔔 · Đăng xuất. Ẩn ở `/kitchen`.
- **Nav dưới theo role** (cuộn ngang):
  - admin: Order · H/đơn · L/sử · Bếp · Menu · Bàn · Online · NCC · N/viên (9 mục)
  - order: Order · Online · N/ký · H/đơn · T/khoản
  - kitchen: Bếp · Online · Order · Menu · N/ký · H/đơn · T/khoản (7 mục)
  - report: B/cáo · N/ký · NCC · T/cập · T/khoản
  - Badge: Order (bàn mở, xanh) · Bếp (món chờ, đỏ) · Online (đơn chờ, đỏ, realtime SSE) · NCC (phiếu chờ duyệt). Tiêu đề tab "(N) Đơn mới".
- **GuestQrBanner** (+ GuestRequestCards): dải trên "📱 {n} bàn QR", chuông; chip tím = gọi món (nhấp nháy >3'), xanh = gọi nhân viên, vàng = xin tính tiền; hộp duyệt lượt [✓ Duyệt cả lượt] [✕ Bỏ lượt]; hộp lời nhắn [✓ Đã nghe].
- **StaleTableBanner**: dải đỏ "⚠ {n} bàn chưa trả", chip → mở bàn; không tắt được.
- **NotificationBell**: badge chưa đọc, hộp "🔔 Thông báo" theo loại, [🗑 Xoá hết].
- **Toast**: chỉ lỗi hiện trên màn; thành công ghi vào sổ 🔔.
- **ConfirmDialog**: default / danger / warning / success / info; Esc / Enter; dạng prompt.
- **ReadyListener**: beep + ghi sổ theo role (món xong, món mới, hết món, huỷ, chuyển bàn, thanh toán).
- **ReLoginModal**: "Phiên đăng nhập đã hết hạn", nhập lại mật khẩu, giữ trang.
- **EnvBanner**: dải "⚠ MÔI TRƯỜNG DEV".

## 8. Liên quan, ngoài phạm vi nhóm này
- Nhãn "🌓 Ca trước" ở Lịch sử (HistoryPage.tsx:1450; luật `lib/date-range.ts:173-195`); chip "🌓 Ca trước" trong `TimeRangeFilter.tsx:154`.
- CheckoutDialog dùng lại cho Thu nợ — thiết kế mới phải giữ chế độ `settleDebt`.
- "Không chọn sẵn mã QR / hình thức trả" — chủ quán chốt (CheckoutDialog.tsx:91-105).
