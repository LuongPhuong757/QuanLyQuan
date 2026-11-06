# Roadmap: QuanLyQuan — Design System & Giao diện đợt 1

## Tổng quan

Đưa giao diện `apps/web` về một hệ thống thiết kế tập trung (`packages/ui`), vẽ lại 6 màn dùng hằng ngày (khung app, Sơ đồ bàn, Chi tiết bàn, Gọi món, Thu tiền, Bếp) mà không mất tính năng nào, rồi tách DB riêng và cho mỗi quán đổi màu chính + logo. Thứ tự và ranh giới phase do chủ repo chốt (2026-11-06).

**Cổng chất lượng CHUNG-01..04** áp cho MỌI phase giao diện (2–7). Công cụ kiểm dựng ở Phase 1 nên CHUNG-01..04 được ghi nhận (traceability) ở Phase 1; mỗi phase 2–7 lặp lại chúng thành tiêu chí thành công riêng.

Nguồn: `docs/design/dot-1.html` (bản vẽ), `docs/DESIGN-SYSTEM.md` (§3 §4 §5 §8), `docs/design/FEATURE-INVENTORY.md` + `docs/design/inventory/`.

## Các phase

- [ ] **Phase 1: Nền móng design system** - `packages/ui` đủ component, font tự host, icon Lucide, bộ kiểm CI, trang `/__ui`, kiểm tràn 360/390
- [ ] **Phase 2: Khung app** - Header, điều hướng theo vai trò, dải QR / bàn chưa trả, thông báo, hộp xác nhận
- [ ] **Phase 3: Sơ đồ bàn** - Lưới bàn mới đủ tính năng, 8 bộ lọc, khoá KiotViet trong menu ⋯
- [ ] **Phase 4: Chi tiết bàn** - Món nhóm theo vòng đời, thanh đáy, menu ⋯, bàn ship, các hộp con
- [ ] **Phase 5: Gọi món** - Tìm món, lưới món, giỏ thanh đáy, báo bếp
- [ ] **Phase 6: Thu tiền** - Thanh toán 4 bước + VietQR + ảnh bill + Ghi nợ / Thu nợ
- [ ] **Phase 7: Bếp** - 2 bảng, chế độ xem, thẻ món, thẻ huỷ, thanh đáy
- [ ] **Phase 8: Tách DB riêng** - MySQL riêng cho QuanLyQuan, seed demo
- [ ] **Phase 9: Thương hiệu theo quán** - Màu chính + logo lưu server, áp lúc tải trang, màn Cài đặt → Thương hiệu

## Chi tiết phase

### Phase 1: Nền móng design system
**Goal**: Lập trình viên dựng được mọi màn đợt 1 chỉ bằng `packages/ui`, và có bộ kiểm tự động ngăn nợ giao diện tăng thêm
**Depends on**: Không (phase đầu)
**Requirements**: NEN-01, NEN-02, NEN-03, NEN-04, NEN-05, NEN-06, NEN-07, CHUNG-01, CHUNG-02, CHUNG-03, CHUNG-04
**Success Criteria** (what must be TRUE):
  1. Mở `/__ui` thấy đủ mọi biến thể component (kể cả header, thanh điều hướng, dải cảnh báo, chip lọc, bảng trượt từ đáy, menu ⋯, thông báo nổi, trạng thái trống / tải / lỗi, nút icon) và đổi màu thương hiệu bằng thanh thử, chữ trắng < 4.5:1 bị chặn
  2. Tải trang không có request tới Google Fonts; chữ Be Vietnam Pro hiện đủ dấu tiếng Việt từ file woff2 tự host; icon là `lucide-react` đúng cỡ 24 / 20 / 16
  3. Thêm thử một mã hex cứng hoặc một `style={{ color }}` mới trong `apps/*` thì CI đỏ; nợ cũ nằm trong danh sách chỉ được giảm
  4. Chạy được một lệnh kiểm tràn / gãy chữ ở 360 và 390px cho màn đã chuyển, và có số đo `style={{` + class cũ còn lại theo từng màn
  5. CHUNG-01..04 có công cụ và quy ước kiểm sẵn (bảng đối chiếu tính năng, kiểm tràn, bộ kiểm style, typecheck + test xanh) để các phase 2–7 dùng
**Plans**: TBD

### Phase 2: Khung app
**Goal**: Nhân viên dùng khung app mới — header, điều hướng đủ mục theo vai trò, dải cảnh báo, thông báo, hộp xác nhận — mà không mất chức năng nào của khung cũ
**Depends on**: Phase 1
**Requirements**: KHUNG-01, KHUNG-02, KHUNG-03, KHUNG-04, KHUNG-05, KHUNG-06, KHUNG-07
**Success Criteria** (what must be TRUE):
  1. Header hiện logo + tên quán, chip tên + vai trò, chuông có số chưa đọc, nút Đăng xuất, vừa màn 360px
  2. Mỗi vai trò thấy đủ mục điều hướng như hiện tại (admin 9, bếp 7, order 5, báo cáo 5) nhãn 16px có số đếm; điện thoại cuộn ngang ở đáy, máy tính là thanh bên
  3. Nhân viên Order thấy dải tím "n bàn QR" mở được hộp duyệt / đã nghe; dải đỏ "n bàn chưa trả" ở Order và Bếp, chạm chip mở đúng bàn; Bếp chỉ xem dải QR
  4. Hộp Thông báo theo loại xoá hết được; hộp xác nhận 5 kiểu dùng Enter / Esc; hộp "Phiên đăng nhập đã hết hạn" giữ nguyên trang; màn Bếp vẫn toàn màn, dải DEV vẫn hiện ở dev
  5. Áp CHUNG-01..04: đủ tính năng theo inventory, 0 tràn chữ ở 360/390, không `style={{}}` mới cho màu / chữ / khoảng cách, typecheck + test xanh
**Plans**: TBD
**UI hint**: yes
**Trước khi plan**: chạy /gsd-ui-phase 2 để lập UI-SPEC từ `docs/design/dot-1.html` và chủ repo duyệt.
**Đối chiếu tính năng**: `docs/design/FEATURE-INVENTORY.md`, `docs/design/inventory/01-ban-order-thanh-toan.md`, `docs/design/inventory/02-bep-don-online.md` (mục A)

### Phase 3: Sơ đồ bàn
**Goal**: Nhân viên nhìn Sơ đồ bàn mới là biết ngay bàn nào cần làm gì, vẫn đủ mọi tính năng cũ
**Depends on**: Phase 1
**Requirements**: BAN-01, BAN-02, BAN-03, BAN-04, BAN-05, BAN-06
**Success Criteria** (what must be TRUE):
  1. Thẻ bàn hiện tên, tổng tiền, thời gian từ lần báo bếp đầu, loại bàn, chip vòng đời + số món đã giao, và đúng trạng thái theo thứ tự bếp chậm ≥15' → QR chờ duyệt → đã giao hết → đang xử lý → trống; có chú thích vòng đời
  2. Dùng 3 nút nhanh + nút "Lọc" chọn được đủ 8 lọc, số đếm tính trên toàn bộ bàn
  3. Khoá / mở bàn KiotViet làm trong menu ⋯; bàn đang khoá hỏi "Chuyển về hệ thống"
  4. Màn tự cập nhật 2 giây, mở được `/orders?table=`, có trạng thái tải / chưa có bàn / lọc rỗng, và bật lại cập nhật ngay trên màn khi dừng
  5. Trên iPad ngang / máy tính, chi tiết bàn mở ở bảng bên phải cạnh lưới bàn
  6. Áp CHUNG-01..04: đủ tính năng theo inventory, 0 tràn chữ ở 360/390, không `style={{}}` mới, typecheck + test xanh
**Plans**: TBD
**UI hint**: yes
**Trước khi plan**: chạy /gsd-ui-phase 3 để lập UI-SPEC từ `docs/design/dot-1.html` và chủ repo duyệt.
**Đối chiếu tính năng**: `docs/design/inventory/01-ban-order-thanh-toan.md` (mục 1 Sơ đồ bàn)

### Phase 4: Chi tiết bàn
**Goal**: Nhân viên xem và xử lý toàn bộ đơn của một bàn trên một màn rõ ràng, thao tác 48px
**Depends on**: Phase 3 (chi tiết mở từ Sơ đồ bàn)
**Requirements**: CT-01, CT-02, CT-03, CT-04, CT-05, CT-06, CT-07
**Success Criteria** (what must be TRUE):
  1. Tổng tiền bàn là chữ to nhất (kèm "món X + ship Y"), thanh đáy cố định [＋ Gọi món] [Thanh toán], món chưa mang ra hiện lý do trên nút
  2. Món nhóm đúng theo vòng đời, gộp dòng cùng món + ghi chú, có đồng hồ chờ vàng >10' / đỏ >20', ⭐, NV gọi, ghi chú, lý do huỷ
  3. Chạm một dòng món mở hàng nút 48px (− SL +, Báo bếp / Đã giao, ⭐, Ghi chú, Huỷ hoặc Trả món); duyệt / bỏ lượt QR ngay đầu chi tiết bàn
  4. Menu ⋯ có Chuyển bàn, Ghi chú cho bếp, In phiếu tạm tính, Hướng dẫn đúng nút hiện tại, Khoá KiotViet, Huỷ cả bàn; bàn ship có khối khách giao hàng + Đã đi ship; đơn ONLINE ẩn bớt như code
  5. Mọi hộp con chạy đủ như cũ và chồng tối đa 2 tầng
  6. Áp CHUNG-01..04: đủ tính năng theo inventory, 0 tràn chữ ở 360/390, không `style={{}}` mới, typecheck + test xanh
**Plans**: TBD
**UI hint**: yes
**Trước khi plan**: chạy /gsd-ui-phase 4 để lập UI-SPEC từ `docs/design/dot-1.html` và chủ repo duyệt.
**Đối chiếu tính năng**: `docs/design/inventory/01-ban-order-thanh-toan.md` (mục Chi tiết bàn)

### Phase 5: Gọi món
**Goal**: Nhân viên chọn món cho bàn nhanh, ít chạm, rồi báo bếp ngay từ giỏ
**Depends on**: Phase 1 (mở từ Chi tiết bàn, Phase 4)
**Requirements**: GM-01, GM-02, GM-03, GM-04
**Success Criteria** (what must be TRUE):
  1. Tìm món theo tên / mã / viết tắt không dấu; chuyển tab nhóm + "Nên mời"; lưới món tên / giá 18px, món HẾT bị khoá
  2. Chạm thẻ món +1, thẻ hiện bộ đếm − N + và ghi chú từng món
  3. Giỏ là thanh đáy mở rộng trên điện thoại (− SL +, ghi chú, xoá, xoá hết, tổng tạm tính, "Báo bếp" ngay trên giỏ), cố định bên phải từ 768px
  4. Bàn tại quán mới vẫn tự thêm khăn lạnh / khăn ướt; Hoá đơn tự do vẫn có chế độ "gom giỏ"
  5. Áp CHUNG-01..04: đủ tính năng theo inventory, 0 tràn chữ ở 360/390, không `style={{}}` mới, typecheck + test xanh
**Plans**: TBD
**UI hint**: yes
**Trước khi plan**: chạy /gsd-ui-phase 5 để lập UI-SPEC từ `docs/design/dot-1.html` và chủ repo duyệt.
**Đối chiếu tính năng**: `docs/design/inventory/01-ban-order-thanh-toan.md` (mục Gọi món)

### Phase 6: Thu tiền
**Goal**: Thu ngân thu tiền đúng, ít nhầm, qua 4 cách trả, kể cả Ghi nợ và Thu nợ
**Depends on**: Phase 1 (mở từ Chi tiết bàn, Phase 4)
**Requirements**: TT-01, TT-02, TT-03, TT-04, TT-05, TT-06
**Success Criteria** (what must be TRUE):
  1. Bước soát bill phân biệt món đã giao / chưa mang ra (vẫn tính tiền) / đã huỷ (gạch giá); "Tổng cần thu" 32px
  2. Chọn 1 trong 4 nút to Tiền mặt / Chuyển khoản / Cả hai / Ghi nợ, không chọn sẵn, CK chỉ hiện với người có quyền
  3. Với CK / Cả hai: nhập tiền CK, chọn mã QR (không chọn sẵn), thấy VietQR kèm số tiền + nội dung; bắt buộc ảnh bill, "Không chụp được bill?" ghi lý do
  4. Ghi nợ hỏi "Ai nợ?" kèm cảnh báo chưa vào doanh thu; chế độ Thu nợ mở từ Lịch sử (ẩn Ghi nợ) vẫn chạy
  5. Điện thoại là bảng trượt từ đáy, màn rộng là hộp giữa; nút xác nhận 64px; nút bị chặn ghi lý do bằng chữ (viền đứt + ⚠), không `disabled`; nút lùi ghi đúng đích
  6. Áp CHUNG-01..04: đủ tính năng theo inventory, 0 tràn chữ ở 360/390, không `style={{}}` mới, typecheck + test xanh
**Plans**: TBD
**UI hint**: yes
**Trước khi plan**: chạy /gsd-ui-phase 6 để lập UI-SPEC từ `docs/design/dot-1.html` và chủ repo duyệt.
**Đối chiếu tính năng**: `docs/design/inventory/01-ban-order-thanh-toan.md` (mục Thanh toán)

### Phase 7: Bếp
**Goal**: Bếp thấy và xử lý món trên màn toàn màn rõ ràng, nút lớn, không bỏ sót món huỷ
**Depends on**: Phase 1
**Requirements**: BEP-01, BEP-02, BEP-03, BEP-04, BEP-05
**Success Criteria** (what must be TRUE):
  1. Thấy 2 bảng Chờ chế biến / Đã xong có đếm số phần; điện thoại chuyển bảng bằng nút, từ 900px hai bảng cạnh nhau
  2. Một nút "Xem: … ▾" đổi được 3 chế độ (Ưu tiên / Theo món / Theo phòng-bàn) và sắp xếp (A→Z / Nhiều nhất, "Sắp lại")
  3. Thẻ món đủ thông tin (×SL, tên 20px, bàn, đồng hồ, size, NV gọi, ghi chú 18px nền vàng không cắt, ⭐, YC phục vụ); "✓ Xong" 64×64, "Đã giao", "Xong tất cả / Đã giao tất cả"
  4. Thẻ món đã huỷ có "Đã biết / Đã biết tất cả"; đánh dấu HẾT / Có lại có xác nhận tự huỷ order chưa nấu; lọc nhóm Bếp nấu / Có sẵn
  5. Dải bật âm thanh, nút "Đơn online N", thanh đáy (← · lọc · ↻ · ❓ · 🔔) nút ≥ 48px; âm thanh và tự cập nhật như cũ
  6. Áp CHUNG-01..04: đủ tính năng theo inventory, 0 tràn chữ ở 360/390, không `style={{}}` mới, typecheck + test xanh
**Plans**: TBD
**UI hint**: yes
**Trước khi plan**: chạy /gsd-ui-phase 7 để lập UI-SPEC từ `docs/design/dot-1.html` và chủ repo duyệt.
**Đối chiếu tính năng**: `docs/design/inventory/02-bep-don-online.md` (mục A Bếp)

### Phase 8: Tách DB riêng
**Goal**: QuanLyQuan chạy trên MySQL riêng, không còn đụng DB của Bà Lùn
**Depends on**: Không bắt buộc về mã; phải xong trước Phase 9 (không thêm cột khi còn dùng chung DB)
**Requirements**: DB-01
**Success Criteria** (what must be TRUE):
  1. `pnpm db:up` dựng container MySQL có tên + cổng riêng của QuanLyQuan, không còn `container_name` cứng
  2. Chạy seed là có dữ liệu demo dùng được (đăng nhập, bàn, menu)
  3. Cả 3 app chạy với DB mới; DB cũ của Bà Lùn không bị đọc hay ghi
**Plans**: TBD

### Phase 9: Thương hiệu theo quán
**Goal**: Mỗi quán thuê đổi được màu chính + logo của mình mà không đụng code
**Depends on**: Phase 8 (cần DB riêng trước khi thêm bảng thương hiệu), Phase 1
**Requirements**: TH-01, TH-02, TH-03, TH-04, TH-05
**Success Criteria** (what must be TRUE):
  1. Chủ quán chọn màu chính từ 10 màu soạn sẵn hoặc nhập mã; màu chữ trắng < 4.5:1 bị chặn kèm lý do bằng chữ
  2. Chủ quán tải logo và đặt tên quán
  3. Tải lại trang, màu + logo vẫn đúng và hiện ngay từ đầu (không chớp màu mặc định) ở cả `apps/web` và `apps/shop`
  4. Màu trạng thái (xanh lá xong, đỏ huỷ, cam chờ, tím QR) giữ nguyên khi đổi màu quán
  5. Màn Cài đặt → Thương hiệu chạy trên điện thoại + máy tính, có xem trước trực tiếp và nút Lưu
**Plans**: TBD
**UI hint**: yes
**Trước khi plan**: chạy /gsd-ui-phase 9 để lập UI-SPEC từ `docs/design/dot-1.html` và chủ repo duyệt.
**Đối chiếu tính năng**: `docs/DESIGN-SYSTEM.md` §5 (đổi màu theo quán); trang khách `docs/design/inventory/05-trang-khach-shop.md`

## Tiến độ

Thứ tự thực hiện: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 (Phase 2–7 cùng phụ thuộc Phase 1; Phase 4 sau 3; Phase 5, 6 mở từ 4).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Nền móng design system | 0/TBD | Chưa bắt đầu | - |
| 2. Khung app | 0/TBD | Chưa bắt đầu | - |
| 3. Sơ đồ bàn | 0/TBD | Chưa bắt đầu | - |
| 4. Chi tiết bàn | 0/TBD | Chưa bắt đầu | - |
| 5. Gọi món | 0/TBD | Chưa bắt đầu | - |
| 6. Thu tiền | 0/TBD | Chưa bắt đầu | - |
| 7. Bếp | 0/TBD | Chưa bắt đầu | - |
| 8. Tách DB riêng | 0/TBD | Chưa bắt đầu | - |
| 9. Thương hiệu theo quán | 0/TBD | Chưa bắt đầu | - |
