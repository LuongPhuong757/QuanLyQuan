# Phase 1: Nền móng design system - Research

**Researched:** 2026-11-06
**Domain:** Design system trong monorepo pnpm/Turbo (React 19 + Vite 6, CSS thuần), script kiểm CI bằng Node, kiểm tràn chữ bằng Playwright
**Confidence:** MEDIUM-HIGH (mã nguồn + registry đã kiểm; `@layer` qua Vite và phiên bản Playwright/Chromium chưa chạy thử — xem Open Questions)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Phase 1 dựng **đủ mọi component chung** của bản vẽ dot-1 ngay bây giờ. Tối thiểu: `AppHeader`; thanh điều hướng (dưới cho điện thoại, thanh bên cho máy tính); `Strip` (kiểu QR tím, kiểu đỏ); chip lọc có số đếm + hàng chip cuộn ngang; nút chọn chế độ "Xem: … ▾" (segmented / menu chọn); `Sheet` (≥ 640px thành hộp giữa — có thể hợp nhất với `Dialog`); `Menu`/popover ⋯ (có mục nguy hiểm); `Toast`; `EmptyState`, `Spinner`/skeleton, `ErrorState` có "Thử lại"; `IconButton` (48px, bắt buộc `aria-label`); `CountBadge`; `Switch`; `BottomBar` có đệm cho nội dung phía trên. Giữ & hoàn thiện: Button, Input / MoneyInput / Select / Textarea, Stepper, Card / CardButton, Badge (thêm tone `qr`), Dialog. Reversibility: costly.
- **D-02:** Thẻ nghiệp vụ (thẻ bàn, dòng món, thẻ món bếp, thẻ món trong Gọi món) KHÔNG vào `packages/ui`; nằm trong `apps/web` cạnh màn, làm ở phase của màn đó. `packages/ui` không biết gì về quán ăn.
- **D-03:** Test hành vi chính bằng Vitest + Testing Library (nút bị chặn không chạy onClick mà gọi onBlockedClick; Dialog/Sheet: Esc, khoá cuộn, trả focus; Stepper min/max; nhãn gắn với ô nhập; Menu đóng khi bấm ngoài; Toast tự ẩn…). Không test ảnh chụp giao diện.
- **D-04:** `/__ui` chỉ cho dev (`import.meta.env.DEV`, không có trong bản build thật).
- **D-05:** Vi phạm MỚI làm **CI đỏ**: mã màu hex/rgb cứng ngoài file token, và `style={{…}}` cho màu / chữ / khoảng cách / bo góc / bóng. Ngoại lệ hợp lệ phải có comment lý do ngay tại dòng đó.
- **D-06:** Nợ cũ ghi vào **sổ nợ theo file** (một file JSON trong repo, số vi phạm từng file). File nào tăng → đỏ; giảm → sổ cập nhật (có lệnh cập nhật sổ). Sổ cũng là số đo tiến độ gỡ CSS theo màn (NEN-05).
- **D-07:** Áp cho cả `apps/web` và `apps/shop` ngay Phase 1.
- **D-08:** Viết bằng **script Node nhỏ riêng** trong `scripts/` (như `scripts/check-bundle-budget.mjs`), chạy trong `.github/workflows/ci.yml`. KHÔNG cài ESLint/Stylelint toàn repo.
- **D-09:** Khi một phase chuyển một màn: gỡ sạch trong cùng phase; sổ nợ các file màn đó về 0 là điều kiện xong phase (CHUNG-03).
- **D-10:** Phase 1 cô lập các rule toàn cục của `apps/web/src/styles.css` (dòng ~1–210) để không đè `.ui-*` (planner chọn cách: `:where(:not(.ui-*))` / `@layer`…). Không được làm vỡ màn cũ.
- **D-11:** Giai đoạn lai: không chỉnh màn cũ cho đỡ lệch.
- **D-12:** Lệnh kiểm tràn chữ **chạy tay** dùng **Playwright**: đo phần tử cấm xuống dòng tràn / thò ra khỏi khung (cùng logic nút "Tự kiểm tràn chữ" trong `dot-1.html`), xuất danh sách lỗi + ảnh chụp. Đưa vào CI sau Phase 8 (ghi deferred).
- **D-13:** Dữ liệu kiểm là bộ "xấu nhất" (tên dài, 9.999.000đ, 99 phần, nhiều ghi chú dài, số đếm 999+, tên nhân viên dài), đưa vào màn bằng mock API trong Playwright hoặc trang fixture — KHÔNG ghi vào DB.
- **D-14:** Kiểm 4 kích thước: **360, 390, 1180, 1440**; chụp ảnh cả 4.

### Claude's Discretion
- Font: chuyển bộ woff2 Be Vietnam Pro ở `apps/shop/public/fonts/` thành tài sản chung trong `packages/ui` (thêm cỡ 500), web + shop cùng nạp; giữ cách khai `@font-face` gộp dải độ đậm. Baloo 2 giữ ở shop.
- Tên class `.ui-*`, biến thể `.ui-x--y`.
- Cách tổ chức thư mục/export `packages/ui`, API chi tiết từng component, cách viết script kiểm, định dạng sổ nợ.
- Hợp nhất `Sheet` với `Dialog` hay tách riêng.
- `lucide-react@0.460.0`: cách đặt cỡ icon qua token (`--icon-xs/sm/md`).

### Deferred Ideas (OUT OF SCOPE)
- Lệnh kiểm tràn chữ vào CI — sau Phase 8.
- ESLint / Stylelint toàn repo.
- Gỡ phần còn lại của `styles.css` cũ — theo từng phase màn.
- Gộp Baloo 2 / token cũ của `apps/shop` vào `packages/ui` — DOT2-05.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Mô tả | Research hỗ trợ |
|----|-------|-----------------|
| NEN-01 | Dựng mọi màn chỉ bằng `packages/ui`, đủ component còn thiếu | Danh sách component + gợi ý hợp nhất Sheet/Dialog; tách primitive `useOverlay`; test jsdom |
| NEN-02 | Be Vietnam Pro tự host, không gọi Google Fonts | Font ở `packages/ui/src/fonts/`, thêm 500, export `./fonts.css`, kiểm grep + dist |
| NEN-03 | Icon lucide theo token 24/20/16 | Sửa `--icon-sm` 18→20; wrapper `Icon`; kiểm bằng script |
| NEN-04 | CI chặn hex + `style={{` mới, nợ cũ chỉ giảm | `scripts/check-ui-debt.mjs` + sổ nợ JSON ratchet; test bằng `node --test` |
| NEN-05 | Quy ước + số đo gỡ CSS cũ theo màn | `--report` theo bản đồ màn `scripts/ui-screens.json` |
| NEN-06 | `/__ui` đủ biến thể + thanh đổi màu | Mở rộng `UiShowcasePage`; thanh thử dùng `deriveBrand`/`applyBrand` sẵn có |
| NEN-07 | Kiểm tràn/gãy chữ ở 360/390 | `scripts/check-overflow.mjs` (Playwright) bắt chước `runCheck()` của dot-1 |
| CHUNG-01 | Bảng đối chiếu tính năng | Khuôn `docs/design/PARITY-TEMPLATE.md` + quy ước, lấy từ `inventory/*` |
| CHUNG-02 | 0 lỗi tràn ở 360/390, đúng ở 1180/1440 | Như NEN-07 + 4 viewport |
| CHUNG-03 | Màn đã chuyển hết `style={{` | Sổ nợ theo file = cổng "xong phase" |
| CHUNG-04 | typecheck + test xanh | Giữ trong CI; thêm test script vào `pnpm test` |
</phase_requirements>

## Summary

Phase 1 gồm 5 mảng độc lập, ghép lại thành 4 cụm việc chính: (1) thêm ~14 component vào `packages/ui` và mở rộng `/__ui`; (2) font + icon token dùng chung; (3) bộ kiểm nợ CSS ratchet chạy trong CI; (4) cô lập CSS toàn cục cũ; (5) lệnh Playwright kiểm tràn + quy ước đối chiếu tính năng. Không đụng DB/API. `packages/ui` hiện có Button, Field(Input/MoneyInput/Select/Textarea), Stepper, Card, Badge, Dialog, brand.ts — đều viết kiểu "xuất mã nguồn, không build", CSS thuần `.ui-*` (202 dòng `components.css`).

Số liệu nợ đo hôm nay (grep thô, chưa lọc false positive): `apps/web` có **2.103 chỗ `style={{`** trong 75 file `.tsx`, ~1.707 mã hex, 95 `rgb(`; `apps/shop` có **86 `style={{`** ở 29 file, ~270 hex, 89 `rgb(`. Vì vậy cổng phải là ratchet theo file (D-06), không phải "cấm tuyệt đối".

Phát hiện quan trọng planner phải xử lý (không có trong CONTEXT):
1. `--icon-sm` đang là **18px** nhưng luật NEN-03/DESIGN-SYSTEM §4.13 là **24/20/16** → phải sửa token (6 chỗ dùng trong `components.css`).
2. `apps/web` **chưa nạp font nào** (`styles.css` dùng `system-ui`); `.ui-*` khai `--font-sans: 'Be Vietnam Pro'` nhưng không có `@font-face` ở web → hiện đang rơi về font hệ thống.
3. Token shop (`apps/shop/src/styles/tokens.css`) **trùng 28 tên biến** với `packages/ui` (`--fs-*`, `--sp-*`, `--bg-page`, `--tap-min`…) nhưng khác giá trị → shop **chỉ được nạp `fonts.css` của ui, KHÔNG nạp `styles.css`/tokens** ở phase này.
4. `Dockerfile` không `COPY packages/ui/package.json` (lockfile đã có `packages/ui`) → `pnpm install --frozen-lockfile` trong Docker sẽ vỡ; shop thêm dependency `@order/ui` càng cần. Chưa deploy nên chưa gấp, nhưng phải ghi vào CLAUDE.md/§ trước push đầu.
5. Rule `@layer`: CSS **không đặt trong layer luôn thắng CSS trong layer** — nếu chỉ bọc `.ui-*` vào layer thì legacy thắng hết. Phải bọc **legacy** vào layer thấp hơn (xem Pattern 3).

**Primary recommendation:** Làm theo thứ tự: token/font/icon (nền) → primitive overlay + component → `/__ui` → script nợ + CI → cô lập CSS legacy bằng `@layer legacy, ui` → Playwright overflow + khuôn đối chiếu. Mọi script dùng `node:` thuần (không thêm dependency), test bằng `node --test`.

## Project Constraints (from CLAUDE.md)

- UI/comment/commit tiếng Việt; comment giải thích **vì sao**; không strip comment nghiệp vụ.
- **KHÔNG chạy `pnpm format`/prettier**; bám style file đang sửa; single quote + semicolon.
- Chữ ≥ 16px, nút ≥ 48px (nút chính 64), không hover/tooltip là đường duy nhất, hộp thoại chồng ≤ 2 tầng.
- Không Tailwind/MUI; CSS variables + CSS thường; icon `lucide-react`; bundle có gác ngân sách trong CI.
- `apps/web` import đuôi `.ts/.tsx`; `packages/*` build kiểu NodeNext dùng `.js` — nhưng `packages/ui` hiện import **không đuôi** (`'./components/Button'`) và xuất mã nguồn; giữ nguyên kiểu đó.
- Vite proxy web là danh sách cứng — không liên quan phase này (không thêm route API); route `/__ui` là route client, đã DEV-only.
- Commit được, **push chỉ khi chủ repo bảo**; nhánh `ui/dot-1`. Thiết kế duyệt trước khi code từng màn (phase 1 không đổi màn).
- `pnpm typecheck` bắt buộc trước commit; Turbo cache dùng chung worktree — `packages/ui` không build nên tránh được bẫy dist.
- Bẫy CSS: `dvh` không `vh`; overlay mang `.ncc-ui` phải `flex-direction: row`; rule đụng màu nút secondary viết `button.<class>`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Component chung + token + font | Browser/Client (`packages/ui`, mã nguồn) | CDN/Static (woff2 do Vite băm tên) | UI thuần, không biết nghiệp vụ (D-02) |
| Thẻ nghiệp vụ (bàn, món…) | Browser (`apps/web`) | — | Ngoài phạm vi phase 1 (D-02) |
| Kiểm nợ CSS (hex/style) | CI / script Node (`scripts/`) | — | Đọc file nguồn tĩnh, không cần build |
| Kiểm tràn chữ | Máy dev (Playwright) | Dev server Vite | Cần trình duyệt thật + dữ liệu giả (D-12/13) |
| `/__ui` + thanh thử màu | Browser (dev-only route) | — | `deriveBrand`/`applyBrand` chạy client |
| Cô lập CSS legacy | Browser (CSS cascade `@layer`) | Vite (bundler CSS) | Là quy tắc cascade, không phải logic JS |
| Lưu thương hiệu | — (phase 9) | API/DB | Không làm ở phase 1 |

## Standard Stack

### Core (đã có, giữ nguyên)
| Library | Version | Purpose | Ghi chú |
|---------|---------|---------|---------|
| React | ^19.0.0 | Component | [VERIFIED: packages/ui/package.json] |
| lucide-react | 0.460.0 (ghim cứng) | Icon | [VERIFIED: package.json web + ui]; hỗ trợ prop `size`/`strokeWidth`, nhưng nên đặt cỡ bằng CSS token |
| Vite | ^6.0.0 | Bundler | [VERIFIED: apps/web/package.json] |
| Vitest | ^2.1.0 (lock 2.1.9) | Test | [VERIFIED: pnpm store] |

### Thêm mới (devDependencies của `packages/ui`)
| Library | Version | Purpose | Vì sao |
|---------|---------|---------|--------|
| jsdom | **26.1.0** | Môi trường DOM cho Vitest | jsdom 31 đòi Node ≥ 22.22; máy dev đang Node 20.11 (`engines` repo `>=20.9`) → ghim 26.1.0 (engines `>=18`) [VERIFIED: npm view] |
| @testing-library/react | 16.3.3 | render/queries | peer: react 19 OK, **cần cài kèm `@testing-library/dom@^10`** [VERIFIED: npm view] |
| @testing-library/dom | ^10 | peer của RTL | bắt buộc tường minh với pnpm [VERIFIED: peerDependencies] |
| @testing-library/user-event | 14.6.8 | click/keyboard thật | Esc, Tab, click ngoài [VERIFIED: npm view] |

### Ở root (cho lệnh chạy tay)
| Library | Version | Purpose |
|---------|---------|---------|
| playwright | ^1.65 (hoặc ghim bản khớp Chromium đã cache) | kiểm tràn chữ + chụp ảnh. engines `>=20` [VERIFIED: npm view] |

### Không dùng
| Thay vì | Không dùng | Lý do |
|---------|-----------|-------|
| `@testing-library/jest-dom` | — | 6.10/7.x đòi Node ≥ 22 → vỡ local 20.11. Dùng assertion thuần (`el.getAttribute`, `document.activeElement`, `toBeNull`) hoặc `expect(el.hasAttribute('aria-disabled'))` |
| ESLint/Stylelint | — | Đã loại (D-08) |
| `@fontsource/be-vietnam-pro` làm dependency runtime | — | Chỉ dùng như **nguồn lấy file 500** một lần (OFL-1.1), commit woff2 vào repo; không thêm dependency |

**Installation:**
```bash
pnpm --filter @order/ui add -D jsdom@26.1.0 @testing-library/react@16.3.3 @testing-library/dom@^10 @testing-library/user-event@14.6.8
pnpm add -D -w playwright@^1.65   # root; rồi: pnpm exec playwright install chromium (nếu thiếu)
```
**Version verification:** `npm view` ngày 2026-11-06: jsdom 31.0.0 (mới nhất, bị loại vì Node), 26.1.0 OK; RTL 16.3.3; user-event 14.6.8; playwright 1.65.0.

## Package Legitimacy Audit

slopcheck **không chạy được** (lệnh `pip install` bị bộ phân quyền chặn trong phiên này) → mọi gói dưới đây gắn `[ASSUMED]` về mặt legitimacy; planner phải đặt `checkpoint:human-verify` trước khi `pnpm add`. Đây đều là gói nổi tiếng (Testing Library, jsdom, Playwright — Microsoft) và `npm view` xác nhận tồn tại + license; rủi ro thực tế thấp nhưng chưa qua cổng chính thức.

| Package | Registry | Source | slopcheck | Disposition |
|---------|----------|--------|-----------|-------------|
| jsdom@26.1.0 | npm | MIT, github.com/jsdom/jsdom | không chạy | [ASSUMED] — human-verify |
| @testing-library/react@16.3.3 | npm | MIT | không chạy | [ASSUMED] — human-verify |
| @testing-library/dom@10 | npm | MIT | không chạy | [ASSUMED] — human-verify |
| @testing-library/user-event@14.6.8 | npm | MIT | không chạy | [ASSUMED] — human-verify |
| playwright@1.65.0 | npm | Apache-2.0, Microsoft | không chạy | [ASSUMED] — human-verify. `scripts.postinstall` rỗng (đã kiểm); trình duyệt tải bằng lệnh `playwright install` riêng |
| be-vietnam-pro woff2 (500) | jsDelivr/npm `@fontsource/be-vietnam-pro@5.3.0` OFL-1.1 | file có tại `files/be-vietnam-pro-{latin,latin-ext,vietnamese}-500-normal.woff2` | n/a (không cài) | Tải file một lần, commit; ghi nguồn vào comment `fonts.css` |

**Packages removed (SLOP):** none. **Flagged (SUS):** none (chưa chạy công cụ).

## Architecture Patterns

### System Architecture Diagram

```
 docs/design/dot-1.html (bản vẽ)         docs/DESIGN-SYSTEM.md (luật)
          │ danh sách component                │ luật 1–15
          ▼                                    ▼
 packages/ui/src ──────────────┬───────────────┴───────────┐
  tokens/ (primitive→brand→semantic)                        │
  fonts/*.woff2 + fonts.css ──► apps/web (cùng styles.css)  │
        │                   └─► apps/shop (CHỈ fonts.css)   │
  components/*.tsx + components.css (.ui-*)                 │
        │                                                    │
        ├──► apps/web/src/pages/UiShowcasePage (/__ui, DEV) ◄┘ thanh thử màu → deriveBrand/applyBrand
        │         ▲
        │         └── Playwright: scripts/check-overflow.mjs ─► mock route (worst-case) ─► ảnh 360/390/1180/1440 + danh sách lỗi
        ▼
 apps/web/main.tsx:  @layer legacy, ui;  → ui styles.css (layer ui) → styles.css cũ (layer legacy)

 Cổng CI:  checkout → install → [scripts/check-ui-debt.mjs  ⇄  scripts/ui-debt-baseline.json]
           → build → schema → typecheck → test (gồm vitest jsdom của packages/ui + node --test scripts) → bundle budget
```

### Recommended Project Structure
```
packages/ui/
├─ src/
│  ├─ fonts/            bevietnampro-{400,500,600}-{latin,latin-ext,vietnamese}.woff2
│  ├─ fonts.css         @font-face (url('./fonts/…')) — export "./fonts.css"
│  ├─ tokens/           (đã có)
│  ├─ components/       1 file .tsx / component; CSS gom theo khối trong components.css
│  ├─ hooks/            useOverlay (khoá cuộn, Esc, trả focus, click ngoài) — dùng chung Dialog/Sheet/Menu
│  ├─ icons.tsx         <Icon as={…} size="md|sm|xs"> bọc lucide, aria-hidden, class .ui-icon--*
│  └─ index.ts
├─ vitest.config.ts     environment: 'jsdom'
└─ src/components/*.test.tsx
scripts/
├─ check-ui-debt.mjs    + lib/ui-debt.mjs (hàm thuần) + ui-debt.test.mjs (node --test)
├─ ui-debt-baseline.json
├─ ui-screens.json      màn → danh sách file (cho --report, NEN-05)
├─ check-overflow.mjs   Playwright, chạy tay
└─ overflow.config.json danh sách màn/URL, selector NOWRAP/SCROLLER, bộ dữ liệu xấu nhất
docs/design/PARITY-TEMPLATE.md   khuôn bảng đối chiếu tính năng (CHUNG-01)
```

### Pattern 1: Một primitive overlay cho Dialog / Sheet / Menu
**What:** Dialog hiện đã tự viết khoá cuộn + Esc + trả focus trong `useEffect`. `Sheet` (≥640px thành hộp giữa) **chính là Dialog hiện tại** (đã có "điện thoại: bảng trượt từ đáy, ≥ 640px: hộp giữa"). **Khuyến nghị: hợp nhất — `Sheet` là alias/biến thể `Dialog` (cùng component), không dựng thứ hai.** `Menu` (popover) là kiểu khác (neo vào nút, không khoá cuộn) nhưng dùng chung hook đóng-khi-bấm-ngoài/Esc/trả focus.
**Khi dùng:** mọi overlay. **Vì sao:** 3 chỗ lặp logic = 3 chỗ lệch hành vi (iPhone vh, focus).
**Lưu ý đã biết trong code:** Dialog hiện KHÔNG có focus trap (Tab thoát ra sau lưng hộp) và nhiều hộp chồng đều ghi đè `body.style.overflow` — khi chồng 2 tầng, tầng trong đóng sẽ trả `overflow` về giá trị đã chụp lúc mở (đúng) nhưng tầng ngoài đóng trước tầng trong sẽ sai. Dùng bộ đếm khoá cuộn ở module (ref-count) trong `useOverlay`. (Luật ≤ 2 tầng làm điều này thật sự xảy ra.)
```ts
// Source: mã nguồn hiện có packages/ui/src/components/Dialog.tsx (mở rộng, không phải API ngoài)
let lockCount = 0;
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (lockCount++ === 0) document.body.dataset.uiScrollLock = '1'; // CSS: body[data-ui-scroll-lock]{overflow:hidden}
    return () => { if (--lockCount === 0) delete document.body.dataset.uiScrollLock; };
  }, [active]);
}
```
(Dùng thuộc tính `data-` + CSS thay vì ghi `style.overflow` trực tiếp — vừa tránh vi phạm luật 2, vừa tránh đè nhau.)

### Pattern 2: Cỡ icon bằng token + wrapper
`.ui-btn svg{width:var(--icon-md)}` đã có. Thêm `<Icon>` để màn không truyền `size={…}` số (chặn bằng kiểm: không `size={`số`}` trên icon lucide trong `apps/*` — tuỳ chọn). Token chốt: `--icon-md: 24px`, `--icon-sm: 20px` (SỬA từ 18), `--icon-xs: 16px`. Mọi icon `aria-hidden="true"`; `IconButton` bắt buộc `aria-label` (kiểu TypeScript: `'aria-label': string` không optional).

### Pattern 3: Cô lập CSS legacy bằng `@layer` — bọc LEGACY, không bọc ui
Quy tắc cascade [CITED: MDN — Cascade layers]: với khai báo thường, **style không thuộc layer thắng mọi layer**; trong các layer, layer khai báo **sau** thắng layer trước. Do đó:
```css
/* apps/web/src/layers.css — nạp ĐẦU TIÊN trong main.tsx */
@layer legacy, ui;
```
- `packages/ui/src/styles.css`: bọc nội dung bằng `@layer ui { … }` (tokens để ngoài layer cũng được — biến `:root` không xung đột).
- `apps/web/src/styles.css` cũ **và mọi CSS legacy** (`suppliers-ui.css`, `nhan-su.css`, `so-tien.css`, css kèm trang): phải vào `@layer legacy`. Cách ít đụng file nhất: `apps/web/src/legacy.css` chứa `@import './styles.css' layer(legacy);` v.v. và `main.tsx` import `legacy.css`.
- **KHÔNG được chỉ bọc các rule element (`button`, `input`…) vào layer** rồi để `.btn-x` legacy ngoài layer: thứ tự thắng giữa legacy với nhau sẽ đổi (rule `button.secondary` trong layer thua `.x` không layer dù specificity cao hơn) → vỡ màn cũ (vi phạm D-10 "không làm vỡ màn cũ").
- Phương án dự phòng nếu `layer()` trong `@import` không chạy qua Vite: dùng `:where()` hạ specificity về 0 cho riêng khối rule element toàn cục (dòng 1–210) — ví dụ `:where(button:not([class*='ui-']))`. Chỉ dùng cho khối đó; không đụng phần còn lại.
- Rủi ro còn lại cần kiểm bằng mắt/ảnh: CSS bên thứ ba **không layer** (leaflet css) giờ thắng legacy — trước đây tranh bằng specificity. Kiểm màn có bản đồ (Ship) sau khi đổi.
- Bài kiểm tự động hợp lý: Playwright chụp 1 bộ màn cũ **trước/sau** đổi layer (chạy tay, so ảnh bằng mắt) — không đưa vào CI (D-03 không visual regression).
Hỗ trợ trình duyệt: `@layer` Safari 15.4+, Chrome 99+ [ASSUMED — kiến thức huấn luyện; dùng `caniuse` xác nhận nếu cần iPhone đời cũ].

### Pattern 4: Bộ kiểm nợ ratchet
**Thuật toán** (`scripts/lib/ui-debt.mjs`, hàm thuần để test):
1. Duyệt `apps/web/src` + `apps/shop/src`, đuôi `.ts .tsx .css` (bỏ `*.test.*`, bỏ file token: `apps/shop/src/styles/tokens.css`).
2. Bỏ comment (`/* */`, `//`) trước khi đếm — nhưng đọc comment ngoại lệ **trước** khi bỏ: dòng có `ui-allow: <lý do>` (cùng dòng hoặc dòng ngay trên) thì vi phạm ở dòng đó không tính. Lý do rỗng → vẫn tính.
3. Đếm 3 loại: `hex` (regex tránh `#root`, `href="#x"`, `&#1234;`, hex trong URL/SVG data-URI — xem Pitfall 3), `rgb` (`rgba?\(`), `style` (`style=\{` — **mọi** dạng, kể cả `style={styleObj}`, để khỏi lách bằng biến; trong danh sách cho phép chỉ khi có `ui-allow`).
4. So `baseline.json` `{ "apps/web/src/pages/X.tsx": {"hex":3,"rgb":0,"style":12} }`: file mới/cao hơn bất kỳ loại nào → in danh sách dòng vi phạm, **exit 1**. Thấp hơn → exit 0 + nhắc `pnpm ui:debt --update` (CI **không** tự ghi; chỉ lệnh local ghi, và `--update` từ chối khi có tăng).
5. `--report`: bảng theo màn (từ `ui-screens.json`) = tổng style/hex/rgb **+ số class cũ còn dùng** (token `className` trong file màn trùng tên class định nghĩa ở legacy CSS và không bắt đầu `ui-`). Đây là con số NEN-05. Xấp xỉ chấp nhận được; ghi rõ là heuristic.
6. `--root <dir>` để test chạy trên thư mục tạm; test `node --test` phủ: thêm hex mới → exit 1; thêm `style={{` → exit 1; `ui-allow` hợp lệ → pass; giảm nợ → pass + gợi ý update; `--update` chặn khi tăng; file mới sạch → pass; false positive (`#root`, `href="#a"`, `&#8203;`) → không tính.
**Ghi CI:** bước mới trong `ci.yml` đặt **trước Build** (không cần build): `pnpm ui:debt`; thêm `ui:debt`, `ui:report`, `test:scripts` vào `package.json` gốc. Không cần dependency: dùng `node:fs` + `readdirSync({recursive:true})` (Node ≥ 18.17; **không dùng `fs.glob`**, chỉ có từ Node 22).

### Pattern 5: Kiểm tràn chữ bằng Playwright (chạy tay)
Bê nguyên logic `runCheck()` của `dot-1.html`: với mỗi phần tử khớp `NOWRAP`: `overflow = scrollWidth > clientWidth + 1`; `outside = !inScroller && (right > khung.right+1 || left < khung.left-1)` — thay "khung thiết bị" bằng `window.innerWidth` (viewport thật). Khác với bản vẽ:
- Selector NOWRAP không thể là class bản vẽ (`.btn,.chip…`); dùng class `.ui-*` thật **và** thuộc tính `data-nowrap` mà thẻ nghiệp vụ (D-02) gắn vào tên bàn/tiền/tên món…. Quy ước: **phần tử cấm xuống dòng ở màn nghiệp vụ phải có `data-nowrap`**; hàng cố ý cuộn ngang có `data-scroller` (hoặc class `.ui-chiprow`).
- Phát hiện **trang cuộn ngang** (`document.documentElement.scrollWidth > innerWidth`) — lỗi tràn phổ biến nhất mà selector bỏ sót.
- Phát hiện **gãy chữ**: với phần tử nowrap, `getClientRects().length > 1` hoặc chiều cao > 1.5 × line-height.
- 4 viewport 360×800, 390×844, 1180×820, 1440×900; `page.screenshot({fullPage:true})` vào `.planning/phases/<phase>/overflow/<màn>-<w>.png` (thư mục gitignored hoặc không commit).
- Dữ liệu xấu nhất: **hai đường**: (a) trang fixture `/__ui/overflow` (DEV) hiện mọi component với chuỗi xấu nhất — chạy được ngay ở Phase 1, không cần API; (b) với màn thật ở phase 2–7: `page.route('**/orders/**', …)` trả JSON giả từ `scripts/overflow-fixtures/*.json` (không chạm DB). Đăng nhập: mock `GET /auth/me` (hoặc endpoint tương ứng `auth-context.tsx`) — planner đọc `apps/web/src/lib/auth-context.tsx` khi làm.
- Exit code ≠ 0 khi có lỗi; in danh sách `[viewport] màn → "chữ…" TRÀN|RA NGOÀI|GÃY`.
- jsdom **không có layout** → không dùng được cho việc này; bắt buộc trình duyệt thật.

### Anti-Patterns
- **Bọc `.ui-*` vào `@layer` rồi để legacy ngoài layer** — legacy thắng hết (xem Pattern 3).
- **Cho shop `import '@order/ui/styles.css'`** — đè token shop (28 tên trùng, khác giá trị) và vỡ giao diện khách. Chỉ nạp `fonts.css`.
- **Hai khai báo `@font-face` Be Vietnam Pro** (một ở shop `fonts.css`, một ở ui) — tải trùng/đua nhau. Xoá 6 khối Be Vietnam Pro khỏi shop `fonts.css` khi chuyển; giữ Baloo 2.
- **Đo nợ bằng `grep` đơn thuần trong CI** — dính `#root`, `href="#…"`, `&#…;`, comment; phải bỏ comment + regex chặn.
- **Dùng `disabled`** cho nút chặn (luật 15) — test phải khẳng định `aria-disabled` chứ không `disabled`.

## Don't Hand-Roll

| Vấn đề | Đừng tự viết | Dùng | Vì sao |
|--------|-------------|------|--------|
| Tính tương phản màu / chặn màu thương hiệu | công thức mới | `deriveBrand`, `contrastRatio`, `applyBrand` (đã có + 10 test) | Thanh thử màu `/__ui` chỉ gọi lại |
| Icon | SVG tay | `lucide-react` 0.460.0 | Chốt NEN-03 |
| Font subset | tự cắt woff2 | file woff2 từ Google/Fontsource (đã subset latin/latin-ext/vietnamese, unicode-range) | Đã có 400/600 trong shop |
| DOM test | tự mock `document` | jsdom + RTL + user-event | Esc/focus/click ngoài cần sự kiện thật |
| Trình duyệt đo tràn | tính tay chiều rộng chữ | Playwright | Cần layout thật |
| Duyệt thư mục | glob lib | `readdirSync({recursive})` | Không thêm dependency (D-08) |
| Chạy test script | cài vitest ở root | `node --test` (có sẵn, Node 20+) | Root không có vitest; không thêm dependency |

**Key insight:** Cái dễ làm sai ở phase này không phải component mà là *cascade* (layer/specificity) và *độ chính xác của bộ đếm nợ* — hai thứ này quyết định phase 2–7 chạy êm hay liên tục đỏ oan.

## Runtime State Inventory

Không phải phase đổi tên/migration → bỏ qua. Riêng chuyển font: `apps/shop/public/fonts/bevietnampro-*.woff2` hiện được `/fonts/…` phục vụ trực tiếp; sau khi chuyển sang `packages/ui` (Vite băm tên), **không còn URL `/fonts/bevietnampro-*`** — kiểm không chỗ nào khác (HTML preload, Caddy cache header, `OrderTrackPage`) tham chiếu đường cũ: `grep -rn "bevietnampro" apps packages Caddyfile* Dockerfile` trước khi xoá. Baloo 2 vẫn ở `apps/shop/public/fonts/`.

## Common Pitfalls

### Pitfall 1: Token shop trùng tên token ui
**Sai ở đâu:** Shop import `@order/ui/styles.css` → `--fs-sm` (ui=18px) đè `--fs-sm` của shop (giá trị khác) → chữ cả trang khách đổi.
**Tránh:** Shop chỉ import `@order/ui/fonts.css`. Thêm test/script nhỏ: `apps/shop` không được import `@order/ui/styles.css`/`tokens.css` (có thể là một dòng trong `check-ui-debt`: cảnh báo). Gộp token = DOT2-05.
**Dấu hiệu:** trang khách đổi cỡ chữ sau khi thêm dependency.

### Pitfall 2: Font 500 không tồn tại → render 400
Shop chỉ có 400/600. Token `--fw-medium: 500` → trình duyệt dùng 400. Thêm file 500 (3 subset) từ Fontsource (`@fontsource/be-vietnam-pro@5.3.0`, OFL-1.1) và khai `font-weight: 400 600`? **Không**: đây là font tĩnh, không phải variable — mỗi độ đậm một file; **không gộp `400 600`** (đó chỉ đúng cho Baloo 2 biến thiên). Khai 3 bộ weight 400/500/600 riêng. Thêm preload? Không cần.
**Kiểm:** test grep: mọi `font-weight` trong `.ui-*` thuộc {400,500,600}; dist không chứa `googleapis|gstatic`.

### Pitfall 3: Bộ đếm hex báo oan
`#root`, `href="#cart"`, `&#8203;`, `#1` trong comment, `url(#clip)` SVG, màu trong `data:image/svg+xml` (đã có ở `select` của styles.css, `%236b7280`). Regex đề xuất `(?<![\w&%/#-])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\w-])` sau khi bỏ comment; bỏ qua dòng trong `url("data:` nếu cần. Kiểm: dựng bảng đếm trên repo thật, so với grep thô (1.707/270) để hiểu chênh lệch trước khi chốt baseline; tránh baseline chứa false positive vĩnh viễn.

### Pitfall 4: `style` vô hại bị tính là nợ
`style={{ width: `${pct}%` }}` là ngoại lệ hợp lệ (D-05). Kiểm tự động không phân biệt được → dùng `ui-allow:` bắt buộc có lý do; baseline tính **cả** các chỗ động hiện có (giảm dần khi màn chuyển, phần động còn lại ghi `ui-allow`).

### Pitfall 5: Chạy sync/typecheck lệch
`packages/ui` không có script `build`; `turbo test`/`typecheck` `dependsOn ^build` vẫn chạy bình thường (không build thì bỏ qua). Thêm `vitest.config.ts` + `jsdom` làm `brand.test.ts` chạy trong jsdom — vô hại. Đảm bảo `tsconfig` của `packages/ui` thấy type của RTL (`types`).

### Pitfall 6: Dockerfile + lockfile
`COPY packages/ui/package.json ./packages/ui/` và `COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules` còn thiếu (web đã dùng `@order/ui`). Không thuộc phạm vi UI nhưng **thêm vào việc Phase 1** (1 task nhỏ, kiểm bằng `docker build` nếu Docker có) hoặc ghi vào danh sách "trước push đầu". Shop thêm `@order/ui` → lockfile đổi → chạy `pnpm install` cập nhật `pnpm-lock.yaml` (CI dùng `--frozen-lockfile`).

### Pitfall 7: Bundle budget
`ui/styles.css` đã vào `apps/web` initial CSS. Thêm ~14 component làm CSS/JS web tăng (watch 150 KB gzip, fail 375 KB). Chạy `pnpm build && pnpm bundle:budget` sau khi thêm component; lucide import tên từng icon (tree-shake) — không `import * as`. Font woff2 **không** tính vào ngân sách (script chỉ đo JS+CSS).

### Pitfall 8: `.ncc-ui` / `dvh` / `button.secondary` (từ CLAUDE.md §5)
Mọi overlay mới (`Sheet/Menu/Toast`) khai `flex-direction: row` tường minh nếu là flex overlay, dùng `dvh`; biến thể nút viết `.ui-btn--x`. Dùng `env(safe-area-inset-bottom)` cho `BottomBar`/Toast/Sheet (đã có ở Dialog).

### Pitfall 9: Component phụ thuộc hover
Luật không-hover: `Menu` mở bằng chạm, mục ≥ 48px, không dựa `:hover`/`title` để lộ thông tin; `IconButton` thiếu `aria-label` = lỗi TypeScript.

## Code Examples

### Khai `@font-face` gộp vào ui (kiểu hiện có của shop, thêm 500)
```css
/* Source: apps/shop/src/styles/fonts.css (mở rộng; unicode-range giữ nguyên từ Google Fonts) */
@font-face {
  font-family: 'Be Vietnam Pro';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./fonts/bevietnampro-500-vietnamese.woff2') format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}
```
`packages/ui/package.json` thêm export `"./fonts.css": "./src/fonts.css"`; `styles.css` của ui `@import './fonts.css'` cho web; shop `import '@order/ui/fonts.css'` trong `main.tsx` **trước** `./styles/tokens.css`. Đường `url('./fonts/…')` tương đối trong CSS của workspace package: Vite resolve + băm tên (assets > 4 KB không inline) — [ASSUMED] kiểm bằng `vite build` và xem `dist/assets/*.woff2`.

### Test hành vi (khuôn)
```tsx
// Source: Testing Library docs — https://testing-library.com/docs/react-testing-library/intro
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, test, expect } from 'vitest';
import { Button } from './Button';

test('nút bị chặn không chạy onClick, gọi onBlockedClick, không có thuộc tính disabled', async () => {
  const onClick = vi.fn(); const onBlocked = vi.fn();
  render(<Button blockedReason="Chọn bàn trước" onClick={onClick} onBlockedClick={onBlocked}>Thanh toán</Button>);
  const btn = screen.getByRole('button');
  await userEvent.click(btn);
  expect(onClick).not.toHaveBeenCalled();
  expect(onBlocked).toHaveBeenCalledTimes(1);
  expect(btn.hasAttribute('disabled')).toBe(false);
  expect(btn.getAttribute('aria-disabled')).toBe('true');
});
```

### Khung kiểm tràn (rút gọn)
```js
// Bê từ docs/design/dot-1.html runCheck(); chạy trong page.evaluate
const bad = [...document.querySelectorAll(NOWRAP)].filter((el) => {
  if (el.closest(SCROLLER)) return el.scrollWidth > el.clientWidth + 1 && false; // hàng cuộn ngang cố ý
  const r = el.getBoundingClientRect();
  return el.scrollWidth > el.clientWidth + 1 || r.right > innerWidth + 1 || r.left < -1 || el.getClientRects().length > 1;
});
const pageScrollsX = document.documentElement.scrollWidth > innerWidth + 1;
```

## State of the Art

| Cách cũ | Hiện tại | Ghi chú |
|---------|----------|---------|
| Chặn xung đột CSS bằng chuỗi `!important`/specificity | Cascade layers `@layer` | Hỗ trợ rộng từ 2022 [ASSUMED] |
| Cài Stylelint để cấm hex | Script Node ratchet | Đã chốt D-08 |
| `jest-dom` matcher | Assertion thuần | Vì ràng buộc Node 20 local |

**Deprecated/cần tránh:** jsdom 31 (Node ≥ 22.22) cho đến khi dev machine nâng Node; `fs.glob` (Node 22+); `:has()`-dựa dò đếm.

## Assumptions Log

| # | Claim | Section | Risk nếu sai |
|---|-------|---------|--------------|
| A1 | `@import './x.css' layer(legacy)` chạy đúng qua pipeline CSS của Vite 6 | Pattern 3 | Phải dùng dự phòng `:where()`; làm 1 spike 15 phút đầu phase |
| A2 | Hỗ trợ `@layer` đủ cho iPhone/Android của khách (Safari ≥ 15.4) | Pattern 3 | Thiết bị cũ mất style toàn bộ → dùng `:where()` thay |
| A3 | Playwright 1.65 dùng được Chromium đã cache `chromium-1248` hoặc `-1223` (chưa đối chiếu bản) | Env | Phải `playwright install chromium` (tải ~150MB) |
| A4 | Vite hash + phát woff2 từ `url('./fonts/…')` trong package workspace | Code Examples | Phải dời font về `apps/*/public/` |
| A5 | Legitimacy gói npm (slopcheck không chạy) | Audit | Human-verify trước `pnpm add` |
| A6 | `@layer ui` bọc cả `components.css` không phá thứ tự cascade nội bộ `.ui-*` | Pattern 3 | Hiếm; kiểm `/__ui` bằng mắt |
| A7 | Sau khi gỡ 6 khối Be Vietnam Pro khỏi shop `fonts.css`, shop vẫn đủ weight 400/600 (và 500 mới) | Pitfall 2 | Chữ shop đổi độ đậm; kiểm bằng ảnh |

## Open Questions

1. **Sheet riêng hay hợp nhất Dialog?**
   - Biết: Dialog đã hành xử "bảng trượt đáy / hộp giữa ≥ 640px".
   - Khuyến nghị: hợp nhất; xuất `Sheet` như alias để tên trong bản vẽ khớp, API `footer` giữ (một lối thoát, luật 12).
2. **`/__ui/overflow` fixture nằm ở `apps/web` hay riêng?** Khuyến nghị: route con DEV-only trong `apps/web` cạnh `/__ui` (cùng cơ chế `import.meta.env.DEV`, tree-shaken khỏi build).
3. **Có đưa `data-nowrap` vào quy ước ngay Phase 1?** Khuyến nghị: có — ghi vào `docs/DESIGN-SYSTEM.md` §4 luật 8 + khuôn PARITY, để phase 2+ gắn khi dựng thẻ nghiệp vụ.
4. **Phiên bản Node dev (20.11) so CI (24.22.1)** — script/test phải chạy cả hai; không dùng API Node ≥ 22.

## Environment Availability

| Dependency | Cần cho | Có | Version | Fallback |
|------------|---------|----|---------|----------|
| Node | mọi thứ | ✓ | 20.11.0 local; CI 24.22.1 | — (code tương thích cả hai) |
| pnpm | workspace | ✓ | 9.0.0 | — |
| Playwright package | NEN-07 | ✗ (chưa trong repo) | — | `pnpm add -D -w playwright` |
| Chromium cho Playwright | NEN-07 | ✓ cache (`~/Library/Caches/ms-playwright`: chromium-1223, 1248) | — | `playwright install chromium` nếu bản không khớp |
| MySQL/Docker | — | không cần (không đụng DB) | — | — |
| Pencil MCP | thiết kế | ✗ (kết nối lỗi) | — | Không cần ở Phase 1 (bản vẽ dot-1.html đã có) |
| slopcheck | gate gói | ✗ (bị chặn) | — | `checkpoint:human-verify` |

**Missing, blocking:** không có. **Missing có fallback:** Playwright package, slopcheck.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 + jsdom 26.1.0 + Testing Library (packages/ui); `node --test` (scripts) |
| Config file | `packages/ui/vitest.config.ts` — **Wave 0** (hiện chưa có; mặc định environment `node`) |
| Quick run | `pnpm --filter @order/ui test` ; `node --test scripts/` |
| Full suite | `pnpm typecheck && pnpm test && pnpm ui:debt` (+ `pnpm bundle:budget` sau build) |

### Phase Requirements → Test Map
| Req | Hành vi | Loại | Lệnh | File |
|-----|---------|------|------|------|
| NEN-01 | Mỗi component render, a11y cơ bản (role, label, `aria-label` bắt buộc ở IconButton), hành vi D-03 (Esc, khoá cuộn ref-count, trả focus, Stepper min/max, Menu đóng khi bấm ngoài, Toast tự ẩn bằng fake timers, Switch `role=switch`) | unit (jsdom) | `pnpm --filter @order/ui test` | ❌ Wave 0: `*.test.tsx` từng component |
| NEN-02 | Không `googleapis|gstatic` trong `apps/*/src`, `apps/*/index.html`, `packages/ui/src`, và trong `dist` sau build; có đủ woff2 400/500/600 × 3 subset | script | `node scripts/check-no-google-fonts.mjs` (hoặc gộp vào `check-ui-debt`) | ❌ Wave 0 |
| NEN-03 | `--icon-md/sm/xs` = 24/20/16; mọi `svg` trong `.ui-*` đặt cỡ bằng token | unit (đọc CSS bằng `readFileSync`, không layout) | `pnpm --filter @order/ui test` | ❌ Wave 0 |
| NEN-04 | Thêm hex/`style={{` → exit 1; ngoại lệ có lý do → pass; nợ giảm → pass; `--update` chặn khi tăng; false positive | unit | `node --test scripts/` | ❌ Wave 0: `scripts/ui-debt.test.mjs` |
| NEN-05 | `--report` in số theo màn từ `ui-screens.json` | unit | `node --test scripts/` | ❌ Wave 0 |
| NEN-06 | `/__ui` hiện đủ biến thể; màu < 4.5:1 bị chặn kèm lý do | unit (render showcase) + mắt | `pnpm --filter @order/web test` (nếu thêm test render) + duyệt tay | ❌ Wave 0 (nhẹ) |
| NEN-07/CHUNG-02 | 0 tràn ở 360/390 (và 1180/1440 hiển thị đúng) | thủ công (Playwright) | `pnpm ui:overflow` | ❌ Wave 0 |
| CHUNG-01 | Khuôn đối chiếu có sẵn | tài liệu | — | ❌ `docs/design/PARITY-TEMPLATE.md` |
| CHUNG-03 | Sổ nợ file màn = 0 | script | `pnpm ui:debt` | cùng NEN-04 |
| CHUNG-04 | typecheck + test xanh | CI | `pnpm typecheck && pnpm test` | ✅ có |

**Không kiểm tự động được (ghi rõ):** kích thước pixel thật (nút ≥ 48px, chữ ≥ 16px), tràn chữ, `dvh` trên iPhone — jsdom không có layout; dùng Playwright + duyệt ảnh bằng mắt (D-12/14).

### Sampling Rate
- **Mỗi task commit:** `pnpm --filter @order/ui test` + `node --test scripts/` (< 30 giây)
- **Mỗi wave merge:** `pnpm typecheck && pnpm test && pnpm ui:debt`
- **Phase gate:** full suite xanh + `pnpm build && pnpm bundle:budget` + chạy `pnpm ui:overflow` trên `/__ui/overflow` 4 viewport + chủ repo duyệt ảnh

### Wave 0 Gaps
- [ ] `packages/ui/vitest.config.ts` (jsdom) + cài 4 devDependencies
- [ ] `packages/ui/src/components/*.test.tsx` (mỗi component mới + Dialog/Button/Stepper/Field hiện có)
- [ ] `scripts/lib/ui-debt.mjs`, `scripts/check-ui-debt.mjs`, `scripts/ui-debt.test.mjs`, `scripts/ui-debt-baseline.json`, `scripts/ui-screens.json`
- [ ] `scripts/check-overflow.mjs`, `scripts/overflow.config.json`
- [ ] `docs/design/PARITY-TEMPLATE.md`
- [ ] Script `package.json` gốc: `ui:debt`, `ui:report`, `ui:overflow`, `test:scripts`; bước CI tương ứng; Dockerfile COPY `packages/ui`

## Security Domain

Phase không đụng auth/API/DB. Mức ASVS 1.

| ASVS | Áp dụng | Kiểm soát |
|------|---------|-----------|
| V2/V3/V4 | không | — |
| V5 Input validation | hạn chế | `MoneyInput` giữ `inputMode="numeric"`; không `dangerouslySetInnerHTML` trong component mới; `Toast`/`EmptyState` nhận `ReactNode`/string, không HTML thô |
| V6 Cryptography | không | — |
| V14 Config / chuỗi cung ứng | **có** | Gói npm mới đều gắn human-verify; font tự host (không CDN) → bỏ phụ thuộc bên thứ ba lúc chạy; Playwright chỉ ở máy dev, `playwright install` là lệnh tay |

| Mối đe doạ | STRIDE | Giảm thiểu |
|-----------|--------|-----------|
| Gói npm giả (slopsquatting) | Tampering | Cổng `checkpoint:human-verify`, ghim phiên bản, `--frozen-lockfile` ở CI |
| Fixture kiểm tràn lọt vào build/prod | Information disclosure | Route `/__ui*` dưới `import.meta.env.DEV`; kiểm `dist` không chứa chuỗi `__ui` |
| Script overflow chạm DB thật / production | Tampering | `page.route` mock; script từ chối URL không phải `localhost` |
| Playwright gọi tới `quanbalun.site` | — | Cấm theo CLAUDE.md §4 — hard-code allowlist `localhost` trong script |

## Sources

### Primary (HIGH)
- Mã nguồn repo: `packages/ui/src/**`, `apps/web/src/styles.css`, `apps/web/src/main.tsx`, `apps/shop/src/main.tsx`, `apps/shop/src/styles/{fonts,tokens}.css`, `Dockerfile`, `.github/workflows/ci.yml`, `scripts/check-bundle-budget.mjs`, `turbo.json`, `docs/DESIGN-SYSTEM.md`, `docs/design/dot-1.html` (hàm `runCheck`, `NOWRAP`, `SCROLLER`).
- `npm view` ngày 2026-11-06: jsdom, @testing-library/{react,user-event,jest-dom}, playwright, @fontsource/be-vietnam-pro (engines, peerDependencies, license).
- jsDelivr file listing `@fontsource/be-vietnam-pro@5.3.0` (có file 400/500/600 × latin/latin-ext/vietnamese).

### Secondary (MEDIUM)
- Quy tắc cascade layers (CSS Cascade Level 5 / MDN) — từ kiến thức, **chưa fetch lại trong phiên** → coi MEDIUM; spike A1 sẽ xác nhận bằng chính build Vite.

### Tertiary (LOW)
- Hỗ trợ trình duyệt `@layer` (A2), tương thích Chromium-cache ↔ Playwright 1.65 (A3).

## Metadata

**Confidence:**
- Standard stack: MEDIUM — registry kiểm được, slopcheck không chạy
- Architecture: HIGH về cấu trúc, MEDIUM về `@layer` qua Vite (cần spike)
- Pitfalls: HIGH — rút trực tiếp từ code (token trùng, thiếu font web, Dockerfile, `--icon-sm`)

**Research date:** 2026-11-06
**Valid until:** 30 ngày (ổn định); kiểm lại nếu Node dev lên ≥ 22 (khi đó dùng được jsdom 31 / jest-dom)
