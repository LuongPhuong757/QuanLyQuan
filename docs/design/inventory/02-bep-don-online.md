# Kiểm kê tính năng — Bếp / Đơn online / Cài đặt nhận đơn

Nguồn: đọc code `apps/web/src` ngày 2026-11-06. Nhãn tiếng Việt nguyên văn, kèm `file:dòng`.
⚠ `DeliveryFormPanel.tsx` KHÔNG phải form giao hàng online mà là **phiếu Nhập hàng NCC** — xem mục C.

## A. Bếp — `pages/KitchenPage.tsx` (`/kitchen`, admin + kitchen)
- **Toàn màn**: ẩn header + nav dưới (App.tsx:383-389); vẫn có GuestQrBanner (chỉ đọc) + StaleTableBanner.
- ≥900px: 2 bảng cạnh nhau; <900px: một bảng + nút "→ [bảng kia] (n)" (1560-1570).
- **Dải bật âm thanh** (kitchen, khi trình duyệt chặn): "🔇 Chạm vào màn hình để bật âm thanh báo món" (1458-1462).
- **Thanh trên**:
  - 3 chế độ xem (lưu máy): "Ưu tiên" · "Theo món" (gộp cùng món mọi bàn) · "Theo phòng/bàn" (1471-1481).
  - Sắp xếp nhóm "⇅ A→Z" ⇄ "⇅ Nhiều nhất" + "↺ Sắp lại" (thứ tự đóng băng để khối không nhảy dưới tay) (1483-1509).
  - Nút "🛎 Đơn online N" → `/admin/online-orders`, đỏ khi có đơn chờ (1520-1538).
- **2 bảng**: "🔥 Chờ chế biến" (KITCHEN + COOKING) / "🍽 Đã xong" (READY); đầu bảng đếm **số phần** (1542-1556).
- **Thẻ đã huỷ** đỏ đầu bảng: "✕ ĐÃ HUỶ · {qty}× {món}", bàn · đang nấu/chờ/đã xong · ai huỷ · lý do; [Đã biết] / [Đã biết tất cả (n)]; giữ qua reload, tự hết sau 1 giờ (1579-1609; `lib/kds-cancelled.ts`).
- Sắp xếp: ưu tiên trước, rồi cũ nhất. Ghi chú phục vụ không bị bộ lọc nhóm ẩn.
- **Thẻ món** (1964-2140): viền trái tím (yêu cầu phục vụ) / vàng (⭐) / xanh (chờ) / xanh lá (xong); "📝 YC PHỤC VỤ", "⭐ ƯU TIÊN"; "×qty" · tên · bàn; "⏱ 12p" (đen <10' / vàng 10-20' / đỏ + ⚠ >20'); size phần "100k"; "👤 NV gọi"; "📝 ghi chú"; "🚫 Menu HẾT".
  - Nút 🚫/✓ đánh dấu hết / có lại (chỉ ở Chờ chế biến).
  - Nút » : ở Chờ chế biến = Xong → READY; ở Đã xong = Đã giao → SERVED.
- **Khối nhóm** (Theo món / Theo bàn) (1872-1962): "×tổng", tiêu đề màu theo món cũ nhất, "» Xong tất cả" / "» Đã giao tất cả" (xác nhận khi >1 dòng).
- **Xác nhận hết món** (626-685): "Đánh dấu "{món}" HẾT?" — order chưa nấu sẽ **TỰ ĐỘNG HUỶ**; toast liệt kê bàn bị huỷ (10 giây).
- **Thanh dưới** (1654-1733): "←" về `/orders` (không có Đăng xuất) · "🔍 Tất cả (N)" lọc nhóm · chip nhóm đang lọc · "✕" bỏ lọc · "↻" làm mới · "❓" hướng dẫn · 🔔.
- **Lọc nhóm** (2143-2330): tìm, ✓ Tất cả / ✕ Bỏ chọn, chia "🔥 Bếp nấu" / "🥤 Bếp có sẵn", tick nhiều, lưu theo máy.
- **Hướng dẫn** (1735-1852) — chữ còn nhắc badge 🔥 COOKING không còn trong code.
- **Dữ liệu**: hỏi 2 giây; dừng sau 3 lỗi → nhắc bấm ↻; âm "ting" khi khách QR gọi / gọi NV / xin tính tiền; ReadyListener beep món mới, hết món, NV huỷ, chuyển bàn. Không in, không vuốt.

## B. Đơn online — `pages/OnlineOrdersPage.tsx` (`/admin/online-orders`, admin + order + kitchen)
- Tab cấp 1 `?view=`: "🛎 Hàng chờ" (mọi role, badge đỏ) · "🍜 Món online" · "📈 Thống kê" · "⚙ Cài đặt" (3 tab sau chỉ admin) (188-309). Tiêu đề tab "(N) Đơn mới".
- **Thanh công cụ** (661-746): tab trạng thái "⏳ Chờ duyệt" · "✓ Đã xác nhận" · "💰 Thành công" · "✕ Đã từ chối" kèm số; chip "⏰ N đơn quá {x}s"; chấm kết nối SSE xanh / vàng / đỏ; "🔕 Bật chuông".
- **Lọc**: tìm "🔍 Tìm theo tên khách, SĐT, món hoặc xã…" (giữ khi đổi tab); thời gian (admin chip Tất cả/14h/24h/7/30 ngày; order/kitchen chỉ xem cửa sổ giới hạn); chặng (tab Đã xác nhận): 🍳 Đang chuẩn bị · 📦 Xong, chờ giao · 🛵 Đang giao.
- **Bản đồ** (bật ở cài đặt): "🗺 Xem bản đồ · N đơn"; chấm màu theo chặng, cụm số, popup "Mở đơn này" (cuộn + nháy thẻ); cảnh báo đơn không toạ độ / quán chưa có toạ độ (`components/OrdersMap.tsx`).
- Banner mất kết nối, lỗi tải + "Thử lại", trạng thái trống theo từng tab.
- Realtime SSE + dự phòng 15 giây; chuông lặp 5 phút khi còn đơn chờ; đồng hồ chờ nhảy mỗi giây.
- **Thẻ đơn** (1244-2193):
  - Đầu: "#thứ tự" / pill trạng thái · "🛵 Giao tận nơi" / "🏠 Khách tự lấy" · giờ đặt · đồng hồ chờ "m:ss" to (⏰ khi quá hạn). Tab tra cứu: thẻ thu gọn ▲/▼.
  - Khách: tên · SĐT + "Gọi" · địa chỉ · chip "🛵 X km · miễn phí ship / +15.000đ" · "📍 Khách chia sẻ vị trí" / "✍️ Địa chỉ nhập tay" · "Mở bản đồ" · "Khách ghi: …".
  - Món: "qty×" tên ghi chú tiền; hết hàng gạch; >5 món "Xem thêm N món"; "Tổng"; "✏️ Sửa số lượng / bỏ món".
  - "Phí ship (nếu có)" ô tiền "đ" gợi ý theo km; "🔄 Chuyển sang Giao tận nơi / Đến lấy tại quán".
  - Khối kết luận (tab tra cứu): người duyệt, lý do; bàn; "Bếp xong x/y món"; chặng; mốc "🛵 Rời quán · ✓ Khách nhận · 💰 Thu tiền"; [🛵 Đã đi ship] [Huỷ đơn].
  - Hộp hết hàng: "⚠ N món đã hết hàng" + tick sẵn "Bỏ khỏi đơn".
  - Nút: **[Xác nhận]** (rộng) · **[Từ chối]** (đỏ). Thẻ mờ dần sau khi xử lý; nhiều toast "nhớ báo lại với khách".
- **Panel trong thẻ** (thay nhau, không nổi):
  - Chuyển hình thức: địa chỉ bắt buộc, cảnh báo xoá toạ độ, phí ship.
  - Sửa món: − SL + ✕, "＋ Gọi thêm món" (MenuPickerModal), tạm tính mới.
  - Từ chối: 5 lý do gửi khách (Hết nguyên liệu / Ngoài khu vực giao / Quán quá tải / Không liên lạc được / Lý do khác), "🔒 Ghi chú nội bộ" 500 ký tự, tick "🚫 Chặn số … khỏi đặt online" (VĨNH VIỄN).
- **MenuPickerModal**: tìm, món HẾT, bước chọn: SL − +, ghi chú, "Thêm {qty} {unit} · {tiền}".

## B10. Cài đặt — `pages/OnlineOrderSettingsPanel.tsx` (admin, `?view=settings&tab=`)
- Tab con: Nhận đơn & giờ mở cửa · Số điện thoại bị chặn · Top món bán chạy · Mã QR nhận tiền · Mã QR gọi món · Máy in · Cảnh báo bàn.
- Mẫu Section: gập/mở (gập sẵn trên điện thoại), "● Chưa lưu", nút lưu riêng từng mục.
- **Nhận đơn & giờ mở cửa**: dải trạng thái Mở / Ngoài giờ / Đóng + [Chuyển sang Đóng cửa] / [Mở cửa lại]; chọn đóng (tới khi mở lại / hết hôm nay) + lý do; câu chữ khi đóng; **Giờ mở cửa** (khoảng giờ bước 30', ngoại lệ theo thứ); **Hình thức nhận hàng** (Khách đến lấy / Giao tận nơi, ETA, hệ số đường, bán kính tối đa, **bảng phí giao theo giá trị đơn** nhiều bậc); OTP; giới hạn tỉnh Bắc Ninh; Bản đồ; **Thông tin quán** (SĐT, toạ độ, địa chỉ, Facebook, Instagram, Zalo).
- **Số bị chặn**: thêm số + lý do, tìm, bảng, bỏ chặn, 50/trang.
- **Top món bán chạy**: bật bảng xếp hạng cho khách, 3–10 món, kỳ đếm, ẩn món.
- **Cảnh báo bàn**: "Báo khi bàn đã mở quá" Tắt / 1–6 giờ (điều khiển dải đỏ).
- **Mã QR nhận tiền** (`PaymentQrPanel.tsx`): bật xác thực giao dịch; form BANK / ẢNH (tên gọi, ngân hàng, STK, chủ TK, tiền tố nội dung, ảnh); danh sách ↑↓, Sửa, Ngừng dùng / Bật lại.
- **Mã QR gọi món** (`MenuQrPanel.tsx`): bật/tắt, tiêu đề, [🖨 In mã QR] [⬇ Tải ảnh] [📋 Chép địa chỉ].
- **Máy in** (`PrintersPanel.tsx`): bật in; LAN/USB, IP/port; khổ 80/58mm; độ đậm; nhiệt; tên quán; dao cắt; [Lưu] [In thử]; thiết bị cầu in (trạng thái, thu hồi, token, thêm); hàng đợi in (Đang chờ / Đang in / Đã in / Hỏng / Quá hạn).

## C. Phiếu Nhập hàng NCC — `pages/DeliveryFormPanel.tsx` (mở từ `SuppliersPage.tsx`)
- Tiêu đề "Nhập hàng" / "Sửa phiếu nhập"; role report = "Lập phiếu nháp" (không tạo mặt hàng mới).
- Cảnh báo khi sửa: tồn kho, công nợ, bảng giá được tính lại.
- **Tự lưu nháp** mỗi phím; banner "Đã khôi phục phiếu nhập dở…" [Bỏ, nhập phiếu mới] [Dùng tiếp].
- Nhà cung cấp · "Ngày giao *" (chặn ngày tương lai; nút Hôm nay / Hôm qua; chưa chọn ngày thì khoá phần dòng hàng).
- **Dòng hàng**: Mặt hàng (gợi ý theo NCC, "chưa mua từ NCC này") · ĐVT (g→KG, ml→L) · Số lượng · Đơn giá · Thành tiền · Nhóm (Chính / Phụ / Bán nguyên) · ✕ · "Lần trước {giá} · {ngày}".
- "＋ Thêm dòng"; ảnh hoá đơn (kéo thả, ⌘V); Ghi chú; thanh dưới: tổng to · [Huỷ] · [GỬI] / [LƯU SỬA].
- **PriceChangeDialog**: cảnh báo NCC đã có phiếu hôm nay; "⚠ N mặt hàng đổi giá" ▲▼%, cảnh báo quy cách nhỏ lại; Duyệt từng dòng / Duyệt tất cả (lệch >30% phải duyệt từng dòng); [Quay lại sửa] [Xác nhận & lưu phiếu].
