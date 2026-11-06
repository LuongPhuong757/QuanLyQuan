# Phase 1: Nền móng design system - Context

**Gathered:** 2026-11-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase này giao **nền móng** để các phase 2–7 dựng màn chỉ bằng `packages/ui`, và **bộ kiểm** ngăn nợ giao diện tăng
thêm (NEN-01..07, CHUNG-01..04). KHÔNG chuyển màn nghiệp vụ nào sang giao diện mới (đó là việc phase 2–7); không
đụng DB / API; không làm phần lưu thương hiệu trên server (phase 9).

Giao:
1. `packages/ui` có ĐỦ component chung xuất hiện trong bản vẽ `docs/design/dot-1.html`.
2. Font Be Vietnam Pro tự host dùng chung web + shop; icon `lucide-react` theo token cỡ.
3. Script kiểm chặn hex cứng / `style={{}}` mới, có sổ nợ theo file, chạy trong CI cho cả `apps/web` và `apps/shop`.
4. Cô lập rule CSS toàn cục của `apps/web/src/styles.css` khỏi component `.ui-*`.
5. Lệnh kiểm tràn chữ chạy tay (Playwright) ở 360 / 390 / 1180 / 1440 với dữ liệu "xấu nhất", chụp ảnh để duyệt.
6. Trang `/__ui` (chỉ dev) hiện mọi biến thể + thanh thử màu thương hiệu.
7. Quy ước + công cụ CHUNG-01..04 để mỗi phase màn dùng làm điều kiện xong.

</domain>

<decisions>
## Implementation Decisions

### Phạm vi component
- **D-01:** Phase 1 dựng **đủ mọi component chung** của bản vẽ dot-1 ngay bây giờ — các phase sau chỉ lắp ghép. Tối thiểu:
  header / thanh trên (`AppHeader`), thanh điều hướng (dưới cho điện thoại, thanh bên cho máy tính), dải cảnh báo
  (`Strip`: kiểu QR tím, kiểu đỏ), chip lọc có số đếm + hàng chip cuộn ngang, nút chọn chế độ "Xem: … ▾"
  (segmented / menu chọn), bảng trượt từ đáy (`Sheet`, ≥ 640px thành hộp giữa — có thể hợp nhất với `Dialog` hiện có),
  menu ⋯ (`Menu`/popover, có mục nguy hiểm), thông báo nổi (`Toast`), trạng thái trống / đang tải / lỗi (`EmptyState`,
  `Spinner`/skeleton, `ErrorState` có "Thử lại"), nút icon (`IconButton`, 48px, bắt buộc `aria-label`), badge số
  (`CountBadge`), công tắc (`Switch`), thanh đáy cố định (`BottomBar`) có đệm tương ứng cho nội dung phía trên.
  Giữ & hoàn thiện các component đã có: Button, Input / MoneyInput / Select / Textarea, Stepper, Card / CardButton,
  Badge (thêm tone `qr`), Dialog. — **Reversibility:** costly — API component dùng ở mọi màn phase 2–7, đổi sau phải sửa nhiều chỗ.
- **D-02:** **Thẻ nghiệp vụ** (thẻ bàn, dòng món, thẻ món bếp, thẻ món trong Gọi món) KHÔNG vào `packages/ui`. Chúng
  nằm trong `apps/web` cạnh màn của mình, lắp từ component chung, và làm trong phase của màn đó. `packages/ui` không biết gì về quán ăn.
- **D-03:** Test **hành vi chính** bằng Vitest + Testing Library (nút bị chặn không chạy onClick mà gọi onBlockedClick;
  Dialog/Sheet: Esc, khoá cuộn, trả focus; Stepper giới hạn min/max; nhãn gắn với ô nhập; Menu đóng khi bấm ngoài;
  Toast tự ẩn…). Không test ảnh chụp giao diện (visual regression).
- **D-04:** `/__ui` **chỉ cho dev** (giữ cách hiện tại: `import.meta.env.DEV`, không có trong bản build thật).

### Bộ kiểm chặn nợ giao diện
- **D-05:** Vi phạm MỚI làm **CI đỏ, chặn hẳn**: mã màu hex/rgb cứng ngoài file token, và `style={{…}}` cho màu / chữ /
  khoảng cách / bo góc / bóng. Ngoại lệ hợp lệ phải có comment lý do ngay tại dòng đó (vd giá trị động: chiều rộng
  thanh tiến độ theo %, thời lượng animation theo prop) — đúng DESIGN-SYSTEM §4 luật 1–2.
- **D-06:** Nợ cũ ghi vào **sổ nợ theo file** (một file JSON trong repo, số vi phạm từng file). File nào **tăng** → đỏ;
  **giảm** → sổ được cập nhật (có lệnh cập nhật sổ). Sổ cũng là số đo tiến độ gỡ CSS theo màn (NEN-05).
- **D-07:** Áp cho **cả `apps/web` và `apps/shop`** ngay Phase 1 (shop ghi sổ nợ cũ luôn).
- **D-08:** Viết bằng **script Node nhỏ riêng** trong `scripts/` (giống `scripts/check-bundle-budget.mjs`), chạy trong
  `.github/workflows/ci.yml`. KHÔNG cài ESLint/Stylelint toàn repo ở phase này.

### Gỡ CSS cũ
- **D-09:** Khi một phase chuyển một màn: **gỡ sạch trong cùng phase** — màn đó về 0 `style={{}}` (trừ giá trị động có
  comment) và xoá class cũ không còn ai dùng; sổ nợ của các file màn đó về 0 là **điều kiện xong phase** (CHUNG-03).
- **D-10:** Phase 1 **cô lập các rule toàn cục** của `apps/web/src/styles.css` (đang có `*`, `html/body`, `button, input,
  select, textarea`, `button:hover`, `button:disabled`, `input:focus`, `select`, `h1`, `h2`…) để chúng không đè lên
  component `.ui-*` (vd giới hạn rule cũ bằng `:where(:not(.ui-*))` / lớp CSS `@layer` cũ thấp hơn lớp ui — planner chọn
  cách). Phần còn lại của styles.css gỡ dần theo màn. Không được làm vỡ giao diện màn cũ.
- **D-11:** Giai đoạn "lai" (khung mới, màn cũ): **không chỉnh màn cũ** cho đỡ lệch; chấp nhận vì chưa có khách thật.

### Kiểm tràn chữ tự động
- **D-12:** Phase 1 làm **lệnh chạy tay trên máy** dùng **Playwright**: mở màn, đo phần tử cấm xuống dòng bị tràn / thò
  ra ngoài khung (cùng logic với nút "Tự kiểm tràn chữ" trong `docs/design/dot-1.html`), xuất danh sách lỗi + ảnh chụp.
  Chạy trước khi đóng mỗi phase màn. **Đưa vào CI sau, khi có DB riêng + seed (Phase 8)** — ghi deferred.
- **D-13:** Dữ liệu kiểm là bộ **"xấu nhất"** cố ý: tên món / tên bàn dài, số tiền 9.999.000đ, 99 phần, nhiều ghi chú
  dài, số đếm 3 chữ số (999+), tên nhân viên dài. Phải đưa được bộ dữ liệu này vào màn (mock API trong Playwright
  hoặc trang fixture) mà KHÔNG ghi vào DB dùng chung với Bà Lùn.
- **D-14:** Kiểm 4 kích thước: **360, 390, 1180 (iPad ngang), 1440 (máy tính)**; chụp ảnh cả 4 để chủ repo duyệt khi đóng phase.

### Claude's Discretion
- Font: chuyển bộ woff2 Be Vietnam Pro đang tự host ở `apps/shop/public/fonts/` thành tài sản chung trong `packages/ui`
  (thêm cỡ 500 vì token `--fw-medium` dùng), web + shop cùng nạp; giữ cách khai `@font-face` gộp dải độ đậm của shop.
  Baloo 2 (font tiêu đề của shop) giữ nguyên ở shop.
- Tên class component theo tiền tố `.ui-*`, biến thể `.ui-x--y` (như code đã có).
- Cách tổ chức thư mục / export trong `packages/ui`, API chi tiết từng component, cách viết script kiểm và định dạng sổ nợ.
- Có hợp nhất `Sheet` với `Dialog` hay tách riêng.
- `lucide-react@0.460.0` đã cài ở `packages/ui` + `apps/web`; quyết cách đặt cỡ icon qua token (`--icon-xs/sm/md`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system & luật
- `docs/DESIGN-SYSTEM.md` §3 (giá trị token), §4 (luật 1–15: không hex/px cứng, không style inline, không tự dựng nút, không xuống dòng, màu theo nghĩa, icon…), §5 (đổi màu theo quán), §8 (bố cục), §6 (lộ trình) — nguồn sự thật
- `docs/SAN-PHAM-KIEN-TRUC.md` — kiến trúc sản phẩm cho thuê

### Bản vẽ & tính năng
- `docs/design/dot-1.html` — bản vẽ đợt 1: danh sách component cần có (mọi khung), thanh đổi màu, logic "Tự kiểm tràn chữ" (hàm check + selector NOWRAP) để Playwright bắt chước
- `docs/design/FEATURE-INVENTORY.md` + `docs/design/inventory/01-ban-order-thanh-toan.md` + `docs/design/inventory/02-bep-don-online.md` — quy ước bảng đối chiếu tính năng (CHUNG-01)

### Code hiện có
- `packages/ui/src/` — token (`tokens/primitives.css`, `brand.css`, `semantic.css`), component, `brand.ts` (+ test)
- `apps/web/src/styles.css` — rule toàn cục cần cô lập (D-10)
- `apps/shop/src/styles/fonts.css`, `apps/shop/public/fonts/*.woff2`, `apps/shop/src/styles/tokens.css` — font tự host + token cũ của shop
- `scripts/check-bundle-budget.mjs` — mẫu script kiểm chạy trong CI (D-08)
- `.github/workflows/ci.yml` — nơi thêm bước kiểm (cài → build → schema → typecheck → test → bundle budget)
- `apps/web/src/pages/UiShowcasePage.tsx` + `ui-showcase.css`, `apps/web/src/App.tsx` (route `/__ui` chỉ DEV) — trang mẫu
- `CLAUDE.md` §5 (bẫy CSS: `dvh`, `.ncc-ui` flex, `button.secondary`), §6 (test), §3 (không chạy prettier)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/ui`: Button (không `disabled`, `blockedReason`), Input / MoneyInput / Select / Textarea (nhãn trên ô, lỗi có icon), Stepper, Card / CardButton, Badge, Dialog (dvh, một lối thoát), `applyBrand()` / `deriveBrand()` (10 test), token 3 tầng + `--color-qr`, `--icon-*`.
- `apps/shop/public/fonts/bevietnampro-{400,600}-{latin,latin-ext,vietnamese}.woff2` + `fonts.css` — đã tự host, dùng lại.
- `lucide-react@0.460.0` đã cài ở `packages/ui` + `apps/web`.
- `scripts/check-bundle-budget.mjs` — khuôn script CI.

### Established Patterns
- `packages/ui` xuất **mã nguồn** (không build) — tránh bẫy Turbo cache; `apps/web` import `@order/ui` + `@order/ui/styles.css` ở `main.tsx` trước `styles.css` cũ.
- Vitest có sẵn ở mọi app; `packages/ui` có `pnpm --filter @order/ui test`.
- Repo không có `.prettierrc` — KHÔNG chạy prettier; bám style file đang sửa. Comment tiếng Việt giải thích "vì sao".

### Integration Points
- `apps/web/src/main.tsx` (nạp CSS), `apps/shop/src/main.tsx` (nạp fonts.css trước token), `.github/workflows/ci.yml` (thêm bước kiểm), `package.json` gốc (thêm script lệnh kiểm), `apps/web/src/App.tsx` (route `/__ui`).
- `apps/web/src/styles.css` dòng ~1–210 chứa rule toàn cục cần cô lập.

</code_context>

<specifics>
## Specific Ideas

- Logic kiểm tràn chữ đã có sẵn trong `docs/design/dot-1.html` (hàm check: phần tử thuộc danh sách cấm xuống dòng có `scrollWidth > clientWidth` hoặc thò ra ngoài khung thiết bị; bỏ qua hàng cố ý cuộn ngang như chip / tab / dải) — dùng làm chuẩn cho lệnh Playwright.
- Bộ dữ liệu "xấu nhất" ví dụ: "Bún bò Huế đặc biệt thêm chả cua giò heo", "Mang về 12", 9.999.000đ, 99×, ghi chú 2–3 dòng, badge 999+.

</specifics>

<deferred>
## Deferred Ideas

- Đưa lệnh kiểm tràn chữ (Playwright) vào CI — sau Phase 8 (DB riêng + seed).
- Cài ESLint / Stylelint toàn repo — không làm ở milestone này.
- Gỡ phần còn lại của `styles.css` cũ — theo từng phase màn (2–7) và các milestone sau.
- Font Baloo 2 / token cũ của `apps/shop` gộp vào `packages/ui` — milestone trang khách (DOT2-05).

</deferred>

---

*Phase: 01-Nền móng design system*
*Context gathered: 2026-11-06*
