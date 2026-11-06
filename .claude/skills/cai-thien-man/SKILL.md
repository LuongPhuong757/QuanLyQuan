---
name: cai-thien-man
description: Cải thiện UI/UX MỘT màn của apps/web (QuanLyQuan) theo bộ luật chung — một phông, một màu chủ đạo đỏ ớt đồng bộ trang khách, một kiểu nút, một kiểu bảng, chữ/nút to cho người lớn tuổi dùng điện thoại — mà không mất tính năng nào. Dùng khi user nói "làm đẹp màn ...", "cải thiện màn ...", "sửa giao diện màn ...", "dễ dùng hơn cho màn ...", hoặc gọi /cai-thien-man <tên màn>.
---

# Cải thiện một màn (UI/UX dễ dùng nhất)

Người dùng thật: **chủ quán + nhân viên phục vụ, phần lớn lớn tuổi, dùng điện thoại**.
Mục tiêu duy nhất: màn **dễ dùng nhất có thể** và **nhìn giống mọi màn khác**. Không làm phase,
không viết plan dài — làm thẳng trên code, từng màn một.

## ⛔ PHẠM VI: CHỈ UI/UX (chủ repo chốt 2026-11-06)

Đợt này chỉ sửa giao diện + trải nghiệm trong `apps/web` (JSX, CSS, câu chữ, bố cục, icon, gọi lại
API CÓ SẴN). Gặp yêu cầu/ý tưởng nào cần:
- sửa/thêm **API, endpoint, DTO** (`apps/api`), **DB/entity/cột/bảng**, `packages/schemas`;
- **thêm logic nghiệp vụ** (quy tắc tính tiền, trạng thái đơn, phân quyền, giới hạn, cookie/phiên…);
- cấu hình hạ tầng (docker, turbo, `.env`, CI);

→ **KHÔNG làm.** Ghi một dòng vào `docs/design/VIEC-NGOAI-UI.md` (mục "Đang chờ duyệt": ngày · màn ·
việc · vì sao cần · đụng file nào · rủi ro), làm phần UI làm được mà KHÔNG cần nó (nếu có), và báo
user trong câu trả lời: "đã ghi vào VIEC-NGOAI-UI.md mục #N". Kể cả khi user yêu cầu thẳng một việc
backend: nhắc quy ước này + hỏi lại user có muốn vượt quy ước lần này không, trước khi làm.
Gọi lại một endpoint đã có (vd nút "Gửi bếp" dùng `POST /orders/:id/send-to-kitchen`) vẫn là UI.

## Bộ luật chung (KHÔNG tự ý đổi — muốn đổi phải hỏi user)

**Phông:** chỉ `Be Vietnam Pro` (khai ở `apps/web/src/fonts.css`, áp ở `body`). Không thêm
`font-family` nào khác trong màn. Độ đậm chỉ 400 (thường) và 600 (nút, tiêu đề, số tiền).

**Màu** (viết hex đúng các mã này; KHÔNG thêm màu mới ngoài bảng):

| Vai trò | Mã |
|---|---|
| Chính (nút chính, link, nhấn mạnh) — đỏ ớt, ĐỒNG BỘ trang khách `apps/shop` (`--brand-600`) | `#b82a1e` |
| Chính đậm (hover, chữ trên nền nhạt) (`--brand-700`) | `#8f1d14` |
| Viền đang chọn, giá tiền (`--brand-500`) | `#cf3323` |
| Viền nhạt / nền nhạt / nền rất nhạt | `#f3b5a9` / `#fbe4de` / `#fef6f3` |
| Nguy hiểm (huỷ, xoá) — chỉ dùng dạng VIỀN (`button.danger`), không nền đặc, để không lẫn với nút chính đỏ | `#b4231d` |
| Cảnh báo | `#f59e0b` |
| Thành công / đã giao | `#16a34a` |
| Chữ chính / phụ / mờ | `#1f2937` / `#6b7280` / `#9ca3af` |
| Viền | `#e5e7eb`, `#d1d5db` |
| Nền trang / nền đầu bảng | `#f9fafb` / `#f3f4f6` |

Gặp màu lạ trong màn (xanh ngọc cũ `#0f766e`, xanh dương `#2563eb`/`#0070f4`, tím, cam lẻ…) →
quy về bảng trên theo VAI TRÒ. Chỗ nào màu đỏ đang mang nghĩa "tiền ra / lỗi / hết hàng" mà nằm
sát nút chính đỏ → thêm chữ/icon hoặc đổi hình (viền, nhãn) để không chỉ phân biệt bằng sắc đỏ.

**Nút** — chỉ 3 kiểu, dùng rule có sẵn trong `apps/web/src/styles.css`:
- Nút chính: `<button>` trần (nền `#b82a1e`, chữ trắng). **Mỗi màn/hộp thoại chỉ MỘT nút chính.**
- Nút phụ: `<button className="secondary">` (nền trắng, viền xám).
- Nút nguy hiểm: `<button className="danger">` (nền trắng, viền + chữ đỏ) — luôn có bước xác nhận
  trước khi xoá/huỷ. Không bao giờ tô nền đỏ đặc cho nút huỷ/xoá.
- Cao ≥ 48px (rule chung đã đặt), nút hành động chính ở đáy màn trên điện thoại nên 56–64px.
- Nút luôn có CHỮ. Chỉ icon trần cho 🔔, ⋯, ✕ — và phải có `aria-label`.
- Bỏ `style={{ background, color, padding, borderRadius }}` tự chế trên nút → dùng class.

**Bảng** — rule chung `table/th/td` trong `styles.css` (chữ 15px, đầu cột nền `#f3f4f6`,
dòng chẵn tô nhạt từ 640px). Trong màn:
- Không tự đặt lại `font-size`/`padding`/`background` cho `th/td` bằng style inline.
- Cột số tiền/số lượng căn PHẢI (`style={{ textAlign: 'right' }}` hoặc class), có `white-space: nowrap`.
- Bảng nhiều cột trên điện thoại: dùng `className="responsive"` (thành thẻ) + `data-label` cho
  từng `td` — xem rule `table.responsive` có sẵn.

**Cỡ chữ & chạm:** chữ nội dung ≥ 16px (bảng 15px là ngoại lệ đã chốt), nhãn phụ ≥ 13px.
Vùng bấm ≥ 48×48. Không dựa vào hover/tooltip làm đường DUY NHẤT để thấy thông tin.
Hộp thoại dùng `dvh` không dùng `vh`; chồng tối đa 2 tầng.

**UX:**
- Hành động hay dùng nhất phải thấy ngay, không giấu trong menu.
- Ít bước nhất: bớt hộp thoại xác nhận cho việc vô hại, giữ xác nhận cho việc mất dữ liệu/tiền.
- Trạng thái trống / đang tải / lỗi phải có câu tiếng Việt rõ ràng + hành động tiếp theo.
- Chữ dùng từ của quán ("Bàn", "Món", "Thanh toán"), không từ kỹ thuật.

**Ô nhập & icon** (rút từ màn Đăng nhập, 2026-11-06):
- Ô nhập cao ≥ 48px (rule chung) — bằng nút. Nền tự điền (autofill) đã được ghi đè thành trắng ở
  `styles.css`; không tự viết lại trong màn.
- Ô nhập mã/tên đăng nhập/mã khôi phục: `autoCapitalize="none" autoCorrect="off" spellCheck={false}`
  (iOS tự viết hoa chữ đầu → "Admin" ≠ "admin" → báo sai dù gõ đúng).
- `inputMode` chỉ đặt khi dữ liệu THẬT SỰ chỉ là số (tiền, số lượng, SĐT khách). Kiểm schema/DTO
  trước: tên đăng nhập là chuỗi tự do — bàn phím số sẽ khoá chủ quán (`admin`) ngoài cửa.
- Icon: `lucide-react` (đã cài), cỡ 20–24, `aria-hidden` + chữ hoặc `aria-label` trên nút. KHÔNG
  dùng emoji làm icon chức năng (👁 🙈 ✏️ 🗑…) — mỗi hệ điều hành vẽ một kiểu, lệch đường cơ sở.
- Nút nằm TRONG ô nhập (mắt mật khẩu, xoá nhanh): bọc ô + nút trong khung `position: relative`
  riêng, nút `top:0; bottom:0` + flex căn giữa — không neo theo cả hàng có nhãn (`top: 28px` lệch).
- `PasswordInput` là component dùng chung (đăng nhập, khôi phục, cài đặt, nhân sự, tài khoản):
  sửa nó là sửa mọi màn — kiểm cả các màn đó.

**Màn một thẻ đứng riêng** (đăng nhập, khôi phục, cài đặt ban đầu): căn giữa dọc bằng
`min-height: calc(100dvh - var(--env-banner-h, 0px))` + flex; thẻ `max-width ~420px`, padding 32
(24 dưới 400px), viền `#e5e7eb` + bóng `0 4px 16px rgba(17,24,39,.08)`; nút chính kéo hết ngang,
cao 56px. Xem `.login-page`/`.login-card` trong `styles.css` để dùng lại.

**Tên & logo quán:** KHÔNG viết cứng "Quán Bà Lùn" hay đường dẫn logo trong màn — sản phẩm cho
thuê nhiều quán. Lấy từ `apps/web/src/lib/store-brand.ts` (`STORE_NAME`, `STORE_LOGO_URL`).
Tiêu đề viết thường như tên riêng ("Quán Bà Lùn"), dòng phụ "Trang quản lý" — không trộn IN HOA,
không trộn tiếng Anh ("dashboard" → "trang quản lý").

**Ảnh/icon tĩnh có thể IN SẴN màu cũ:** `apple-touch-icon.png`, `favicon.svg`… làm hồi màu xanh
ngọc → nền xanh nằm trong file, CSS không gỡ được. Trước khi dùng một ảnh, mở xem (Read ảnh).
Cần ảnh cỡ nhỏ thì cắt từ ảnh gốc bằng `sips` (macOS):
`sips --cropToHeightWidth H W --cropOffset Y X in.jpg` rồi `sips -z 216 216 -s formatOptions 80`.
Logo tròn = `border-radius: 50%; object-fit: cover`, không cần ảnh có sẵn khung.

**Quên mật khẩu:** màn đăng nhập ghi "Quên mật khẩu - Liên hệ admin để được cấp lại" — không
đưa link `/recover` ra ngoài (route vẫn giữ làm đường cứu cho chủ quán).

**Kiểu câu chữ (chủ repo chốt):** dòng phụ/dòng hướng dẫn ngắn nối hai vế bằng dấu ` - ` (không
dùng `·` hay `?`), và KHÔNG có dấu chấm cuối câu. Vd "Trang quản lý - Đăng nhập để vào làm việc".

**Khung trang chung (2026-11-06) — MỌI màn phải dùng, đừng tự dựng vỏ:**
- `apps/web/src/lib/pages.ts` → `PAGES`: tên (`title`), nhãn nav (`navLabel`), độ rộng (`width`)
  của mỗi trang. Header `<h1>`, tiêu đề tab trình duyệt, nhãn nav dưới đều đọc từ đây — màn mới
  → thêm MỘT dòng vào `PAGES`, không ghi tên trang ở chỗ nào khác.
- Vỏ trang = `<PageLayout actions={...}>` (`components/PageLayout.tsx`), KHÔNG dùng
  `container`/`container wide`/`txn-page`/max-width riêng. Hai độ rộng: `wide` (tràn màn: lưới,
  bảng nhiều cột) · `narrow` (≤ 960px: form, danh sách). Lề hai bên = `--page-gutter` (16px / 24px
  từ 640px), header dùng chung → tên trang thẳng hàng với nội dung.
- KHÔNG đặt `<h1>` tên trang trong màn (header đã có, là `<h1>` duy nhất). Tiêu đề con trong màn
  dùng `<h2>`, không emoji.
- Nút thao tác của trang → prop `actions` của `PageLayout` (hàng ngay dưới header, cùng vị trí
  mọi trang). Tối đa MỘT nút chính (đỏ), còn lại `secondary`. Nhãn "+ Thêm <đối tượng>"
  ("+ Thêm món", "+ Thêm nhà cung cấp"), không "+ Món" / "+ Thêm" trần.
- Header: nền trắng đặc, sticky; CHỈ có `<h1>` tên trang (không tên quán — bỏ 2026-11-06) bên trái;
  bên phải: chuông lucide 48×48 (`NotificationBell variant="header"`), nhãn CHỮ vai trò
  (`.role-tag`: "Admin"/"Order"/"Bếp"/"Báo cáo", màu trung tính — máy dùng chung phải liếc là biết
  quyền), avatar chữ cái 44px (`UserMenu`) mở menu Tài khoản / Đăng xuất.
- ⛔ **Màn Bếp (`/kitchen`) KHÔNG đụng** (chủ repo chốt 2026-11-06): toàn màn hình riêng, không
  header/nav, chuông emoji cũ — có chủ đích (bếp đứng xa iPad).
- Viewport cho phép phóng to (đã bỏ `maximum-scale=1`) — đừng thêm lại.
- Nav dưới = `components/BottomNav.tsx`, mục theo role ở `navForRole()` (App.tsx): ≤ 4 mục + "Thêm"
  (tấm danh sách từ đáy). Nhãn chữ đầy đủ ("Lịch sử", không "L/sử"), icon lucide. Thêm màn mới
  vào nav → bỏ vào `more`, chỉ đưa lên `primary` khi dùng liên tục lúc đang phục vụ.

**Thẻ/danh sách trạng thái (rút từ thẻ bàn, 2 vòng góp ý):**
- **Tô màu theo VIỆC CẦN LÀM, không theo "có/không có dữ liệu".** Thẻ bàn: đỏ nét đứt + nhấp nháy
  nhẹ = bếp chậm; tím = QR chờ duyệt; cam `#f59e0b` = món xong chờ mang ra; xám = bình thường (kể
  cả đã giao đủ món). Viền đỏ cho MỌI thẻ có khách là sai — đỏ phải dành cho cảnh báo.
- **KHÔNG có "Chờ thanh toán"** (chủ repo bỏ 2026-11-06): giao đủ món mà khách còn ngồi ăn thì chưa
  phải chờ thanh toán — đừng suy ra trạng thái người dùng từ dữ liệu món.
- **KHÔNG có "Chưa gửi bếp"** (bỏ 2026-11-06): màn gọi món luôn báo bếp ngay; PENDING thực tế chỉ
  là GHI CHÚ cố ý không gửi bếp (`is_note`). Dòng ghi chú (`is_note: true`) không tính tiền/số
  món/chấm trạng thái.
- Màu chấm trạng thái phải KHỚP màu viền (đừng để "đang làm" đỏ trong khi viền đỏ = cảnh báo).
- Tình huống nguy hiểm thật → nhãn chữ + nút xử lý ngay trên thẻ được. Nút đặt NGOÀI nút thẻ
  (`position:absolute` trong ô bọc) — HTML không cho lồng `<button>` trong `<button>`.
- Trạng thái chi tiết gộp MỘT dòng "● 7 ● 3 ● 6" (chú thích ở nút ⓘ) → thẻ cao đều
  (`grid-auto-rows: 1fr`), không để một thẻ nhiều dòng kéo cả hàng cao.
- Đồng hồ chờ: icon `Timer` + chữ đầy đủ "8 phút" / "1 giờ 05" (không "8p"); cam ≥15', đỏ ≥25'.
  Hiện cho MỌI bàn có khách (chưa báo bếp thì tính từ lúc mở bàn).
- Trạng thái = chấm màu + CHỮ, không emoji, không chỉ màu.
- Nền khác hẳn giữa "trống" (xám nhạt, chữ "Trống") và "đang dùng".

**Badge trên nav chỉ cho VIỆC CẦN XỬ LÝ** (đơn chờ duyệt, món chờ bếp, phiếu chờ duyệt) — số chỉ
để biết (số bàn đang mở) thì bỏ, đỡ cả request poll.

**Thao tác hiếm dùng không đứng thường trực trên header**: "Đăng xuất" nằm trong menu bấm huy hiệu
tên (`components/UserMenu.tsx`), cùng "Tài khoản".

**Bộ lọc trên điện thoại** không được chiếm quá ~1/5 màn trước nội dung: mỗi nhóm MỘT hàng vuốt
ngang + mép phải mờ dần (`mask-image`) báo còn chip; máy tính (≥900px) thì xuống dòng. Nhóm lọc
không giúp gì (vd "Tại quán" = tổng số bàn) → bỏ hoặc chỉ hiện khi có dữ liệu. Chú thích thu vào
nút ⓘ. Bỏ câu gợi ý lạc chỗ khi giao diện đã tự gợi ý ("Trống").
- Bỏ mã/ID kỹ thuật (`ban-01`, uuid) khỏi giao diện nhân viên.
- Câu gợi ý ("Bấm vào bàn để gọi món") nói MỘT lần ở đầu danh sách, không lặp trên từng thẻ.
- Nút phụ đặt TRÊN một thẻ bấm được (vd "KV" chuyển sang KiotViet): tách khỏi vùng bấm chính
  (góc dưới), nhãn CHỮ chứ không icon dễ hiểu nhầm (🔒 = "bị khoá"), và có xác nhận.

**Bộ lọc:** nhóm theo ý nghĩa, mỗi nhóm có nhãn ("Trạng thái", "Loại bàn"); chip cùng cỡ, cao
44px, `aria-pressed`; tự xuống dòng thay vì cuộn ngang bị cắt; bộ lọc đếm = 0 làm mờ (vẫn bấm được).

**Máy tính:** màn dạng lưới/danh sách dài dùng `max-width` rộng (vd 1440px) thay vì 960px — đừng
để hai bên trống mà lưới chỉ 4 cột.

**Popup làm việc chính trên điện thoại** (chi tiết bàn, Gọi món, Xem đơn — rút từ đợt 2026-11-06):
- TOÀN MÀN (`100dvh`, bo góc 0, đệm `env(safe-area-inset-*)`) dưới 640/768px; máy tính mới nổi
  giữa màn 95dvh. Cao 95% là lộ một dải popup/header phía sau → trông như chồng hai lớp.
- `role="dialog"` luôn kèm `aria-labelledby` trỏ vào `id` của tiêu đề.
- **Thanh đáy dính** chứa tổng tiền + hành động kết thúc (Thanh toán / Báo bếp / Xem đơn ›). Đừng
  để nút chốt tiền to nhất ở ĐẦU danh sách. Thanh đáy: `position: sticky; bottom: 0` + `margin-top:
  auto` trong khung flex dọc để bám đáy cả khi danh sách ngắn.
- Không FAB tròn "+" không chữ — đưa vào thanh đáy, có chữ ("+ Gọi món").
- Đóng khi còn dữ liệu chưa gửi (giỏ món) → hỏi "Bỏ N món chưa báo bếp?" [Ở lại] [Bỏ món]. Trừ
  dữ liệu máy tự điền mà người dùng chưa đụng (vd khăn lạnh tự bỏ vào giỏ bàn mới).
- Xoá phần tử cuối trong tấm con → chỉ đóng tấm con, quay về màn trước; `stopPropagation` ở lớp
  phủ tấm con để cú chạm không dội lên lớp phủ cha.

**Dòng có nhiều thao tác** (dòng món, dòng hàng): chỉ hiện thường trực thao tác HAY DÙNG NHẤT dưới
dạng nút viền nhỏ (≥44px) + nút ⋯ (44×44). Thao tác thỉnh thoảng + nguy hiểm vào menu ⋯; mục
nguy hiểm luôn CUỐI menu, có vạch ngăn (`.drawer-menu-sep` + `.drawer-menu-danger`). Không giấu
thao tác sau cú vuốt (không ai thấy). Menu thao tác chỉ chứa thao tác — "Hướng dẫn" là nút ⓘ cạnh
tiêu đề.

**Cảnh báo lặp trên từng dòng** (vd "quá lâu, nên ưu tiên…" ở 6 món) → bỏ khỏi dòng (đồng hồ đổi màu là đủ). Thông báo "N món bếp chậm · Ưu tiên" đầu drawer chủ repo đã BỎ (2026-11-06) — đừng thêm lại; chỉ giữ thông báo có hành động rõ ("xong chưa mang ra · Giao tất cả"). Cũ: gom thành MỘT thông báo
đầu danh sách kèm hành động hàng loạt ("Ưu tiên tất cả"). Dòng chỉ giữ dữ kiện (đồng hồ chờ màu).

**Huỷ/xoá có lý do:** chọn lý do bằng chip một chạm (bắt buộc chọn, "Khác" mở ô gõ không bắt
buộc) — không bắt GÕ. Bớt số lượng thì không hỏi. Kiểm DTO trước: API nhận `reason` chưa
(`/orders/items/remove`, `/orders/:id/cancel-all` đã nhận).

**Lưới chọn món:** món đã chọn có cụm [−] số [+] ngay trên thẻ (44px) — đừng bắt vào màn khác mới
bớt được. Chip danh mục: số đi theo kết quả tìm, ẩn thanh cuộn (`scrollbar-width: none`), mép
phải mờ dần. Không tìm thấy → nút "Xoá tìm kiếm" / "Tìm trong tất cả món". Gọi tắt phổ biến (cf,
coke, hn…) thêm ở `ALIASES` trong `lib/menu-search.ts` (chung mọi quán; từ khoá riêng từng món là
việc backend). Mã món là dữ kiện phụ: nhỏ, nhạt, chung dòng meta.

**Màu trạng thái món** (drawer, thẻ bàn, chấm trạng thái) dùng CHUNG một bộ: đã báo bếp `#9ca3af`,
đang làm `#4b5563`, xong chờ mang ra `#f59e0b`, đã giao `#16a34a`, huỷ `#b4231d`.

**Trước khi thêm một hộp xác nhận**, kiểm hộp kế tiếp đã cảnh báo chưa (vd CheckoutDialog đã liệt
kê "N món chưa mang ra") — thêm nữa là 3 lớp bấm cho cùng một cảnh báo; phản biện với user.

**Góp ý "dữ liệu lạ" (tên trùng, bàn thừa…)**: truy DB trước (`docker exec quanlyquan-mysql-1 sh -c
'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" …'`) — thường là dữ liệu dev, không
phải lỗi UI. Báo user nguồn gốc + số lượng thật. Sửa dữ liệu dùng chung bị chặn quyền → ghi lệnh
vào VIEC-NGOAI-UI cho user tự chạy. Sắp xếp tên có số luôn `localeCompare(…, 'vi', {numeric:true})`.

**Thời gian chờ/ngồi:** MỘT kiểu `formatAge` (`lib/item-age.ts`): `54p`, `1g05`, `25g05`. Không tự
viết "25 giờ 05", "54 phút" trong màn. Mốc giờ cụ thể: `05/11 15:30`.

**Cảnh báo dính đầu màn:** nhiều dải → GỘP thành MỘT dòng 48px "N yêu cầu QR · N bàn chưa trả ›",
bấm mở bottom sheet liệt kê đủ (dòng có icon + CHỮ loại việc + bàn + thời gian). Đếm theo YÊU CẦU,
không theo bàn. Không phân loại chỉ bằng màu.

**Sơ đồ ↔ dải cảnh báo phải khớp:** việc nào trên dải thì thẻ bàn tương ứng cũng có dòng việc
("Xin hoá đơn · 17p", "Gọi nhân viên · 5p", "Chưa trả · mở từ 05/11 15:30"). Thẻ hiện tối đa 2
dòng việc + "+N việc khác". Icon trang trí không có nghĩa hành động (vd điện thoại "có món QR") → bỏ.

**Popup yêu cầu của khách:** có dòng tóm tắt bàn ("Bàn đang có 8 món · 365.000đ" — từ `GET /orders`),
nút làm luôn đi kèm ("Mở bàn để thanh toán", "In tạm tính" tự đánh dấu đã nghe), Duyệt = nút chính
có số ("Duyệt 3 món"), Bỏ = nút viền + chọn lý do. Đỏ ớt là màu CHÍNH (không phải nguy hiểm) —
user góp "đỏ = nguy hiểm" thì phản biện: nguy hiểm của app là VIỀN đỏ.

**Thẻ trong lưới đều hàng** (`grid-auto-rows: 1fr`): MỘT dòng việc ngắn ("Gọi món", "Tính tiền",
"Gọi nhân viên", "Chưa trả" — không kèm phút/giờ mở) + "+N"; thêm dòng là cả hàng cao theo. Tên
`nowrap` + "…". Bỏ chữ trùng thông tin (số món khi chấm trạng thái đã cộng ra).
Thẻ chọn món: CAO CỐ ĐỊNH, cụm −/+ đè lên dòng giá, ghi chú là icon góc; `:hover` bọc trong
`@media (hover: hover)` (cảm ứng dính hover → thẻ bớt về 0 vẫn viền đỏ).

**Tên gọi theo chữ KHÁCH thấy:** yêu cầu từ trang QR dùng đúng nhãn bên `apps/shop` (khách bấm
"Tính tiền" → nhân viên thấy "Tính tiền", không tự đặt "Xin hoá đơn"). Grep `apps/shop` trước khi đặt.

**Dòng món ở 360px:** tên chiếm CẢ dòng; dòng dưới = đồng hồ · giá trái, [Đã giao][⋯] phải.
Món READY: "Xong 6p trước" (từ `updated_at`), cam khi > 5 phút — không phải "Đã chờ" từ lúc gọi.
Nhóm cùng trạng thái có thao tác hàng loạt ("Giao tất cả (3)"). Thông tin lặp ở mọi dòng (NV gọi
cùng một người) → ghi MỘT lần ở đầu. Thông báo đầu danh sách TÁCH theo hành động (bếp chậm →
Ưu tiên; xong chưa mang ra → Giao tất cả).

**Nút chính đổi theo ngữ cảnh:** bàn còn món chưa giao → "Gọi món" là nút chính, "Thanh toán" phụ;
giao đủ → "Thanh toán" chính. Nguy hiểm ít dùng ("Xoá hết") = nút CHỮ xám nhỏ, không phải nút viền
đỏ to hết ngang.

**Lỗi API trong hộp thoại:** KHÔNG toast (đè tiêu đề popup). Hiện ngay trên hàng nút: có
`field_errors` → câu tiếng Việt theo TỪNG trường (bảng `FIELD_VN`, xem `describePayError` trong
CheckoutDialog); lỗi hệ thống → "Lỗi hệ thống, báo quản lý (mã: <8 ký tự request_id>)". Lỗi 400 kiểu
"must be a UUID" trên dev → kiểm dữ liệu fake trước (id `seed…` không phải hex).

**Luồng thu tiền (chốt 2026-11-06):** màn đầu GỘP tổng tiền + món (thu gọn, mở sẵn nếu còn món chưa
mang ra) + 4 hình thức lưới 2×2 (✓ + nền nhạt khi chọn). Chạm CK/Cả hai → sang QR luôn. Tiền mặt:
ô "Khách đưa" + nút nhanh (Đủ tiền / làm tròn 50k-100k-200k-500k) + "Thối lại" (chỉ tính, không
gửi server). Màn QR: mã + số tiền TRÊN CÙNG, tài khoản là một dòng "Nhận vào: … · Đổi", mở sẵn TK
dùng lần trước (localStorage). GIỮ: bắt chụp bill mọi đơn CK, không chờ webhook tại quầy, luật
`lib/checkout-block.ts` (đừng sửa luật để rút bước). Ô tổng tiền nền trung tính, không hồng/đỏ.

**Poll:** trước khi thêm nhịp kéo trong màn, kiểm App/store đã kéo chưa (`guestPendingStore`,
`useStaleUnpaid`) — đọc store thay vì kéo trùng.

**Màn Bếp chưa được đụng:** component dùng chung với Bếp (GuestRequestCards, GuestQrBanner) → thêm
prop/variant cho màn Order (`labeled`, `variant="compact"`, nhánh `canApprove`), Bếp giữ nguyên. Đổi
hàm dùng chung làm đổi chữ ở Bếp (vd `formatAge`) → hỏi user trước.

**Soát bằng mắt:** chụp màn 390×844 bằng playwright-core (scratchpad) + Chrome for Testing trong
`~/Library/Caches/ms-playwright/chromium-*/` — đăng nhập 5173, mở bàn, chụp từng trạng thái.

## Khi user (hoặc công cụ audit) đưa danh sách góp ý

**Trước khi thiết kế cảnh báo/trạng thái mới: kiểm trạng thái đó CÓ XẢY RA trong luồng thật không**
(đọc code nơi sinh ra nó — vd PENDING chỉ sinh từ ghi chú). Góp ý dựa trên ảnh chụp có thể đang
nhìn DỮ LIỆU MẪU tạo sai. Dữ liệu mẫu phải tạo ĐÚNG như luồng thật (vd gọi món qua `items-bulk`
với `send_to_kitchen: true` như BulkOrderModal), không tạo trạng thái mà app không bao giờ sinh ra.

**Đánh giá TRƯỚC khi làm** (user yêu cầu 2026-11-06): với mỗi ý, trả lời trong câu báo cáo:
1. **Có cần thiết không?** Ý đó sửa một vấn đề thật của người dùng (lớn tuổi, điện thoại) hay chỉ
   là sở thích thẩm mỹ? Ý không cần → nói thẳng, đề xuất bỏ.
2. **Ảnh hưởng bao nhiêu chức năng?** Sửa ở component/CSS DÙNG CHUNG (header, nav dưới,
   `PasswordInput`, rule `button`/`input`/`table` trong `styles.css`) là đổi MỌI màn → liệt kê các
   màn bị ảnh hưởng. Ý đụng logic nghiệp vụ / API / DB → KHÔNG làm, ghi vào
   `docs/design/VIEC-NGOAI-UI.md` (xem PHẠM VI).
3. **Có đi ngược quyết định cũ không?** Grep comment quanh chỗ sửa: nhiều chỗ ghi "chủ quán chốt
   ngày …" kèm lý do (vd header trong suốt, thứ tự mục nav, chữ trên thẻ bàn). Gặp → nêu quyết định
   cũ + lý do cho user, để user chọn; làm theo user thì cập nhật comment ghi lý do mới.
4. **Chưa rõ thì HỎI** (AskUserQuestion, có phương án + đánh đổi) — không đoán. Ý sai thì phản biện
   kèm bằng chứng, không làm cho xong.

Kiểm TỪNG ý với code trước khi làm, phản biện nếu sai — user đã yêu cầu điều này:
- Ý đổi nhãn/kiểu dữ liệu → đọc DTO/entity ở `apps/api` xem dữ liệu thật là gì.
- Ý "có text debug / chuỗi lạ trong DOM" → `grep -rn` chuỗi đó trong `apps/` + `packages/`. Không
  thấy → thường do extension trình duyệt chèn; bảo user thử cửa sổ ẩn danh, KHÔNG sửa mò.
- Góp ý viết bằng class Tailwind (`min-h-screen`, `shadow-md`…) → dịch sang CSS thường; repo
  không dùng Tailwind.
- Báo user rõ: ý nào làm, ý nào không làm + lý do kèm bằng chứng (file:dòng).

## Quy trình cho MỖI màn

1. **Xác định màn**: tìm route trong `apps/web/src/App.tsx` → file page + component con + CSS
   riêng (vd `suppliers-ui.css`, `nhan-su.css`, `so-tien.css`).
2. **Liệt kê tính năng TRƯỚC khi sửa** (nút, ô nhập, bộ lọc, hộp thoại, phím tắt, trạng thái):
   một danh sách ngắn trong câu trả lời. Sau khi sửa, đối chiếu lại — **thiếu một tính năng là lỗi**.
3. **Đọc comment quanh chỗ trông lạ** — repo comment dày bằng tiếng Việt giải thích VÌ SAO;
   nhiều chỗ "lạ" là cố ý (vd màn "Nguyên liệu món" chữ/nút to bất thường là cố ý — giữ nguyên).
   Đọc thêm bẫy CSS ở `CLAUDE.md §5` (`.ncc-ui` flex column, `button.secondary` đè màu…).
4. **Sửa** theo bộ luật trên. Ưu tiên: (a) màu/phông/nút/bảng về chuẩn, (b) bỏ style inline
   cho màu/chữ/khoảng cách → class trong CSS của màn, (c) cải thiện UX rõ ràng (nút chính to,
   đặt đúng chỗ, câu chữ dễ hiểu). Không đổi logic nghiệp vụ, không đổi API, không đổi DB.
5. **Kiểm**:
   - `pnpm --filter @order/web typecheck` và `pnpm --filter @order/web test` phải xanh.
   - Grep trong các file đã sửa: không còn `#0f766e` hay mã màu ngoài bảng.
   - Nhìn ở bề rộng 360px và 1440px (nhờ user mở `pnpm dev` hoặc dùng công cụ trình duyệt nếu có):
     không tràn ngang, không gãy chữ giữa từ, nút không bị cắt.
6. **Phát hành lên localhost:5173 — CHỈ khi xong hẳn một đợt sửa** (chủ repo chốt 2026-11-06: có bên
   khác đang theo dõi 5173, trang tự cập nhật liên tục rất khó dùng). Cổng 5173 chạy BẢN BUILD tĩnh
   (`vite preview`, không HMR), KHÔNG chạy `vite` dev. Xong đợt sửa + kiểm xanh →
   `cd apps/web && pnpm build` (preview tự phục vụ `dist/` mới; người xem chỉ thấy khi TỰ tải lại).
   Không build lại giữa chừng khi đang sửa dở. Nếu preview chưa chạy:
   `cd apps/web && pnpm exec vite preview --port 5173 --strictPort` (proxy API dùng lại `server.proxy`).
   Trang `/__ui` chỉ có ở dev — không có trên bản preview.
7. **Báo user** ngắn gọn: đã đổi gì (trước → sau), danh sách tính năng đã đối chiếu đủ, chỗ nào
   cần user tự xem bằng mắt. **Không commit/push** khi user chưa bảo. Khi user bảo commit:
   `style(web): cải thiện giao diện màn <tên>` trên nhánh hiện tại, chỉ `git add` file của màn.

## Không làm

- Không chạy `pnpm format`/prettier (repo không có cấu hình → reformat cả codebase).
- Không đụng `apps/api`, DB, `packages/schemas`, docker/turbo/.env — ghi vào `docs/design/VIEC-NGOAI-UI.md` (xem PHẠM VI ở đầu).
- Không thêm thư viện UI (Tailwind/MUI…) — CSS thường + biến/hex theo bảng trên.
- Không "đồng bộ" một màn cố ý to/khác chuẩn khi comment đã ghi lý do.
