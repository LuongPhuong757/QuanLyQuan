# Design System — QuanLyQuan

Trạng thái: **khung + luật + giá trị token đã chốt (hướng A "Xanh tin cậy", 2026-11-06)**.
Bố cục màn: chưa chốt — xem đề xuất cải tiến từ khảo sát repo.
Code: **`packages/ui` đã có (2026-11-06)** — token 3 tầng + Button, Input, Select, Textarea, Card,
CardButton, Badge, Dialog, `applyBrand()`. Trang mẫu `/__ui` (chỉ dev). Bản vẽ duyệt tạm:
`docs/design/quanlyquan-ds.html` v0.2 (Pencil chưa kết nối được) — có iPhone 390/360, iPad, máy tính
và nút "Tự kiểm tràn chữ".
Ngày lập: 2026-11-06.

Mục tiêu: mọi màn hình của `apps/web` (quản lý) và `apps/shop` (khách) dùng **một** nguồn sự thật
về màu sắc, typography, khoảng cách, bo góc, đổ bóng và component — đổi một chỗ, cả app đổi theo,
và mỗi quán đổi được màu thương hiệu mà không đụng code.

---

## 1. Hiện trạng (đo 2026-11-06)

| App | Token | Vấn đề |
|---|---|---|
| `apps/web` | **Không có** — 0 biến CSS trong `styles.css` (3.271 dòng) + `suppliers-ui.css` (1.917 dòng) | **2.034 chỗ `style={{…}}` inline**, màu hex rải rác (`#0f766e`, `#dc2626`, `#1f2937`…) |
| `apps/shop` | Có `src/styles/tokens.css` (364 dòng, tỉ lệ tương phản đã tính theo WCAG) | Token chỉ sống trong shop, web không dùng được |

→ Gốc rễ của việc giao diện không nhất quán là `apps/web` không có token, không phải thiếu quy ước.

## 2. Kiến trúc

```
Pencil (docs/design/quanlyquan.pen) ← thiết kế, chủ repo duyệt
   │  biến Pencil (variables) đặt tên TRÙNG token code
   ▼
packages/ui/                         ← NGUỒN SỰ THẬT TRONG CODE (package mới)
 ├─ src/tokens/
 │   ├─ primitives.css   bảng màu thô (--red-600, --gray-100…), thang cỡ, thang khoảng cách
 │   ├─ semantic.css     vai trò (--color-primary, --color-danger, --bg-surface, --text-muted…)
 │   └─ brand.css        mặc định thương hiệu; mỗi quán ghi đè lúc chạy (xem §5)
 ├─ src/components/      Button, Input, Select, Card, Dialog, Badge, Tabs, Table, Toast…
 └─ src/index.ts
   │
   ├─▶ apps/web    import '@order/ui/tokens.css' + component
   └─▶ apps/shop   tokens.css hiện có chuyển dần vào packages/ui
```

- Token **2 tầng**: primitive (giá trị thô) → semantic (ý nghĩa). Component **chỉ** dùng semantic.
  Đổi màu thương hiệu = đổi vài semantic, không lần từng màn.
- Dùng **CSS variables + CSS thường**, không thêm Tailwind/MUI: 2 app đang là CSS thuần, thêm
  framework UI là viết lại toàn bộ, và tăng bundle (CI có gác ngân sách bundle).

## 3. Thang token — hướng A "Xanh tin cậy" (chốt 2026-11-06)

Mẫu tham khảo: **màu + phong cách KiotViet** (đo từ CSS `kiotviet.vn` ngày 2026-11-06: hệ `--kv-*`,
xanh `#006FFF`, Google Sans Flex, thang 4px). KHÔNG lấy mật độ/bố cục của KiotViet — họ làm cho
bán lẻ trên máy tính. Đã sửa 5 chỗ KiotViet trượt AA (xanh chính 4.45, trạng thái 2.47–3.81,
viền ô nhập 1.26, nhãn 12px, nút 40px).

Mọi tỉ lệ dưới đây tính bằng công thức WCAG, nền trắng trừ khi ghi khác.

| Token | Giá trị | Tương phản / ghi chú |
|---|---|---|
| `--color-primary` / `--color-on-primary` | `#0057D9` / `#FFFFFF` | 6.24 |
| `--color-primary-hover` | `#0047B3` | 8.23 |
| `--color-success` | `#047857` | 5.48 (chữ trắng) |
| `--color-danger` | `#C81E1E` | 5.74 (chữ trắng) |
| `--color-warning` | `#C2410C` | 5.18 (chữ trắng) |
| `--color-info` | = `--color-primary` | |
| `--bg-page` / `--bg-surface` / `--bg-muted` | `#F5F7FA` / `#FFFFFF` / `#EEF1F4` | |
| `--text` / `--text-muted` | `#0A0A0A` / `#525252` | 19.8 / 7.81 (7.28 trên `--bg-page`) |
| `--border` (trang trí) / `--border-input` | `#E5E5E5` / `#8A8A8A` | viền ô nhập 3.45 ≥ 3:1 (WCAG 1.4.11) |
| Font | **Be Vietnam Pro**, tự host woff2 (subset Latin + Vietnamese) | không gọi Google Fonts lúc chạy |
| `--fs-xs/sm/base/md/lg/xl/2xl` | 16 / **18** / 20 / 24 / 28 / 32 / 40 px | chữ nền 18px; KHÔNG có cỡ < 16px, kể cả nhãn điều hướng |
| `--fw-regular/medium/bold` | 400 / 500 / 600 | |
| `--lh-tight/normal` | 1.3 / 1.6 | |
| `--sp-1 … --sp-10` | 4 / 8 / 12 / 16 / 20 / 24 / 28 / 32 / 36 / 40 px | |
| `--r-sm/md/lg/pill` | 8 / 12 / 16 / 9999 px | bớt tròn hơn KiotViet (12–40) cho đỡ phí chỗ trên điện thoại |
| `--shadow-sm` | `0 1px 2px rgba(0,41,87,.08)` | bóng pha xanh navy kiểu KiotViet |
| `--shadow-md` | `0 4px 12px rgba(0,41,87,.10)` | |
| `--shadow-lg` | `0 12px 32px rgba(0,41,87,.14)` | chỉ dùng cho hộp thoại |
| `--tap-min` | 48px | |
| Nút | cao 52 (mặc định) / 64 (nút chính lớn: Gửi bếp, Thanh toán); chữ 18 đậm 600; bo `--r-md` | không có cỡ nút < 48 |
| Ô nhập | cao 52, viền 1.5px `--border-input`, nhãn 16px đặt **trên** ô (không chỉ placeholder), focus ring 3px primary 40% | chữ ≥ 16px còn tránh iOS tự zoom |

Khung tên token (giữ nguyên):

| Nhóm | Tên token | Ghi chú |
|---|---|---|
| Màu | `--color-primary`, `--color-primary-hover`, `--color-on-primary`, `--color-danger`, `--color-success`, `--color-warning`, `--color-info` | Mọi cặp chữ/nền đạt WCAG AA ≥ 4.5:1 (chữ thường), tính bằng công thức, không ước lượng |
| Nền / chữ | `--bg-page`, `--bg-surface`, `--bg-muted`, `--text`, `--text-muted`, `--border` | |
| Typography | `--fs-xs … --fs-3xl`, `--fw-regular/medium/bold`, `--lh-tight/normal` | **Cỡ nền tối thiểu 16px** — người dùng lớn tuổi, dùng điện thoại |
| Khoảng cách | `--sp-1 … --sp-10` theo bước 4px | |
| Bo góc | `--r-sm`, `--r-md`, `--r-lg`, `--r-pill` | |
| Đổ bóng | `--shadow-sm`, `--shadow-md`, `--shadow-lg` | |
| Kích thước chạm | `--tap-min: 48px` | Mọi nút/ô bấm cao ≥ 48px |
| Chuyển động | `--dur-fast`, `--dur-normal`, `--ease` | Tôn trọng `prefers-reduced-motion` |
| Lớp | `--z-header`, `--z-dialog`, `--z-toast` | |

## 4. Luật bắt buộc

1. **Không hex/px cứng trong `.tsx`/`.css` của app** — luôn `var(--…)`. Ngoại lệ phải có comment
   giải thích vì sao.
2. **Không `style={{…}}` cho màu/chữ/khoảng cách/bo góc/bóng.** Inline chỉ cho giá trị động thật
   sự (vd chiều rộng thanh tiến độ theo %).
3. **Không tự dựng nút/ô nhập.** Dùng `<Button>`, `<Input>`… của `packages/ui`. Thiếu biến thể thì
   thêm vào package, không chế ở màn.
4. Giữ các bài học CSS của Bà Lùn (đưa vào component, không để mỗi màn tự nhớ):
   - Hộp thoại dùng `dvh`, không `vh` (trôi đỉnh trên iPhone).
   - Không tooltip/hover làm đường duy nhất để thấy thông tin — người dùng chạm, không rê chuột.
   - Specificity nút: biến thể nằm trong component nên hết chuyện `button.secondary` đè class trần.
5. Token trong code và variables trong Pencil **trùng tên**. Đổi một bên phải đổi bên kia.
6. Chữ to, nút to, ít bước là **chuẩn của cả hệ thống**, không phải ngoại lệ của vài màn.
7. **Thiết kế trước, code sau** (chốt 2026-11-06): mọi thay đổi giao diện — kể cả sửa lỗi nhãn nút —
   phải có bản vẽ Pencil được chủ repo duyệt rồi mới code.
8. **Không xuống dòng** ở nhãn nút, chip, tiêu đề màn, tên bàn, nhãn điều hướng (`white-space: nowrap`
   có sẵn trong component). Nhãn phải viết đủ ngắn để vừa màn **360px**. Nội dung (tên món, ghi chú)
   thì được xuống dòng, không cắt "…". Mọi màn kiểm ở **360 và 390px** trước khi duyệt.
9. **Màu theo nghĩa:** xanh dương = mọi nút hành động · xanh lá = chỉ trạng thái "đã xong" (nhãn,
   thông báo), **không có nút xanh lá** · đỏ = phá huỷ/trễ · cam = đang chờ.
10. **Số tiền là chữ to nhất** trong thẻ/hộp chứa nó (thẻ bàn: tiền 20 > tên 18).
11. **Không tự thêm tính năng khi vẽ** (chốt 2026-11-06): bản vẽ chỉ được có tính năng đang có trong code
    (đối chiếu `docs/design/FEATURE-INVENTORY.md`). Tính năng mới phải ghi rõ "MỚI" và được chủ repo duyệt riêng.
    **Thanh hành động chỉ hiện khi đã rõ đối tượng** (đã mở một bàn) và ghi ngữ cảnh trên thanh.
    Thanh cố định đáy → nội dung phía trên có đệm dưới bằng chiều cao thanh.
12. **Một lối thoát** cho mỗi hộp thoại (không vừa ✕ vừa "Quay lại").
13. **Icon: Lucide** (`lucide-react`), nét 2px, cỡ 24 (20 trong chip, 16 trong nhãn), luôn kèm chữ.
    Không dùng emoji trong giao diện.
14. Số lượng dùng **Stepper − 1 +**, không bắt gõ số. Ô tiền có hậu tố "đ" + `inputMode="numeric"`.
15. Nút bị chặn: **viền đứt + ⚠ + lý do** trên nút, vẫn bấm được.


## 5. Màu theo từng quán

- `brand.css` có mặc định. Lúc chạy, app gọi API lấy cài đặt thương hiệu của quán và ghi đè
  `--brand-*` trên `:root` — một bản build cho mọi quán.
- Quán chọn màu chính → hệ thống **tự tính** màu hover/chữ-trên-nền và **chặn** màu không đạt
  tương phản AA (không để quán chọn màu làm chữ không đọc được).

**Chốt 2026-11-06 (chủ repo):**
- Quán đổi được **màu chính + logo** (logo + tên quán trên header, hoá đơn, trang khách). Không đổi font, bo góc.
- Áp cho **cả trang quản lý lẫn trang khách** (một màu).
- Chủ quán chọn: **bảng 10 màu soạn sẵn + ô tự nhập mã**; màu < 4.5:1 với chữ trắng bị chặn kèm lý do
  (`deriveBrand()` trong `packages/ui/src/brand.ts`). Bảng soạn sẵn (tỉ lệ với chữ trắng):
  Xanh dương #0057D9 6.24 (mặc định) · Xanh navy #1E3A8A 10.36 · Xanh ngọc #0F766E 5.47 · Xanh lá #15803D 5.02 ·
  Tím #7E22CE 6.98 · Hồng đậm #BE185D 6.04 · Đỏ đô #9F1239 8.02 · Nâu cà phê #7C2D12 9.37 · Vàng đồng #A16207 4.92 ·
  Than chì #334155 10.35.
- **Màu trạng thái cố định, không theo quán**: xanh lá = xong, đỏ = huỷ/trễ, cam = chờ, tím `--color-qr` = khách gọi QR /
  KiotViet — nhân viên đổi quán/ca không được hiểu nhầm.
- Màn **Cài đặt → Thương hiệu** (MỚI) để chủ quán tự đổi.

## 6. Lộ trình

| Bước | Việc | Xong khi |
|---|---|---|
| 1 | Chủ repo gửi mẫu tham khảo → chốt hướng thẩm mỹ | Có 1 trang moodboard được duyệt |
| 2 | Vẽ trên Pencil: bảng token + component cơ bản + 3 màn mẫu (Order, Bếp, Thanh toán) theo §8 | Chủ repo duyệt bản Pencil |
| 3 | Tạo `packages/ui`: token + Button, Input, Select, Card, Dialog, Badge | Trang mẫu `/__ui` hiện đủ biến thể — **✅ code xong 2026-11-06, chờ duyệt** |
| 4 | Chuyển `apps/web` theo từng màn, bắt đầu 3 màn mẫu; gỡ inline style của màn đó | Đếm `style={{` giảm dần, có số theo dõi |
| 5 | Gộp `apps/shop/tokens.css` vào `packages/ui` | 2 app dùng chung token |
| 6 | Thêm kiểm tự động: lint/CI chặn hex cứng và `style={{` mới | Không tái phát |

## 7. Công cụ

- **Pencil** (MCP) — thiết kế + variables, file `docs/design/quanlyquan.pen` (đi theo git). Không dùng Figma
  (gói Starter giới hạn lượt gọi MCP).
- Skill trong `.claude/skills/`: `design-system`, `frontend-design-direction`,
  `make-interfaces-feel-better`, `accessibility`, `frontend-a11y`,
  `frontend-patterns`, `react-patterns`, `react-performance`, `vite-patterns`.
- GSD: `/gsd-ui-phase` (hợp đồng thiết kế UI-SPEC cho từng phase), `/gsd-ui-review` (chấm giao
  diện đã làm).

## 8. Bố cục — cải tiến đã chốt (2026-11-06)

Rút từ khảo sát `apps/web` (OrdersPage, OrderDrawer, BulkOrderModal, KitchenPage, CheckoutDialog).

**Toàn app**
- Nút/ô nhập ≥ 48px (hiện 44). Sàn chữ 16px — thông tin phụ làm **nhạt màu**, không thu nhỏ.
- Điều hướng dưới: **giữ đúng các mục theo vai trò như code** (admin 9, bếp 7, order 5, báo cáo 5),
  cuộn ngang khi không đủ chỗ; nhãn **16px**, cao 72px. (Bỏ đề xuất "tối đa 5 mục" — 2026-11-06.)
- Breakpoint chỉ còn `min-width` 640 / 900 / 1280, thiết kế điện thoại trước.
- Không cắt "…" chỉ còn bản đầy đủ trong `title` — cho xuống tối đa 2 dòng.
- Hộp thoại chồng tối đa **2 tầng** (hiện tới 4: trang → đơn → chọn món → giỏ → ghi chú).

**Order** — thẻ bàn: tên 24px + tổng tiền + thời gian ngồi; bỏ nút 🔒 28px trên thẻ (vào ⋯).
Lọc rút còn 3 nút + "Lọc". Thanh đáy cố định `[+ Gọi món] [💰 Thanh toán]` thay FAB và nút
Thanh toán đầu danh sách. Chạm dòng món mở hàng nút 48px (− SL + / Huỷ / Ghi chú), bỏ vuốt.
Chọn món: tên/giá 18px, bộ đếm trên thẻ, giỏ là thanh đáy mở rộng, "Báo bếp" ngay trên giỏ.

**Bếp** — nút 48px (bỏ ngoại lệ 34px); gộp 3 chế độ xem + sắp xếp thành một nút "Xem: … ▾".
Tên món 20px, ghi chú 18px nền vàng nhạt không cắt. Nút » Xong 64×64. Thanh đáy giữ chữ.

**Thanh toán** — bảng trượt từ đáy trên điện thoại, nút xác nhận 64px. Sửa nhãn nút lùi bị tráo
(CheckoutDialog.tsx:674). Chọn hình thức = 2 nút to, chạm là sang bước. "Tổng cần thu" 32px.
Lý do nút chính bị chặn hiện thành dòng chữ trên nút. Giữ: không chọn sẵn mã QR (chủ quán chốt
2026-09-14), không dùng `disabled`.
