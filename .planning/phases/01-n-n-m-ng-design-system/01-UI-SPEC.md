---
phase: 1
slug: nen-mong-design-system
status: approved
reviewed_at: 2026-11-06
shadcn_initialized: false
preset: none
created: 2026-11-06
---

# Phase 1 — Hợp đồng thiết kế UI: Nền móng design system

> Hợp đồng hình ảnh + tương tác cho `packages/ui`. Nguồn sự thật: `docs/DESIGN-SYSTEM.md` §3–§5, §8; bản vẽ `docs/design/dot-1.html`; `01-CONTEXT.md` (D-01..D-14). Phase này KHÔNG đổi màn nghiệp vụ nào — hợp đồng áp cho component chung và trang `/__ui`.
> Mọi giá trị dưới đây là token có sẵn trong `packages/ui/src/tokens/*.css`; phần "SỬA" là chỗ code hiện tại lệch hợp đồng.

---

## Design System

| Thuộc tính | Giá trị |
|------------|---------|
| Tool | none (không shadcn — repo dùng CSS thuần + CSS variables, cấm Tailwind/MUI; không có `components.json`) |
| Preset | không áp dụng |
| Component library | tự dựng trong `packages/ui` (xuất mã nguồn, không build), class `.ui-*`, biến thể `.ui-x--y` |
| Icon library | `lucide-react@0.460.0` (ghim cứng), import từng tên icon, nét 2px, luôn `aria-hidden`, luôn kèm chữ |
| Font | Be Vietnam Pro tự host woff2 (latin / latin-ext / vietnamese) ở `packages/ui/src/fonts/`; hợp đồng component dùng 2 độ đậm 400 / 600; 500 chỉ được tải sẵn (CONTEXT khoá) để `--fw-medium` không rơi về 400, component phase 1 không dùng. Mỗi độ đậm một `@font-face` riêng (KHÔNG gộp dải `400 600`) — LỆCH có chủ đích so với ghi chú CONTEXT "giữ cách khai gộp dải của shop": Be Vietnam Pro là font tĩnh (mỗi độ đậm một file), gộp dải sẽ làm trình duyệt tổng hợp đậm giả (RESEARCH Pitfall 2); gộp dải chỉ đúng cho Baloo 2 biến thiên. Không gọi Google Fonts. Baloo 2 giữ ở shop. |

Nguồn: pre-populate từ DESIGN-SYSTEM §2–§3 + CONTEXT (Claude's Discretion: font).

---

## Spacing Scale

Bội số của 4. Dùng token `--sp-*` đã có.

| Token | Giá trị | Dùng cho |
|-------|---------|----------|
| xs (`--sp-1`) | 4px | khoảng cách icon–chữ, đệm trong badge |
| sm (`--sp-2`) | 8px | khoảng giữa chip, giữa các mục trong hàng |
| md (`--sp-4`) | 16px | đệm ngang mặc định của trang / thẻ trên điện thoại |
| lg (`--sp-6`) | 24px | đệm thẻ, khoảng giữa các khối |
| xl (`--sp-8`) | 32px | khoảng cách bố cục ≥ 900px |
| 2xl (`--sp-12`) | 48px | ngắt khối lớn (trang `/__ui`, bố cục ghép) |
| 3xl | 64px | chỉ cho chiều cao nút chính (không dùng làm khoảng cách) |
| nội bộ (`--sp-3/5/7/9/10`) | 12 / 20 / 28 / 36 / 40px | chỉ bên trong component chung, xem ghi chú dưới |

Các token `--sp-3` 12, `--sp-5` 20, `--sp-7` 28, `--sp-9` 36, `--sp-10` 40 là **nội bộ component** (bội 4, dùng bên trong component chung khi cần); KHÔNG dùng làm khoảng cách bố cục trên `/__ui` hay màn ghép — ở đó chỉ dùng 4/8/16/24/32/48/64 (ngắt khối lớn dùng 48, không dùng 40).

Ngoại lệ có chủ đích (kích thước chạm, không phải khoảng cách):
- `--tap-min` = 48px: sàn chiều cao mọi nút / ô bấm / mục menu / chip / `IconButton` (48×48).
- Nút mặc định cao 52px; nút chính lớn (Gửi bếp, Thanh toán, nút Xong bếp) cao 64px; nút Xong bếp 64×64.
- Ô nhập cao 52px, viền 1.5px.
- Thanh điều hướng dưới cao 72px (cộng `env(safe-area-inset-bottom)`).
- `BottomBar` cố định: nội dung phía trên có đệm dưới đúng bằng chiều cao thanh (+ safe-area) — component tự cấp, màn không tự tính.
- Mốc responsive (min-width): 640 / 900 / 1280. Kiểm 4 khung: 360, 390, 1180, 1440.

---

## Typography

Chỉ dùng token `--fs-*`, `--fw-*`, `--lh-*`. KHÔNG có cỡ < 16px ở bất kỳ đâu (kể cả nhãn điều hướng, badge, chip). Thông tin phụ làm nhạt màu (`--text-muted`), không thu nhỏ.

| Vai trò | Cỡ | Độ đậm | Line-height | Token | Dùng cho |
|---------|----|---------|-------------|-------|----------|
| Body | 18px | 400 | 1.6 | `--fs-sm` / `--fw-regular` / `--lh-normal` | nội dung, ô nhập, mô tả, ghi chú |
| Label | 16px | 600 | 1.3 | `--fs-xs` / `--fw-bold` / `--lh-tight` | nhãn trên ô nhập, nhãn điều hướng, chip, badge, dòng lý do trên nút bị chặn |
| Heading | 24px | 600 | 1.3 | `--fs-md` / `--fw-bold` / `--lh-tight` | tiêu đề màn / hộp thoại / EmptyState; (nút 18px 600 theo DESIGN-SYSTEM §3) |
| Display | 32px | 600 | 1.3 | `--fs-xl` / `--fw-bold` / `--lh-tight` | "Tổng cần thu", số tiền lớn trong thẻ (quy tắc §4.10: số tiền là chữ to nhất) |

- Chốt **4 cỡ** (16 / 18 / 24 / 32) và **2 độ đậm** (400, 600) làm hợp đồng cho component phase 1. Nút: 18px / 600.
- Cỡ 20 / 28 / 40 (`--fs-base/lg/2xl`) và độ đậm 500 tồn tại trong token cho màn nghiệp vụ phase sau; component chung phase 1 KHÔNG dùng. Độ đậm 500 vẫn được tải woff2 để `--fw-medium` không rơi về 400 (Pitfall 2 của RESEARCH).
- Không xuống dòng (`white-space: nowrap`, DESIGN-SYSTEM §4.8) trong component: nhãn nút, chip, tiêu đề header (trừ ô tên quán trong `AppHeader` — được xuống tối đa 2 dòng, KHÔNG gắn `data-nowrap`), nhãn điều hướng, CountBadge. Nội dung tự do (tên món, ghi chú, mô tả EmptyState) được xuống dòng, không cắt "…".
- Số tiền dùng `font-variant-numeric: tabular-nums` (đề xuất mặc định).

---

## Color

Nguồn: DESIGN-SYSTEM §3 + §5. Không hex cứng ngoài file token (D-05).

| Vai trò | Giá trị | Dùng cho |
|---------|---------|----------|
| Dominant (60%) | `--bg-page` `#F5F7FA` | nền trang, vùng nội dung |
| Secondary (30%) | `--bg-surface` `#FFFFFF` + `--bg-muted` `#EEF1F4` | thẻ, header, thanh điều hướng, bảng trượt, hộp thoại, chip chưa chọn; viền `--border` `#E5E5E5` |
| Accent (10%) | `--color-primary` `#0057D9` (mặc định; quán ghi đè qua `--brand-*`) | xem danh sách dưới |
| Destructive | `--color-danger` `#C81E1E` | chỉ: nút huỷ/xoá, mục nguy hiểm trong `Menu`, `Strip` đỏ, `ErrorState`, viền + icon lỗi của ô nhập |
| Text | `--text` `#0A0A0A` / `--text-muted` `#525252` (7.28 trên `--bg-page`) | |
| Viền ô nhập | `--border-input` `#8A8A8A` (3.45:1) | |

Accent (`--color-primary`) CHỈ dành cho:
1. Nền nút hành động chính (`Button` primary) + chữ `--color-on-primary`.
2. Chip lọc / segmented đang được chọn.
3. Mục điều hướng đang mở (icon + nhãn + vạch chỉ báo).
4. Viền + vòng focus (`--focus-ring` 3px, primary 40%) trên mọi phần tử tương tác.
5. Công tắc `Switch` ở trạng thái bật; `Stepper` nút ±; liên kết chữ.
6. Màu `--color-info` (= primary) cho Badge info.
7. Nền `CountBadge` tone mặc định (`primary`) — chỉ là số đếm nhỏ (24px) trên chuông / mục điều hướng / chip; tone `danger` / `qr` dùng màu trạng thái cố định.

Cấm: dùng accent cho nền thẻ, nền header, icon trang trí, tiêu đề.

Màu trạng thái CỐ ĐỊNH, không theo quán (DESIGN-SYSTEM §5, §4.9):
- Xanh lá `--color-success` `#047857` — chỉ nhãn/thông báo "đã xong"; **không có nút xanh lá**.
- Cam `--color-warning` `#C2410C` — đang chờ.
- Đỏ `--color-danger` — huỷ / trễ / phá huỷ.
- Tím `--color-qr` `#6D28D9` (nền nhạt `--color-qr-tint` `#F1EBFF`) — khách gọi qua QR + khoá KiotViet; dùng cho `Strip` kiểu QR và Badge tone `qr`.
- Vàng nhạt `--color-note-tint` `#FFF6CC` — nền ghi chú bếp.
- Nền thông báo `Toast`: `--bg-inverse`, chữ `--text-inverse`; icon trạng thái đi kèm chữ (không dựa riêng màu).

Thanh thử màu trên `/__ui`: ô nhập mã + bảng 10 màu soạn sẵn (DESIGN-SYSTEM §5), gọi `deriveBrand()` / `applyBrand()` có sẵn; màu có tương phản < 4.5:1 với chữ trắng bị chặn kèm lý do tiếng Việt (không áp, không lưu).

---

## Component Inventory (D-01) — hợp đồng theo component

Quy ước chung: mọi phần tử bấm cao ≥ 48px; focus thấy rõ (`--focus-ring`); không `:hover`/`title` là đường duy nhất lộ thông tin; icon 24 (nút, điều hướng) / 20 (chip) / 16 (nhãn); `prefers-reduced-motion` tắt chuyển động; overlay dùng `dvh`, `env(safe-area-inset-bottom)`, và khai `flex-direction: row` tường minh nếu overlay là flex (CLAUDE.md §5).

| Component | Hợp đồng hình + tương tác |
|-----------|----------------------------|
| `Button` (có) | Cao 52 / `size="lg"` 64; 18px 600; bo `--r-md`; nhãn không xuống dòng. Biến thể: primary, secondary, danger, ghost. Bị chặn: `aria-disabled="true"`, KHÔNG thuộc tính `disabled`, viền đứt + ⚠ (icon 16) + lý do trên nút, vẫn bấm được → gọi `onBlockedClick`, không gọi `onClick`. |
| `Input` / `MoneyInput` / `Select` / `Textarea` (có) | Cao 52 (Textarea tối thiểu 3 dòng), viền 1.5px `--border-input`, nhãn 16px đặt TRÊN ô gắn `htmlFor`; lỗi = viền đỏ + icon + chữ đỏ dưới ô. `MoneyInput`: `inputMode="numeric"`, hậu tố "đ". Chữ ≥ 16px (chống iOS zoom). |
| `Stepper` (có) | `− SL +`, nút 48×48, giá trị giữa không nhập tay; chặn `min`/`max` (nút chạm mốc thì bị chặn, có `aria-disabled`). Cỡ lớn 64 cho màn Gọi món. |
| `Card` / `CardButton` (có) | Nền `--bg-surface`, viền `--border`, bo `--r-lg`, đệm 16 (điện thoại) / 24; `CardButton` là `<button>` cao ≥ 48. Không bóng ở phase này, trừ `--shadow-sm`. |
| `Badge` (có, thêm tone `qr`) | Tone: neutral, info, success, warning, danger, **qr**. Chữ 16px 600, nowrap, icon 16 tuỳ chọn; luôn có chữ (không chỉ màu). |
| `AppHeader` | Cao 64, `--bg-surface`, `--z-header`, viền dưới `--border`. Trái: logo + tên quán (tên quán là nội dung tự do, không có đường hover: chữ 16px/600, tối đa 2 dòng bằng `line-clamp: 2` / `-webkit-line-clamp: 2`, line-height 1.3 → 42px, vừa header 64; KHÔNG dùng ellipsis 1 dòng; tên quá 2 dòng mới bị cắt và khi đó tên đầy đủ có ở màn Cài đặt). Phải: các `IconButton` (chuông có `CountBadge`, Đăng xuất). Vừa 360px không tràn. Slot nội dung do màn truyền; không chứa logic vai trò. |
| `NavBar` (điều hướng) | Điện thoại (< 900): thanh đáy cao 72 + safe-area, cuộn ngang khi nhiều mục, mỗi mục tối thiểu 72 rộng × 72 cao, icon 24 trên + nhãn 16px dưới (nowrap), mục mở = accent + vạch 4px; có `CountBadge` tuỳ chọn trên mục. ≥ 900: thanh bên dọc, mục cao 48, icon 24 cạnh nhãn. Số mục do màn truyền (đủ mục theo vai trò, không giới hạn 5). |
| `Strip` (dải cảnh báo) | Dải ngang dưới header, cao ≥ 48, icon 20 + chữ 16 + hành động chạm được. Kiểu `qr`: nền `--color-qr-tint`, chữ/viền `--color-qr`. Kiểu `danger`: nền `--color-danger-tint`, chữ/viền `--color-danger`. Có thể chứa hàng chip cuộn ngang. Không tự biến mất. |
| `Chip` + `ChipRow` | Chip cao 48, bo pill, icon 20 tuỳ chọn, chữ 16/600, nowrap; có số đếm bằng `CountBadge`. Chưa chọn: `--bg-surface` + viền `--border`; chọn: nền primary + chữ on-primary + `aria-pressed="true"`. `ChipRow`: cuộn ngang cố ý (`data-scroller`), `scroll-snap`, không thanh cuộn thô, chip cắt ngang mép để gợi cuộn. |
| `ViewSwitch` ("Xem: … ▾") | Một nút cao 48 hiện "Xem: {lựa chọn} ▾" (icon chevron 16) mở `Menu` chọn chế độ; biến thể `segmented` (≤ 3 lựa chọn, mỗi đoạn ≥ 48 rộng, `role="radiogroup"`). Lựa chọn hiện tại có dấu ✓ (icon) chứ không chỉ đổi màu. |
| `Dialog` / `Sheet` (hợp nhất, `Sheet` là alias — RESEARCH Open Q1) | < 640: bảng trượt từ đáy, bo trên `--r-lg`, tay nắm 4×40, `max-height: 90dvh`, nội dung cuộn, `footer` dính đáy; ≥ 640: hộp giữa rộng tối đa 560, `--shadow-lg`. Nền mờ `--bg-overlay`. **Một lối thoát** (✕ 48×48 ở góc, KHÔNG thêm "Quay lại"). Esc đóng; khoá cuộn nền (ref-count, `data-ui-scroll-lock` — không `style.overflow`); trả focus về nút đã mở; focus bẫy trong hộp. Tối đa 2 tầng chồng. `--z-dialog`. Nút xác nhận chính cao 64 khi là hành động chốt. |
| `Menu` (⋯ popover) | Nút mở = `IconButton` (⋯). Panel neo vào nút, bo `--r-md`, `--shadow-md`, mỗi mục cao 48 (icon 24 + chữ 18), rộng tối thiểu 220. Mục nguy hiểm: chữ + icon `--color-danger`, ngăn cách bằng đường kẻ, đặt CUỐI. Mở bằng chạm (không hover). Đóng khi bấm ngoài / Esc / chọn mục; trả focus. Điều hướng bàn phím mũi tên. Trên < 640 có thể hiện dạng Sheet (planner chọn) nhưng cùng API. |
| `Toast` | Nổi đáy giữa, trên `BottomBar`/`NavBar` (+ safe-area), `--bg-inverse`, chữ 18 `--text-inverse`, icon trạng thái 24 + chữ, bo `--r-md`, `--z-toast`, rộng tối đa 480 và `calc(100% - 32px)` ở điện thoại. Tự ẩn sau 4s (lỗi 8s, có nút ✕ 48); `role="status"` (lỗi: `role="alert"`); tối đa 3 xếp chồng. Xếp theo thứ tự, không che nút hành động chính. |
| `EmptyState` | Căn giữa: icon 48 (`--text-muted`) + tiêu đề 24/600 + mô tả 18 `--text-muted` + (tuỳ chọn) 1 nút. Props bắt buộc: `object` (tên đối tượng, vd "món") để dựng tiêu đề/mô tả; `action` tuỳ chọn. Mô tả đổi theo có/không nút (xem Copywriting) — không bao giờ để chỗ trống `{...}` hay nhắc "bấm nút" khi không có nút. |
| `Spinner` / `Skeleton` | Spinner vòng quay icon 24, kèm chữ "Đang tải…" (`role="status"`); Skeleton khối `--bg-muted`, bo `--r-md`, nhấp nhô nhẹ (tắt khi reduced-motion), giữ đúng chiều cao nội dung để không nhảy bố cục. |
| `ErrorState` | Như EmptyState nhưng icon + tiêu đề `--color-danger`; luôn có nút "Thử lại" (secondary, cao 52). Mô tả nêu vấn đề + việc cần làm. |
| `IconButton` | 48×48 (tối thiểu), bo `--r-md`, icon 24; `aria-label` BẮT BUỘC (kiểu TypeScript `string`, không optional); biến thể ghost / filled / danger. Không dựa tooltip. |
| `CountBadge` | Pill cao 24, rộng tối thiểu 24, chữ 16/600, nowrap; nền primary (hoặc danger/qr theo `tone`), chữ on-color; số > 99 hiện "99+" (số 3 chữ số không vỡ khung). Có `aria-label` đọc đủ ("12 chưa đọc"). |
| `Switch` | `role="switch"` + `aria-checked`, vùng bấm 48 cao × 72 rộng, rãnh 32×56; bật = primary, tắt = `--border-input`; luôn kèm nhãn chữ bên cạnh (bật/tắt không chỉ dựa màu — thêm chữ "Bật/Tắt" nếu màn cần). |
| `BottomBar` | Cố định đáy (`position: sticky/fixed`), `--bg-surface`, viền trên, `--shadow-md` ngược, đệm 16 + safe-area; chứa tối đa 2 nút (chính 64); dòng ngữ cảnh 16px `--text-muted` ghi đối tượng (vd tên bàn); chỉ hiện khi đã rõ đối tượng (§4.11). Cấp biến CSS `--bottom-bar-h` + lớp đệm cho nội dung phía trên. |
| `Icon` (wrapper lucide) | `size="md|sm|xs"` ↔ 24 / 20 / 16 qua class `.ui-icon--*`; `aria-hidden="true"`; KHÔNG truyền số `size={…}`. |

**SỬA so với code hiện tại:** `--icon-sm` từ 18px → **20px** (6 chỗ trong `components.css`).
**THÊM token:** `--sp-12: 48px` vào `packages/ui/src/tokens/primitives.css` (hiện mới đến `--sp-10`); `--sp-10` giữ lại cho nội bộ component.

Thẻ nghiệp vụ (thẻ bàn, dòng món, thẻ món bếp…) KHÔNG nằm trong phase này (D-02).

---

## Trang `/__ui` (NEN-06) — hợp đồng bố cục

- Chỉ DEV (`import.meta.env.DEV`); không có trong bản build (D-04).
- Bố cục: thanh thử màu thương hiệu dính trên cùng (ô nhập mã + 10 màu + thông báo tương phản), dưới là từng nhóm component, mỗi nhóm: tiêu đề 24/600 + mọi biến thể (mặc định, chọn, focus, bị chặn, lỗi, rỗng, dài-nhất).
- Điểm nhấn thị giác (focal point): thanh thử màu thương hiệu dính trên cùng là điểm nhìn đầu tiên (nền `--bg-surface`, viền dưới `--border`, nút "Áp dụng màu" là nút primary duy nhất nổi trên trang); trong mỗi nhóm, tiêu đề nhóm 24/600 là neo, biến thể "mặc định" đứng đầu và lớn nhất. Bố cục ghép (header + nav + nội dung + BottomBar): mỗi màn chỉ MỘT nút primary (64) ở `BottomBar` hoặc `Dialog` footer làm tiêu điểm; số tiền Display 32 là chữ lớn nhất. Khoảng cách giữa nhóm trên `/__ui`: 48.
- Mỗi biến thể cần có nhãn chữ nói tên biến thể; không chỉ dựa màu.
- Route con DEV `/__ui/overflow`: mọi component với chuỗi "xấu nhất" (D-13) cho Playwright đo tràn ở 360 / 390 / 1180 / 1440 (D-12, D-14). Phần tử cấm xuống dòng gắn `data-nowrap`; hàng cuộn ngang cố ý gắn `data-scroller`.

---

## Copywriting Contract

Tiếng Việt, câu ngắn, xưng thẳng việc cần làm, không từ kỹ thuật. Đây là bản mặc định cho trang `/__ui` và cho `EmptyState`/`ErrorState`/`Toast` chung; màn nghiệp vụ ghi đè ở phase của mình.

| Phần tử | Copy |
|---------|------|
| CTA chính (mẫu trên `/__ui`) | "Lưu thay đổi" (Button primary mặc định); các nút nghiệp vụ như "Gửi bếp", "Thanh toán" do phase 4–6 định nghĩa |
| Nút thử lại | "Thử lại" |
| Nút đóng hộp thoại | chỉ biểu tượng ✕ với `aria-label="Đóng"` (một lối thoát) |
| Empty state — tiêu đề | "Chưa có {đối tượng}" (mẫu; `/__ui`: "Chưa có món nào") |
| Empty state — nội dung, CÓ nút | "Bấm {Tên nút} để thêm {đối tượng} đầu tiên." (`/__ui`: "Bấm Thêm món để tạo món đầu tiên.") |
| Empty state — nội dung, KHÔNG nút | "{Đối tượng} sẽ hiện ở đây khi có." (`/__ui`: "Món sẽ hiện ở đây khi có.") — không nhắc nút |
| Loading | "Đang tải…" |
| Error state — tiêu đề | "Không tải được dữ liệu" |
| Error state — nội dung | "Có thể do mạng yếu. Kiểm tra mạng rồi bấm Thử lại." |
| Toast thành công | "Đã lưu." |
| Toast lỗi | "Chưa lưu được. Bấm lại hoặc kiểm tra mạng." |
| Nút bị chặn | "⚠ {lý do ngắn}" ngay trên nút, vd "⚠ Chọn bàn trước" (lý do luôn nêu việc cần làm) |
| Lỗi ô nhập | "{Tên ô} chưa đúng: {cách sửa}", vd "Số tiền chưa đúng: nhập số, không nhập chữ" |
| Màu thương hiệu bị chặn | "Màu này chữ trắng khó đọc (tương phản {x}:1, cần ít nhất 4.5:1). Chọn màu đậm hơn." |
| Xác nhận hành động nguy hiểm (mẫu) | "Xoá {đối tượng}?" / "{Đối tượng} sẽ mất và không khôi phục được." / nút "Xoá {đối tượng}" (danger; `/__ui`: "Xoá món") + lối thoát ✕ |

Hành động phá huỷ trong phase 1: không có hành động thật (không đổi nghiệp vụ). Component nguy hiểm duy nhất: mục nguy hiểm trong `Menu` và nút `danger` — luôn đi cùng hộp xác nhận (do màn dựng bằng `Dialog`, Enter = xác nhận, Esc = thoát; hộp xác nhận 5 kiểu là việc Phase 2).

---

## Registry Safety

| Registry | Block dùng | Safety Gate |
|----------|-----------|-------------|
| shadcn official | không dùng (Tool: none) | không áp dụng |
| Registry bên thứ ba | không có | không áp dụng |

Gói npm mới (devDependencies `jsdom@26.1.0`, `@testing-library/*`, `playwright`) chịu `checkpoint:human-verify` theo RESEARCH — không thuộc registry UI.

---

## Kiểm tra giao diện (tiêu chí chấp nhận của hợp đồng)

- Chữ ≥ 16px, nút ≥ 48px (chính 64) ở mọi biến thể; đo bằng Playwright, không bằng jsdom.
- 0 lỗi tràn / gãy chữ ở 360 và 390; 1180 / 1440 hiển thị đúng bố cục (thanh bên ≥ 900, hộp giữa ≥ 640).
- Không hex cứng / `style={{` mới trong `packages/ui` (ngoại lệ có comment lý do).
- Chủ repo duyệt ảnh chụp 4 khung khi đóng phase (D-14).

---

## UI Considerations

> Sinh từ ui-consideration-probe (75 mục + 6 mục bổ sung sau khi rà loại: overflow cho E1/E8, long-text cho E6/E7/E13). Chủ repo chốt "theo spec" ngày 2026-11-06. Chữ của trạng thái trống/lỗi nằm ở `## Copywriting Contract`, phần này không chép lại. `explicit` = tiêu chí đo được; `backstop` = `{ statement, verification: backstop }`, kiểm bằng mắt hoặc bằng script trên `/__ui` + `/__ui/overflow` lúc verify.

**Chung cho mọi component (áp cho các mục loading/error/long-text/overflow dưới đây nếu không ghi riêng):**
- long-text (explicit): chuỗi "xấu nhất" (D-13) trên `/__ui/overflow` ở 360/390/1180/1440 không gây cuộn ngang trang; phần tử `data-nowrap` không xuống dòng và không tràn khỏi khung; nội dung tự do xuống dòng, không cắt "…" (trừ tên quán clamp 2 dòng).
- overflow (explicit): script kiểm tràn báo 0 lỗi ở 360 và 390px; chỉ phần tử `data-scroller` được cuộn ngang.

| Element | Trạng thái | Kết luận |
|---|---|---|
| E1 Button | loading | backstop — khi đang gửi, nút ở trạng thái bị chặn (`aria-disabled`) kèm Spinner 16 + chữ, không đổi chiều cao 52/64 |
| E1 Button | error / blocked | explicit — bị chặn: viền đứt + ⚠ + lý do, bấm gọi `onBlockedClick`, không gọi `onClick` (có test) |
| E1 Button | overflow / long-text | explicit — nhãn dài nhất trên `/__ui/overflow` không tràn ở 360px (nowrap; màn tự rút gọn nhãn) |
| E2 Ô nhập | error | explicit — lỗi = viền `--color-danger` + icon + chữ đỏ dưới ô, liên kết `aria-describedby` |
| E2 Ô nhập | empty / partial | explicit — nhãn luôn TRÊN ô (không dùng placeholder thay nhãn); MoneyInput rỗng không hiện "0đ" |
| E2 Ô nhập | loading | backstop — ô bị khoá khi gửi form, giữ nguyên chiều cao |
| E2 Ô nhập | long-text / overflow | xem Chung; Textarea cao dần, không cuộn ngang |
| E3 Stepper | error (mốc min/max) | explicit — nút chạm mốc có `aria-disabled`, bấm không đổi giá trị |
| E3 Stepper | loading / long-text | backstop — giá trị 3 chữ số vẫn vừa ô giữa, không đẩy nút |
| E4 AppHeader | long-text | explicit — tên quán ≤ 2 dòng (clamp), header vẫn cao 64 ở 360px |
| E4 AppHeader | empty / loading | backstop — chưa có logo: chỉ hiện tên quán; chưa tải tên: Skeleton một dòng |
| E4 AppHeader | populated / overflow | explicit — CountBadge "99+" không đẩy nút Đăng xuất ra khỏi màn 360px |
| E5 NavBar | zero-one-many / overflow | explicit — < 900: nhiều mục thì cuộn ngang (`data-scroller`), mỗi mục ≥ 72; 1 mục vẫn đúng bố cục |
| E5 NavBar | populated / partial | explicit — mục đang mở = accent + vạch 4px + `aria-current="page"` |
| E5 NavBar | empty / loading / error | backstop — NavBar không tự tải dữ liệu; màn truyền mục, không có mục thì không hiện thanh |
| E6 Strip | populated / zero-one-many | explicit — Strip chỉ hiện khi có việc cần làm; hàng chip bên trong cuộn ngang |
| E6 Strip | long-text / overflow | xem Chung; chữ xuống dòng, hành động vẫn ≥ 48 |
| E6 Strip | empty / loading / error | backstop — không có dữ liệu thì không hiện Strip (không có Strip rỗng) |
| E7 Chip / ChipRow | zero-one-many / overflow | explicit — ChipRow cuộn ngang `data-scroller`, chip cắt ngang mép để gợi cuộn |
| E7 Chip / ChipRow | populated / partial | explicit — chip chọn: nền primary + `aria-pressed="true"`; số đếm dùng CountBadge |
| E7 Chip / ChipRow | empty / loading / error / long-text | backstop — 0 chip thì ẩn hàng; nhãn chip dài vẫn nowrap trong hàng cuộn |
| E8 Dialog / Sheet | overflow / long-text | explicit — nội dung dài cuộn bên trong, footer dính đáy, `max-height: 90dvh`, đỉnh không bị cắt trên iPhone |
| E8 Dialog / Sheet | loading / error | backstop — nút xác nhận vào trạng thái bị chặn khi gửi; lỗi hiện trong hộp (không đóng hộp) |
| E8 Dialog / Sheet | (chồng) | explicit — tối đa 2 tầng; Esc/✕ đóng tầng trên cùng; trả focus; khoá cuộn ref-count |
| E9 Menu ⋯ | populated / zero-one-many | explicit — mục nguy hiểm đặt cuối, có đường kẻ; mở bằng chạm, đóng khi bấm ngoài/Esc/chọn |
| E9 Menu ⋯ | overflow / long-text | explicit — panel không tràn mép màn 360px (tự lật/neo lại); chữ mục dài xuống dòng |
| E9 Menu ⋯ | empty / loading / error / partial | backstop — không có mục thì không hiện nút ⋯ |
| E10 Toast | error | explicit — lỗi `role="alert"`, ở lại 8s, có ✕ 48 |
| E10 Toast | loading / long-text | explicit — tối đa 3 toast, không che nút chính; chữ dài xuống dòng trong rộng tối đa 480 |
| E11 Empty/Loading/Error | empty | explicit — EmptyState đúng 2 biến thể (có/không nút), không còn `{...}` |
| E11 Empty/Loading/Error | loading | explicit — Skeleton giữ đúng chiều cao nội dung (không nhảy bố cục); Spinner có chữ "Đang tải…" |
| E11 Empty/Loading/Error | error | explicit — ErrorState luôn có nút "Thử lại" |
| E11 Empty/Loading/Error | populated / partial / zero-one-many / overflow / long-text | backstop — kiểm trên `/__ui/overflow` |
| E12 Thanh thử màu `/__ui` | error | explicit — mã hex sai hoặc chữ trắng < 4.5:1 thì chặn "Áp dụng màu" và hiện lý do |
| E12 Thanh thử màu `/__ui` | empty / partial / loading | backstop — ô rỗng giữ màu mặc định; preset áp ngay |
| E12 Thanh thử màu `/__ui` | overflow / long-text | xem Chung; 10 ô màu xuống hàng ở 360px |
| E13 `/__ui/overflow` | mọi trạng thái | explicit — trang có đủ mọi component với chuỗi xấu nhất + biến thể rỗng/1/nhiều; script đo tràn chạy được ở 4 bề rộng |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: FLAG (chấp nhận — token 12/20/28/36/40 khoá bởi DESIGN-SYSTEM §3, chỉ dùng nội bộ component)
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-11-06 (sau 1 vòng sửa)
