# Việc NGOÀI phạm vi UI/UX — chờ chủ repo kiểm tra

Quy ước (chủ repo chốt 2026-11-06): đợt này **chỉ sửa UI/UX**. Mọi yêu cầu/ý tưởng đụng tới
**API, backend, DB, hoặc thêm logic nghiệp vụ** thì KHÔNG tự làm — ghi vào file này, chủ repo
xem rồi quyết định. Skill `/cai-thien-man` ghi tiếp vào đây.

Trạng thái: `⏳ chờ duyệt` · `✅ đã làm (cần soát lại)` · `❌ bỏ`

Mỗi mục ghi: ngày · màn liên quan · việc · vì sao cần · đụng file nào · rủi ro.

---

## Đã làm trong phiên 2026-11-06 — TRƯỚC khi có quy ước này (cần soát lại)

| # | Trạng thái | Việc | Đụng file | Rủi ro / cần kiểm |
|---|---|---|---|---|
| 1 | ✅ cần soát | **Gỡ hẳn KiotViet**: bỏ API `PATCH /tables/:id/lock`, `POST /tables/unlock-all`; bỏ chặn gọi món / QR / cấp bàn đơn online khi bàn khoá; bỏ cột `restaurant_tables.kiotviet_locked` | `apps/api/src/modules/tables/tables.controller.ts`, `tables/entities/restaurant-table.entity.ts`, `orders/orders.service.ts`, `public/table-guest.service.ts`, `admin-online-orders/admin-online-orders.service.ts` (+ integration test), `packages/schemas/src/tables.ts` | `synchronize` đã XOÁ cột trên DB 3308. Trỏ nhầm API vào DB 3307 (Bà Lùn) sẽ xoá cột bên đó |
| 2 | ✅ cần soát | Cookie đăng nhập `SameSite=Strict` → `Lax` (Safari iPhone bắt đăng nhập lại khi mở từ link ngoài) | `apps/api/src/modules/auth/jwt.service.ts`, comment `common/middleware/csrf-origin.middleware.ts` | Lax vẫn chặn cookie trên POST từ trang lạ + còn lớp kiểm Origin cho `/admin/*`, `/auth/*`. Các route ghi khác (`/orders`…) chỉ còn dựa vào Lax |
| 3 | ✅ cần soát | Phiên đăng nhập 7 ngày → 3650 ngày (mặc định trong `docker-compose.prod.yml`) | `docker-compose.prod.yml` | `.env` trên server nếu đặt sẵn `JWT_LIFETIME_DAYS=7` thì vẫn 7 ngày |
| 4 | ✅ cần soát | Bỏ giới hạn 5 lần/5 phút của `POST /auth/login` (cả quán chung 1 IP → 1 người gõ sai khoá cả quán) | `apps/api/src/modules/auth/auth.controller.ts` | Còn giới hạn chung 600 request/phút/IP. Muốn chống dò mật khẩu tốt hơn: giới hạn theo TÊN ĐĂNG NHẬP thay vì theo IP |
| 5 | ✅ cần soát | DB dev riêng cổng 3308; bỏ `container_name` cứng | `docker-compose.yml`, `CLAUDE.md` | Chạy API phải kèm `MYSQL_PORT=3308` (turbo không chuyển biến này) |
| 6 | ✅ cần soát | Bỏ badge "số bàn đang mở" trên nút Order + xoá store `lib/open-tables-badge.ts` | `apps/web/src/App.tsx`, `apps/web/src/pages/OrdersPage.tsx` | Endpoint `GET /orders/open-count` giờ không còn màn nào gọi (vẫn để trong API) |

Ghi chú: nút "Gửi bếp" trên thẻ bàn dùng LẠI API có sẵn `POST /orders/:id/send-to-kitchen` (đúng
nút "Báo bếp" trong drawer) — không thêm logic backend.

---

## Đang chờ duyệt

| # | Ngày | Màn | Việc | Vì sao cần | Đụng | Rủi ro |
|---|---|---|---|---|---|---|
| 7 | 2026-11-06 | Đăng nhập + header | Tên quán + logo theo TỪNG quán (thay hằng số `apps/web/src/lib/store-brand.ts`) | Sản phẩm cho thuê nhiều quán; màn đăng nhập (trước khi có phiên) phải biết tên quán | Thêm `store_name` (+ logo) vào `GET /api/public/store`; web cần thêm `/api` vào proxy `apps/web/vite.config.ts` | Thấp — chỉ thêm trường đọc |
| 8 | 2026-11-06 | Sơ đồ bàn | Bảng "đơn đang chờ" bên phải lưới bàn trên máy tính | Màn rộng còn chỗ trống; thu ngân/quản lý thấy ngay việc cần xử lý | Có thể chỉ cần dữ liệu `/orders` hiện có (UI thuần) — cần chốt nội dung bảng trước | Thấp |
| 10 | 2026-11-06 | Header (menu tài khoản) | Nhân viên TỰ đặt tên hiển thị (hiện chỉ admin đổi được, ở màn Nhân sự) | Avatar lấy chữ cái của tên hiển thị; tài khoản "chưa đặt tên" chỉ hiện tên đăng nhập. Menu đã nhắc "Đặt tên hiển thị" — nhưng chỉ cho admin | Thêm `PATCH /auth/me` (đổi `full_name` của chính mình) + ô sửa ở `AccountPage` | Thấp |
| 9 | 2026-11-06 | Toàn bộ | `pnpm dev` (turbo) không truyền `MYSQL_PORT` vào API | Chạy hệ thống bằng 1 lệnh | `turbo.json` (`passThroughEnv`) hoặc `apps/api/.env` | Thấp — chỉ cấu hình dev |
| 12 | 2026-11-06 | Lịch sử | (a) Tiêu đề ngày: số đơn CẢ NGÀY mọi trạng thái (hiện chỉ đếm trên trang + ghi "còn ở trang trước/sau") hoặc chia trang theo ngày; (b) ô "Chưa thu" (tiền đơn đang mở) cạnh "Đã thu"; (c) dòng "Giảm giá" trong tổng kết đơn | Góp ý review #2, #5, #13. `revenue_by_day` của `/orders/stats` chỉ có đơn đã thu; đơn không có trường giảm giá | `orders.service.ts` `stats()` thêm `orders_all_by_day` + `unpaid_revenue` (một truy vấn) — (c) cần cột mới, chờ quyết định có tính năng giảm giá không | Thấp (a,b) — chỉ thêm trường đọc; (c) đụng DB |
| 11 | 2026-11-06 | Gọi món (tìm món) | Từ khoá phụ RIÊNG từng món (vd "cf" cho "Cà phê sữa đá", "coke" cho Coca) | Đã làm bộ gọi tắt CHUNG ở `apps/web/src/lib/menu-search.ts` (cf/cafe/coke/hn/sg/bbq) — UI thuần. Món đặc thù của từng quán cần chủ quán tự khai | Thêm cột `keywords` vào `menu_items` + ô nhập ở màn Menu + trả về trong `GET /menu` | Thấp — chỉ thêm cột đọc |
| 12 | 2026-11-06 | Sơ đồ bàn | Chia bàn theo KHU VỰC ("Tầng 1 / Tầng 2 / Sân vườn") | Quán nhiều khu, lưới dài khó tìm bàn | Thêm cột `area` vào `restaurant_tables` + ô chọn khu ở Quản lý bàn; web nhóm lưới theo khu | Thấp |
| 13 | 2026-11-06 | Popup "Khách bàn X gọi" (QR) | Duyệt TỪNG món + sửa số lượng trước khi duyệt | Khách gọi 3 món mà 1 món hết / gọi dư — hiện chỉ duyệt hoặc bỏ CẢ lượt | `POST /table-requests/:id/approve` nhận danh sách `{menu_item_id, qty}` được duyệt | Trung bình — đổi logic duyệt |
| 14 | 2026-11-06 | Dữ liệu dev 3308 | Bàn trùng: "Bàn 01–20" (fake) + "Bàn 001–100" (seed lúc 10:13). Chủ repo chọn ẨN bộ 001–100 — Claude bị chặn thao tác (sửa dữ liệu dùng chung), cần chủ repo chạy | Huỷ 5 đơn đang mở trên ban-002/003/005/006/007 (Nhật ký bàn) rồi `UPDATE restaurant_tables SET is_active=0 WHERE code REGEXP '^ban-[0-9]{3}$'` | Chỉ DB dev |
| 15 | 2026-11-06 | Sơ đồ bàn / QR | Thanh toán xong thì BE tự đóng (ack) lời gọi "Tính tiền"/"Gọi nhân viên" còn treo của bàn | Bàn 16 đã trả 10:47 nhưng lời gọi "Tính tiền" 10:04 vẫn treo → bàn trống hiện "Tính tiền". Web đã tự ack sau khi thu tiền ở drawer (UI, API có sẵn), nhưng thu ở chỗ khác (Đơn online, máy khác mất mạng) vẫn sót | `checkout()` ở `orders.service.ts` set `acked_at` cho `table_calls` cùng `table_code` | Thấp |
| 16 | 2026-11-06 | Dữ liệu dev 3308 | ✅ ĐÃ LÀM (chủ repo cho phép): đổi 2 ID tài khoản QR `seeda0f3…`/`seed1b69…` → UUID thật (+ `orders.paid_to_account_id`, `payment_intents.expected_account_id`), và 30+ ID dòng món `seed…` (+ `order_activity_logs.item_id`, `order_item_ingredient_usage.order_item_id`). Còn 59 ID đơn `seed…` (8 đơn đang mở) chưa đổi — chưa thấy API nào kiểm UUID cho id đơn | Thanh toán CK báo 400 `paid_to_account_id must be a UUID`; huỷ món cũng sẽ 400 (`item_ids` IsUUID) | DB dev | Thấp |
| 17 | 2026-11-06 | Thanh toán | "Hoàn tác" sau khi thu tiền (mở lại đơn trong ~5 giây) | Bấm nhầm hình thức / nhầm bàn | API mở lại đơn đã đóng + đảo bút toán thu | Cao — đụng sổ tiền |
| 18 | 2026-11-06 | Thanh toán | Giảm giá / phụ phí / tách bill | Nhu cầu phổ biến ở quán | Trường mới trên đơn + `computeCheckoutTotals` + hoá đơn in | Cao — logic tiền |
| 19 | 2026-11-06 | Mã QR nhận tiền | Tên NỘI BỘ (nhân viên chọn: "TK Bố") tách khỏi tên HIỂN THỊ cho khách (chủ TK + ngân hàng) | Màn QR giơ cho khách đang lộ nhãn nội bộ | Thêm cột `display_name` vào `payment_qr_accounts` + ô ở Cài đặt | Thấp |
| 20 | 2026-11-06 | Thanh toán CK | Nội dung CK một mẫu cố định, không tên nhân viên ("QBL B02 0611") | Hiện mỗi TK một kiểu ("BAN02CMX ADMIN" / "BL BAN02CMX ADMIN" — tiền tố theo ngân hàng); "CMX" là mã đơn để webhook khớp | `buildTransferNote` (`packages/schemas`) + luật khớp webhook SePay — ⚠ đổi là đụng đối soát tự động | Trung bình |
| 21 | 2026-11-06 | Ghi nợ | Gợi ý khách đang nợ sẵn + ô SĐT để "Thu nợ" gom theo người | Hiện chỉ gõ tên tự do | API danh sách khách nợ + cột SĐT nợ | Thấp |
| 22 | 2026-11-06 | Toàn bộ | Đẩy yêu cầu QR bằng SSE/WebSocket thay vì poll | Đã giảm ~46 → 12 request/phút/tab (bỏ poll trùng, 3s → 5s) — nhiều máy vẫn tốn | Endpoint SSE + hook web | Trung bình |

