# Kiểm kê tính năng — Trang khách `apps/shop`

Nguồn: đọc code `apps/shop/src` ngày 2026-11-06. Nhãn nguyên văn, kèm `file:dòng`.
Một bundle, **hai trải nghiệm**: (A) đặt online — giao / đến lấy, trên domain chính; (B) thực đơn QR gọi món tại bàn
`menu.<domain>` + `/thuc-don`, không router, không header. Không gắn vào đâu: `MenuBookPage.tsx` (sách lật 3D cũ),
`BrandPreview.tsx`. Không có chọn hình thức thanh toán ở trang khách (trả tiền mặt khi nhận).

## A. Đặt online
### A0. Khung chung
- **Header** máy tính: logo · Trang chủ / Món bán chạy / Đơn của tôi / Hướng dẫn · ô "Tìm món..." · giỏ + badge. Điện thoại: logo · pill "? Hướng dẫn" · 🔍 (lớp tìm) · giỏ · ☰ ngăn kéo phải (`components/Header.tsx`).
- **ActiveOrderBar**: dải dưới header khi máy có đơn đang chạy — chấm nhấp nháy, chặng, "Đơn XXXX", "%", "Xem đơn ›"; hỏi 45 giây.
- **ClosedNotice**: thẻ cố định đáy (trừ checkout) "Quán đang không nhận đơn online" + đếm ngược / giờ mở lại / câu của chủ quán; "Bạn vẫn xem được menu và giữ món trong giỏ nhé."
- **Footer**: địa chỉ (Google Maps), SĐT, Facebook / Instagram / Zalo.
- ErrorBoundary "Quán vừa cập nhật trang" / "Trang đang gặp trục trặc" + [Tải lại trang]; EnvBanner dev.

### A1. Menu `/` (`pages/MenuPage.tsx`)
- Món hết bị ẩn; nhóm hết sạch bị ẩn.
- **Thanh nhóm** cuộn ngang: "Tất cả" + ô nhóm có màu pastel + ảnh món đại diện, chấm phân trang (`components/CategoryRail.tsx`).
- Mỗi nhóm một mục H2 + lưới thẻ.
- **Thẻ món** (`CardItem.tsx`): ảnh · tên · giá · nút "+" → thành "− SL +" (gõ được, ≤99). Không có trang chi tiết món.
- Toast "Đã thêm {món} vào giỏ" (lần đầu).
- Tìm kiếm: tên, mã, tên nhóm, không dấu; "{n} món khớp «q»" + Xoá; không thấy → gợi ý + khối "Hay được gọi nhất" (4 món thêm được ngay).
- Banner: giỏ cũ đã dọn (24h); giá đã cập nhật; lỗi tải menu + Thử lại; khung xương 6 thẻ khi tải.

### A2. Giỏ `/cart` (`pages/CartPage.tsx`)
- Bước "1 Giỏ hàng → 2 Thông tin nhận hàng"; "GIỎ HÀNG CỦA BẠN" + "{n} món"; "+ THÊM MÓN".
- Banner đặt lại đơn cũ (liệt kê món hết / không còn bán); giỏ cũ đã dọn.
- Dòng: ảnh · tên · chip "Hết hàng" · giá/món · − SL + · thành tiền · "Xoá món này" (không hỏi lại) · "Thêm ghi chú" (255).
- "Ghi chú cho cả đơn" (500, đếm còn lại sau 400).
- Tóm tắt: Tạm tính (số chạy) · Phí giao "chọn ở bước sau" · Tổng cộng.
- Nút dính đáy "TIẾP TỤC" (khoá nếu còn món hết, kèm lời nhắc).
- Giỏ trống: hình minh hoạ + [Xem menu].
- **Chế độ sửa đơn** (từ trang theo dõi): thanh "Đang sửa đơn XXXX" + [Thoát]; thẻ địa chỉ giao; nút "CẬP NHẬT ĐƠN".

### A3. Thông tin nhận hàng `/checkout` (`pages/CheckoutPage.tsx`)
- Bước 2, "← Quay lại giỏ hàng", banner quán đóng.
- **Nhận hàng**: "Giao tận nơi" (mặc định) / "Đến lấy tại quán"; hình thức tắt hiện "đang tạm ngưng".
- Họ và tên · Số điện thoại (điền sẵn từ đơn trước).
- **Địa chỉ giao** (`DeliveryAddress.tsx`, `LocationPicker.tsx`, `AddressSelect.tsx`, `LocationMap.tsx`):
  - GPS (mặc định): [Chia sẻ vị trí của bạn] → đang lấy → "✓ Đã có vị trí"; lỗi: bị chặn quyền (có hướng dẫn iPhone), hết giờ, trình duyệt trong app, mất sóng; cảnh báo độ chính xác thấp; "Xem trên bản đồ", "Lấy lại vị trí".
  - Bản đồ (nếu bật): kéo ghim / chạm đúng nhà.
  - Tỉnh / xã tự điền theo GPS.
  - "Nhập địa chỉ thay": chọn Tỉnh (có thể khoá "Quán chỉ giao trong {tỉnh}") + Xã/Phường có tìm kiếm; "📍 Dùng vị trí hiện tại thay".
  - "Số nhà, thôn/xóm, ngõ".
- Ghi chú đơn (tóm tắt) + "Sửa".
- **Tóm tắt tiền**: Tạm tính · **Phí giao** (3 mức chính xác: phí chính xác + km / chỉ km / "do quán xác nhận khi gọi lại") · **Quá xa** (banner đỏ + [Đổi sang Đến lấy tại quán] / [Gọi quán], khoá đặt) · gợi ý "Thêm {x} nữa → phí giao còn …" · "Xem bảng phí giao hàng" (`ShipFeeTable.tsx`, dòng "Đang áp dụng") · "Dự kiến {min}–{max} phút" · Tổng cộng.
- Nút dính đáy **"ĐẶT HÀNG"** — "Đang gửi đơn...", "⏰ Mở lại sau mm:ss", các dòng nhắc lỗi.
- **OTP** (nếu bật, `OtpSheet.tsx`): 6 ô, "XÁC MINH", "Gửi lại mã (Ns)".
- **Hộp "Kiểm tra lại đơn hàng"**: hình thức, tên · SĐT, địa chỉ, có/không kèm GPS, ghi chú, món, tiền, 📞 "quán sẽ gọi điện xác nhận"; [Quay lại] [XÁC NHẬN ĐẶT HÀNG].
- Lỗi gửi đơn kèm hành động: Xem đơn đang chờ / Về giỏ hàng / Gọi quán / Thử lại.

### A4. Theo dõi đơn `/o/:token` (`pages/OrderTrackPage.tsx`)
- Hỏi 8 giây. "Đang chờ xác nhận" / chặng; "Mã đơn"; nhắc chú ý điện thoại.
- Banner "Quán đã cập nhật đơn của bạn" (30 giây).
- **Tiến độ**: %, các bước (`OrderStepper.tsx`) — Giao: Quán đã nhận đơn → Đã xác nhận → Đang chuẩn bị → Đã xong, chờ người giao → Đang giao → Đã nhận hàng; Đến lấy: … → Món đã xong, chờ bạn đến lấy → Đã lấy hàng; ETA.
- Bị từ chối / tự huỷ: banner đỏ + lý do.
- Danh sách món, ghi chú, tiền (tạm tính → chốt).
- Khi chờ: [Sửa đơn] [Huỷ đơn] (hộp "Huỷ đơn này?"). Khi kết thúc: [Đặt lại đơn này]. Không sửa được: SĐT quán.
- Lỗi "Không tìm thấy đơn này" + Về menu.

### A5. Đơn của tôi `/history`
- Tra theo SĐT (điền sẵn, tự tra); OTP nếu bật.
- Thẻ đơn: ngày · chip trạng thái · ≤3 món "+N món khác" · hình thức · tạm tính · "›"; "↻ Đặt lại đơn này".
- Trống "🍲 Chưa tìm thấy đơn nào…"; lỗi + Thử lại.

### A6. Món bán chạy `/top`
- "Món được yêu thích" + kỳ đếm; hạng 1–3 nổi bật; thanh độ phổ biến; "{qty} đã bán"; thêm vào giỏ ngay; trạng thái tạm ẩn / chưa đủ dữ liệu.

### A7. Hướng dẫn `/guide`
- Bảng chú thích 8 icon; 7 bước có tranh minh hoạ (Chọn món, Giỏ, Thông tin, OTP, Đặt & theo dõi, Sửa/huỷ, Đặt lại); mục Phí giao hàng + bảng phí; [Bắt đầu đặt món].

## B. Thực đơn QR gọi món tại bàn (`pages/MenuOrderPage.tsx`, `components/DineInSheets.tsx`, `components/MenuMascot.tsx`)
- **Header dính** một hàng: logo · "Tìm món…" · chip bàn ("BÀN CỦA BẠN / Chưa chọn" hoặc "{Bàn N} / Xem món đã gọi").
- **Thanh nhóm dính**, chip tự sáng theo vị trí cuộn.
- **Danh sách**: mỗi nhóm H2 + thẻ một dòng (ảnh, tên, ĐVT, giá, "+" → "− N +", ≤20 phần, ≤20 dòng); chạm thẻ mở sheet món.
- **Nút giỏ nổi** "🛒 {n} món đã chọn / Chạm để gửi cho quán".
- **Sheet "Thêm món"**: ảnh lớn, tên, giá, "👥 Khoảng N người ăn", mô tả, − SL +, ghi chú, dải **"Ăn kèm hợp lắm"**, [Thêm {qty} phần · {tổng}].
- **Cổng chọn bàn** (bắt buộc): "Bạn ngồi bàn số mấy?" + ô số + [Tiếp tục]; lỗi chưa mở QR / không thấy bàn / trùng số / bàn khoá / bàn có đơn đặt trước. Phiên 8 giờ.
- **Xác nhận bàn**: "Bạn đang ngồi {BÀN N}" [Chọn lại] [Đúng rồi].
- **Sheet giỏ** "Món bạn chọn · {bàn}": dòng (🗑, − SL +, ghi chú), "🗑 Xoá hết món", "Tạm tính … quán xác nhận lại", [Gửi cho quán]; lỗi đang có lượt chờ / món hết / món bị gỡ.
- **Sheet "Món của {bàn}"** (hỏi 5 giây): "Đang chờ quán xác nhận", món đã nhận (+ gọi lại), dải "Gọi thêm đồ uống", "Tôi ngồi bàn khác — đổi số bàn"; thanh giỏ chưa gửi; Tạm tính; **[🔔 Gọi nhân viên]** (chip lý do: Thêm bát đũa / Thêm đá / Thêm giấy ăn / Thêm nước chấm / Dọn bàn + ô gõ) · **[💵 Xin tính tiền]**, đều có hộp xác nhận; giới hạn gọi lại.
- **Bạn nhỏ đồng hành** (mascot, ẩn mặc định, nút 🐾): 6 nhân vật; bong bóng phản ứng mọi thao tác; gợi ý món "＋ {món} · {giá}k"; nút 🔔 gọi NV · 🙂 đổi nhân vật · 🔊/🔇 · ✕ ẩn · ⭐ quay số gợi ý món đề xuất; kéo thả được.

## C. Trang nội bộ `/anh-mon/:token` (`pages/PhotoUploadPage.tsx`)
- Cho người nhà chủ quán chụp ảnh món: tìm, lọc Tất cả / Chưa có ảnh / Đã có ảnh, [Thêm ảnh] / [Đổi ảnh].

## D. Lệch so với spec
- M2: đã thêm OTP tuỳ chọn (spec D-09 nói không), thêm tra đơn theo SĐT (D-10 nói không), phí ship thành bảng nhiều bậc + bán kính tối đa, quán đóng thì khoá nút đặt.
- QR: spec thật là `docs/MILESTONE-07-GOI-MON-TAI-BAN-SPEC.md` (không phải M04). Mã bàn 4 số đã bỏ (2026-10-17); món hết ẩn hẳn thay vì làm mờ (2026-10-19); thêm mascot, món ăn kèm, dải gọi đồ uống.
