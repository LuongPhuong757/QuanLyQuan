# Requirements: QuanLyQuan — Design System & Giao diện đợt 1

**Defined:** 2026-11-06
**Core Value:** Mọi màn hình nhìn và dùng như một sản phẩm, đổi màu thương hiệu cho cả hệ thống chỉ bằng một chỗ — mà không mất bất kỳ tính năng nào nhân viên đang dùng hằng ngày.

Nguồn đối chiếu tính năng: `docs/design/FEATURE-INVENTORY.md` + `docs/design/inventory/01-*`, `02-*` (mục A).
Bản vẽ: `docs/design/dot-1.html`. Luật: `docs/DESIGN-SYSTEM.md` §3 §4 §5 §8.

## v1 Requirements

### Nền móng (NEN)

- [ ] **NEN-01**: Lập trình viên dựng được mọi màn đợt 1 chỉ bằng component của `packages/ui` — có thêm các component còn thiếu (thanh trên / header, thanh điều hướng, dải cảnh báo, chip lọc có số đếm, nút "Xem: … ▾" kiểu chọn chế độ, bảng trượt từ đáy, menu ⋯, thông báo nổi, trạng thái trống / đang tải / lỗi, nút icon)
- [ ] **NEN-02**: Chữ dùng Be Vietnam Pro tự host (woff2, đủ dấu tiếng Việt); trang không gọi Google Fonts lúc chạy
- [ ] **NEN-03**: Icon dùng `lucide-react` với cỡ theo token (24 / 20 / 16), luôn kèm chữ trừ 🔔, ⋯, ✕
- [ ] **NEN-04**: CI chặn mã màu hex cứng và `style={{…}}` cho màu / chữ / khoảng cách MỚI trong `apps/*` (nợ cũ được ghi danh sách, chỉ được giảm)
- [ ] **NEN-05**: Có quy ước + số đo gỡ CSS cũ theo từng màn (đếm `style={{` và class cũ còn lại của mỗi màn đã chuyển)
- [ ] **NEN-06**: Trang `/__ui` hiện đủ mọi biến thể component và có thanh đổi màu thương hiệu để thử
- [ ] **NEN-07**: Có cách kiểm tự động "không tràn / gãy chữ" ở 360 và 390px cho màn đã chuyển

### Khung app (KHUNG)

- [ ] **KHUNG-01**: Người dùng thấy header có logo + tên quán, chip tên + vai trò, chuông thông báo có số chưa đọc, nút Đăng xuất — vừa màn 360px
- [ ] **KHUNG-02**: Người dùng thấy điều hướng ĐỦ mục theo vai trò như hiện tại (admin 9, bếp 7, order 5, báo cáo 5) với nhãn đầy đủ 16px và số đếm (Order / Bếp / Online / NCC); điện thoại cuộn ngang ở đáy, máy tính là thanh bên
- [ ] **KHUNG-03**: Nhân viên Order thấy dải tím "n bàn QR" (gọi món / gọi nhân viên / xin tính tiền), có chuông, mở được hộp duyệt lượt / đã nghe; màn Bếp chỉ xem
- [ ] **KHUNG-04**: Nhân viên thấy dải đỏ "n bàn chưa trả" ở Order và Bếp, chạm chip mở đúng bàn
- [ ] **KHUNG-05**: Người dùng mở hộp Thông báo theo loại, xoá hết được; lỗi hiện dải trên màn, thành công ghi vào sổ
- [ ] **KHUNG-06**: Hộp xác nhận 5 kiểu (thường / nguy hiểm / cảnh báo / thành công / thông tin), Enter / Esc, và hộp "Phiên đăng nhập đã hết hạn" giữ nguyên trang đều theo design system
- [ ] **KHUNG-07**: Màn Bếp vẫn toàn màn (không header / nav); dải DEV vẫn hiện ở môi trường dev

### Sơ đồ bàn (BAN)

- [ ] **BAN-01**: Nhân viên thấy thẻ bàn có tên, **tổng tiền (MỚI)**, thời gian từ lần báo bếp đầu, loại bàn (tại quán / mang về / ship) và đúng trạng thái theo thứ tự ưu tiên: bếp chậm ≥15' → lượt QR chờ duyệt → đã giao hết → đang xử lý → trống; bàn khoá KiotViet
- [ ] **BAN-02**: Thẻ bàn hiện chip vòng đời món (gọi / báo bếp / đang làm / xong) + số món đã giao; có chú thích vòng đời
- [ ] **BAN-03**: Nhân viên lọc bằng 3 nút nhanh + nút "Lọc" chứa đủ 8 lọc (đếm trên toàn bộ bàn)
- [ ] **BAN-04**: Khoá / mở bàn KiotViet nằm trong menu ⋯ (không còn nút 🔒 nhỏ trên thẻ); bàn đang khoá hỏi "Chuyển về hệ thống" như cũ
- [ ] **BAN-05**: Giữ tự cập nhật 2 giây, link sâu `/orders?table=`, trạng thái tải / chưa có bàn / lọc rỗng; khi dừng cập nhật có cách bật lại ngay trên màn
- [ ] **BAN-06**: Trên iPad ngang / máy tính, chi tiết bàn mở ở bảng bên phải cạnh lưới bàn

### Chi tiết bàn (CT)

- [ ] **CT-01**: Nhân viên thấy tổng tiền bàn là chữ to nhất (kèm "món X + ship Y") và thanh đáy cố định [＋ Gọi món] [Thanh toán]; còn món chưa mang ra thì hiện dòng chữ lý do trên nút
- [ ] **CT-02**: Món nhóm theo vòng đời (Đang gọi → Đã báo bếp → Đang làm → Xong chờ giao → Đã giao → Đã huỷ), gộp dòng cùng món + ghi chú, có đồng hồ chờ (vàng >10', đỏ >20'), ⭐ ưu tiên, NV gọi, ghi chú, lý do huỷ
- [ ] **CT-03**: Chạm một dòng món mở hàng nút 48px: − SL + · Báo bếp / Đã giao · ⭐ Ưu tiên · Ghi chú · Huỷ (hoặc Trả món với món đã giao) — bỏ thao tác vuốt
- [ ] **CT-04**: Nhân viên duyệt / bỏ lượt khách gọi qua QR ngay đầu chi tiết bàn (món hết gạch "hết — sẽ bỏ", tạm tính)
- [ ] **CT-05**: Menu ⋯ có Chuyển bàn, Ghi chú cho bếp, In phiếu tạm tính, Hướng dẫn (nội dung đúng với nút hiện tại), Khoá KiotViet, Huỷ cả bàn; đơn ONLINE ẩn bớt như code
- [ ] **CT-06**: Bàn ship có khối khách giao hàng (tên, SĐT gọi được, địa chỉ, km, nguồn địa chỉ, mở bản đồ, nhập / sửa) và nút Đã đi ship cho đơn online
- [ ] **CT-07**: Các hộp con Sửa số lượng, Ghi chú cho bếp (chip chọn nhanh, "Báo bếp luôn"), Chuyển bàn (chỉ bàn trống), Thông tin khách giao hàng, Huỷ cả bàn (số tiền bị xoá), Huỷ / Trả món chạy đủ như cũ, chồng tối đa 2 tầng

### Gọi món (GM)

- [ ] **GM-01**: Nhân viên tìm món theo tên / mã / viết tắt không dấu; chuyển tab nhóm + "Nên mời"; thấy lưới món tên / giá 18px, món HẾT bị khoá
- [ ] **GM-02**: Chạm thẻ +1, có bộ đếm − N + ngay trên thẻ, ghi chú từng món
- [ ] **GM-03**: Giỏ là thanh đáy mở rộng trên điện thoại (− SL +, ghi chú, xoá, xoá hết, tổng tạm tính, "Báo bếp" ngay trên giỏ); cố định bên phải từ 768px
- [ ] **GM-04**: Giữ tự thêm khăn lạnh / khăn ướt cho bàn tại quán mới và chế độ "gom giỏ" của Hoá đơn tự do

### Thu tiền (TT)

- [ ] **TT-01**: Thu ngân soát bill: đã giao / chưa mang ra (vẫn tính tiền) / đã huỷ (gạch giá); "Tổng cần thu" 32px
- [ ] **TT-02**: Chọn 1 trong 4 nút to Tiền mặt / Chuyển khoản / Cả hai / Ghi nợ, chạm là sang bước; không chọn sẵn; CK chỉ hiện với người có quyền thu CK
- [ ] **TT-03**: Với CK / Cả hai: nhập tiền CK (Cả hai), chọn mã QR (không chọn sẵn, theo thứ tự cài đặt), hiện VietQR kèm số tiền + nội dung CK; các lỗi tải / không có mã như cũ
- [ ] **TT-04**: Bắt buộc chụp / chọn ảnh bill với CK; "Không chụp được bill?" ghi lý do
- [ ] **TT-05**: Ghi nợ ("Ai nợ?", cảnh báo chưa vào doanh thu) và chế độ Thu nợ mở từ Lịch sử (ẩn Ghi nợ) vẫn chạy
- [ ] **TT-06**: Điện thoại là bảng trượt từ đáy, màn rộng là hộp giữa; nút xác nhận 64px; nút chính bị chặn ghi lý do bằng chữ (viền đứt + ⚠), không `disabled`; nhãn nút lùi ghi đúng đích

### Bếp (BEP)

- [ ] **BEP-01**: Bếp thấy 2 bảng Chờ chế biến / Đã xong (đếm số phần); điện thoại chuyển bảng bằng nút, từ 900px hai bảng cạnh nhau
- [ ] **BEP-02**: Một nút "Xem: … ▾" gộp 3 chế độ (Ưu tiên / Theo món / Theo phòng-bàn) và sắp xếp (A→Z / Nhiều nhất, "Sắp lại")
- [ ] **BEP-03**: Thẻ món: ×SL, tên 20px, bàn, đồng hồ (vàng >10', đỏ >20'), size phần, NV gọi, ghi chú 18px nền vàng không cắt, ⭐ ưu tiên, YC phục vụ; nút "✓ Xong" 64×64 và "Đã giao" ở bảng Đã xong; khối nhóm có "Xong tất cả / Đã giao tất cả"
- [ ] **BEP-04**: Thẻ món đã huỷ + "Đã biết / Đã biết tất cả"; đánh dấu HẾT / Có lại có xác nhận tự huỷ order chưa nấu; lọc nhóm (Bếp nấu / Có sẵn)
- [ ] **BEP-05**: Dải bật âm thanh, nút "Đơn online N", thanh đáy (← · lọc · ↻ · ❓ · 🔔) với nút ≥ 48px; âm thanh / tự cập nhật như cũ

### Dữ liệu (DB)

- [ ] **DB-01**: QuanLyQuan chạy với MySQL riêng (tên container + cổng riêng, bỏ `container_name` cứng), seed được dữ liệu demo, không còn đụng DB của Bà Lùn

### Thương hiệu theo quán (TH)

- [ ] **TH-01**: Chủ quán chọn màu chính từ 10 màu soạn sẵn hoặc nhập mã; màu chữ trắng < 4.5:1 bị chặn kèm lý do bằng chữ
- [ ] **TH-02**: Chủ quán tải logo và đặt tên quán
- [ ] **TH-03**: Màu + logo lưu trên server và áp ngay lúc tải trang ở cả `apps/web` và `apps/shop` (không chớp màu mặc định)
- [ ] **TH-04**: Màu trạng thái (xanh lá xong, đỏ huỷ, cam chờ, tím QR) không đổi theo quán
- [ ] **TH-05**: Có màn Cài đặt → Thương hiệu (điện thoại + máy tính) với xem trước trực tiếp và nút Lưu

### Chất lượng chung (CHUNG)

- [ ] **CHUNG-01**: Mỗi màn đã chuyển giữ đủ 100% tính năng trong inventory (có bảng đối chiếu tính năng → nơi thể hiện)
- [ ] **CHUNG-02**: Mỗi màn đã chuyển đạt 0 lỗi tràn / gãy chữ ở 360 và 390px và hiển thị đúng ở iPad ngang + máy tính
- [ ] **CHUNG-03**: Mỗi màn đã chuyển không còn `style={{…}}` cho màu / chữ / khoảng cách / bo góc / bóng (trừ giá trị động thật sự)
- [ ] **CHUNG-04**: `pnpm typecheck` và toàn bộ test hiện có vẫn xanh sau mỗi phase

## v2 Requirements

### Đợt 2+ giao diện

- **DOT2-01**: Đơn online (hàng chờ, thẻ đơn, cài đặt 7 tab) theo design system
- **DOT2-02**: Lịch sử + đối soát + sổ ngân hàng theo design system
- **DOT2-03**: Menu + công thức nguyên liệu + Hoá đơn tự do + Bàn ăn theo design system
- **DOT2-04**: NCC 8 tab + cổng NCC + nhân sự + nhật ký + đăng nhập theo design system
- **DOT2-05**: Trang khách (đặt online + QR tại bàn) dùng `packages/ui` và màu quán
- **DOT2-06**: Logo quán in trên hoá đơn / phiếu tạm tính

## Out of Scope

| Feature | Reason |
|---------|--------|
| Xuất hoá đơn điện tử | Không có trong code; chủ repo loại 2026-11-06 |
| Ô "Khách đưa / trả lại khách" | Chủ repo loại 2026-11-06 |
| "Xong cả bàn" ở chế độ Ưu tiên | Chủ repo loại 2026-11-06 |
| Hoàn tác 5 giây | Chủ repo loại 2026-11-06 |
| Điều hướng chung 5 mục | Giữ đủ mục theo vai trò |
| Đổi font / bo góc / màu trạng thái theo quán | Chỉ màu chính + logo |
| Tailwind / MUI / thư viện UI lớn | Viết lại toàn bộ + tăng bundle (CI gác ngân sách) |
| Tính năng mới khác khi vẽ lại | Phải ghi "MỚI" và duyệt riêng |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| (điền khi tạo roadmap) | | |

**Coverage:**
- v1 requirements: 52 total
- Mapped to phases: 0 (chờ roadmap)

---
*Requirements defined: 2026-11-06*
*Last updated: 2026-11-06 after initial definition*
