# QuanLyQuan

## What This Is

Web app quản lý quán ăn nhỏ ở Việt Nam, bán dạng **cho thuê** cho nhiều quán (tách từ hệ thống đang chạy thật của
Quán Bà Lùn ngày 2026-11-06). Gồm trang quản lý `apps/web` (POS bàn, bếp, đơn online, lịch sử, menu, NCC, cài đặt),
trang khách `apps/shop` (đặt online + QR gọi món tại bàn) và API NestJS dùng chung. Người dùng thật là **chủ quán và
nhân viên phục vụ, phần lớn lớn tuổi, dùng điện thoại** — chữ to, nút to, ít bước.

Milestone hiện tại: **Design System & Giao diện đợt 1** — đưa giao diện về một hệ thống thiết kế tập trung, thống nhất
mọi màn, và cho mỗi quán thuê đổi màu + logo của riêng mình.

## Core Value

**Mọi màn hình nhìn và dùng như một sản phẩm, đổi màu thương hiệu cho cả hệ thống chỉ bằng một chỗ — mà không mất
bất kỳ tính năng nào nhân viên đang dùng hằng ngày.**

## Business Context

- **Customer**: Chủ quán ăn nhỏ ở Việt Nam (thuê bao), nhân viên của họ là người dùng hằng ngày
- **Revenue model**: Thuê 2.799.000đ/tháng/quán
- **Success metric**: Quán mới lên được với màu + logo riêng mà không đụng code; nhân viên lớn tuổi thao tác không nhầm
- **Strategy notes**: docs/SAN-PHAM-KIEN-TRUC.md

## Requirements

### Validated

<!-- Đã chạy thật ở Quán Bà Lùn — kiểm kê đầy đủ ở docs/design/FEATURE-INVENTORY.md + inventory/ -->

- ✓ Sơ đồ bàn: 8 bộ lọc, 3 loại bàn, trạng thái bếp chậm / QR chờ duyệt / đã giao hết / khoá KiotViet, tự cập nhật 2 giây — existing
- ✓ Chi tiết bàn: món nhóm theo vòng đời, Báo bếp / Đã giao / Ưu tiên / Sửa SL / Huỷ / Trả món, duyệt lượt QR, chuyển bàn, ghi chú cho bếp, huỷ cả bàn, in phiếu tạm tính, khách giao hàng — existing
- ✓ Gọi món: tìm không dấu + viết tắt, "Nên mời", món HẾT, giỏ, khăn lạnh tự thêm, báo bếp — existing
- ✓ Thu tiền: soát bill, 4 cách trả (Tiền mặt / CK / Cả hai / Ghi nợ), VietQR, chụp bill bắt buộc với CK, Thu nợ — existing
- ✓ Bếp: 2 bảng, 3 chế độ xem, thẻ món đã huỷ, đánh dấu HẾT tự huỷ order, lọc nhóm, ưu tiên, âm thanh — existing
- ✓ Đơn online (hàng chờ realtime, sửa / từ chối / chặn số, bản đồ), cài đặt nhận đơn 7 tab — existing
- ✓ Lịch sử giao dịch, đối soát tiền, Misa, sổ webhook ngân hàng, dashboard, thống kê truy cập — existing
- ✓ Menu (+ công thức nguyên liệu, import Excel, menu xem, combo), NCC 8 tab + cổng NCC, nhân sự, nhật ký — existing
- ✓ Trang khách: đặt online (GPS, phí ship nhiều bậc, OTP, theo dõi đơn) + QR gọi món tại bàn — existing
- ✓ `packages/ui` nền: token 3 tầng, Button / Input / MoneyInput / Select / Textarea / Stepper / Card / Badge / Dialog, `applyBrand()` chặn màu < 4.5:1 — 2026-11-06

### Active

- [ ] Nền móng design system đủ để mọi màn chỉ dùng `packages/ui` (component còn thiếu, font tự host, icon Lucide, bộ kiểm chặn hex cứng / `style={{}}` mới, quy ước gỡ CSS cũ theo màn)
- [ ] Khung app mới: header, điều hướng theo vai trò, dải QR khách, dải bàn chưa trả, thông báo, hộp xác nhận, đăng nhập lại
- [ ] Sơ đồ bàn theo bản vẽ (đủ tính năng, bố cục §8)
- [ ] Chi tiết bàn + hộp con theo bản vẽ
- [ ] Gọi món + giỏ theo bản vẽ
- [ ] Thu tiền 4 bước + Thu nợ theo bản vẽ
- [ ] Bếp theo bản vẽ
- [ ] DB riêng cho QuanLyQuan (không dùng chung với Bà Lùn)
- [ ] Thương hiệu theo quán: lưu màu chính + logo trên server, áp lúc tải trang cho cả quản lý + trang khách, màn Cài đặt → Thương hiệu

### Out of Scope

- Xuất hoá đơn điện tử — không có trong code; chủ repo loại 2026-11-06 (dự án riêng nếu cần)
- Ô "Khách đưa / trả lại khách" — chủ repo loại 2026-11-06
- "Xong cả bàn" ở chế độ Ưu tiên của Bếp — chủ repo loại 2026-11-06
- Hoàn tác 5 giây cho thao tác một chạm — chủ repo loại 2026-11-06
- Điều hướng chung 5 mục — giữ đủ mục theo vai trò như code
- Đổi font / bo góc / màu trạng thái theo quán — chỉ đổi màu chính + logo; màu trạng thái cố định để nhân viên không hiểu nhầm
- Đợt 2+ (Đơn online, Lịch sử, Menu, NCC, Cài đặt, trang khách…) — milestone sau
- Thêm tính năng mới khi vẽ lại — mọi thứ MỚI phải ghi nhãn và duyệt riêng

## Context

- Monorepo pnpm + Turborepo: `apps/api` NestJS 10 + TypeORM + MySQL 8 (`synchronize`, danh sách entity tường minh),
  `apps/web` + `apps/shop` React 19 + Vite, `packages/schemas` (zod), `packages/utils`, `packages/ui` (mới). Bản đồ code: `.planning/codebase/`.
- Nợ giao diện đo 2026-11-06: `apps/web` **2.103 chỗ `style={{…}}`**, ~7.200 dòng CSS cũ, 0 biến CSS; `apps/shop` có token riêng.
- Bản vẽ đợt 1: `docs/design/dot-1.html` (đủ 3 thiết bị, thanh đổi màu, bảng đối chiếu tính năng, tự kiểm tràn chữ 360px).
  Chưa được chủ repo duyệt — duyệt từng màn qua `/gsd-ui-phase`.
- Design System: `docs/DESIGN-SYSTEM.md` (token hướng A "Xanh tin cậy", luật §4, cải tiến bố cục §8, đổi màu theo quán §5).
- Kiểm kê tính năng thật: `docs/design/FEATURE-INVENTORY.md` + `docs/design/inventory/` — nguồn đối chiếu "không mất tính năng".
- Lỗi phát hiện khi kiểm kê (chưa sửa): `/admin/audit` phân trang hỏng; Sơ đồ bàn nhắc nút "↻ Làm mới" đã bị gỡ; chữ hướng dẫn lỗi thời.
- DB dev hiện dùng chung container `order_quan_balun_mysql` (cổng 3307) với Bà Lùn — tạm chấp nhận cho giao diện; phải tách trước khi thêm bảng thương hiệu.
- `.github/workflows/deploy*.yml` của Bà Lùn còn sót — gỡ/tắt trước lần push đầu.

## Constraints

- **Người dùng**: chữ ≥ 16px, nút ≥ 48px (nút chính 64), không hover/tooltip là đường duy nhất, hộp thoại chồng ≤ 2 tầng — người dùng lớn tuổi, điện thoại.
- **Tính năng**: giữ đủ 100% tính năng hiện có của mỗi màn được sửa — đối chiếu inventory; thiếu một là lỗi.
- **Thiết kế trước**: mỗi màn có UI-SPEC được chủ repo duyệt trước khi code (DESIGN-SYSTEM §4 luật 7).
- **Tech stack**: CSS variables + CSS thường, không Tailwind/MUI (bundle có gác ngân sách trong CI); icon `lucide-react`.
- **Thiết bị**: mỗi màn chạy tốt ở 360 / 390 (điện thoại), iPad ngang 1180, máy tính 1440; mốc 640 / 900 / 1280.
- **Git**: làm trên nhánh `ui/dot-1`; commit được, **push chỉ khi chủ repo bảo**, không merge vào `main` khi chưa duyệt.
- **DB**: không thêm cột vào bảng có sẵn khi còn dùng chung DB với Bà Lùn (`synchronize` bên kia sẽ xoá).
- **Ngôn ngữ**: tiếng Việt ở UI, comment, commit message.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Design system tập trung ở `packages/ui`, token 3 tầng primitive → brand → semantic | Đổi màu quán chỉ đổi `--brand-*`; component chỉ dùng semantic | — Pending |
| Hướng A "Xanh tin cậy" (màu KiotViet, Be Vietnam Pro, chữ nền 18px) | Chủ repo chốt 2026-11-06 | — Pending |
| Mỗi quán đổi **màu chính + logo**, áp cả quản lý lẫn trang khách; bảng 10 màu + tự nhập, chặn < 4.5:1 | Bán cho nhiều quán, mỗi quán một màu; vẫn phải đọc được | — Pending |
| Màu trạng thái cố định (xanh lá xong, đỏ huỷ, cam chờ, tím QR) | Nhân viên đổi quán/ca không hiểu nhầm | — Pending |
| Bố cục sắp lại theo DESIGN-SYSTEM §8, mỗi thay đổi có ghi chú | Chủ repo chọn 2026-11-06 | — Pending |
| Phase 0 Nền móng trước khung; thứ tự Khung → Sơ đồ bàn → Chi tiết → Gọi món → Thu tiền → Bếp → Thương hiệu | Thống nhất đến từ component + bộ kiểm, không từ thứ tự sửa | — Pending |
| Duyệt UI từng màn bằng `/gsd-ui-phase` | Duyệt nhỏ, sửa rẻ | — Pending |
| Tách DB riêng trước phase Thương hiệu | DB đang dùng chung với Bà Lùn; `synchronize` xoá cột lạ | — Pending |
| Chấp nhận giai đoạn "lai" (khung mới, màn cũ) | Chưa có khách thật, chưa deploy | — Pending |
| Bản vẽ bằng OpenDesign + skill UI/UX, xuất HTML | Pencil MCP không kết nối được | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-11-06 after initialization*
