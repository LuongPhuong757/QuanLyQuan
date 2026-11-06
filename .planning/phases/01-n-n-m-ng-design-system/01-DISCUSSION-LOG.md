# Phase 1: Nền móng design system - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-06
**Phase:** 01-Nền móng design system
**Areas discussed:** Làm component bao nhiêu, Độ nghiêm của bộ kiểm, Cách gỡ CSS cũ, Kiểm tràn chữ tự động

---

## Làm component bao nhiêu

| Option | Description | Selected |
|--------|-------------|----------|
| Đủ cho cả đợt 1 | Dựng ngay mọi component của bản vẽ dot-1; phase sau chỉ lắp ghép | ✓ |
| Phần chung + bổ sung dần | Component đặc thù làm trong phase của màn | |

| Option (thẻ nghiệp vụ) | Description | Selected |
|--------|-------------|----------|
| Trong apps/web | packages/ui chỉ giữ component chung | ✓ |
| Trong packages/ui | Để shop dùng lại | |

| Option (test) | Description | Selected |
|--------|-------------|----------|
| Test hành vi chính | Vitest + Testing Library, không test ảnh | ✓ |
| Chỉ xem trên /__ui | Không viết test | |

| Option (/__ui) | Description | Selected |
|--------|-------------|----------|
| Chỉ lập trình viên | Chỉ có ở dev | ✓ |
| Cả bài demo bán hàng | Xem được ở server dev | |

**User's choice:** Đủ cho cả đợt 1 · thẻ nghiệp vụ trong apps/web · test hành vi chính · /__ui chỉ dev

---

## Độ nghiêm của bộ kiểm

| Option | Description | Selected |
|--------|-------------|----------|
| CI đỏ, chặn hẳn | Ngoại lệ phải có comment lý do | ✓ |
| Chỉ cảnh báo | CI xanh, in danh sách | |

| Option (nợ cũ) | Description | Selected |
|--------|-------------|----------|
| Ghi sổ theo file, chỉ được giảm | Theo dõi tiến độ từng màn | ✓ |
| Chỉ kiểm dòng mới trong diff | Không đo được nợ còn lại | |

| Option (phạm vi) | Description | Selected |
|--------|-------------|----------|
| Cả apps/web và apps/shop | Shop ghi sổ luôn | ✓ |
| Chỉ apps/web | | |

| Option (công cụ) | Description | Selected |
|--------|-------------|----------|
| Script nhỏ riêng | scripts/ như check-bundle-budget.mjs | ✓ |
| ESLint + Stylelint | Phải cấu hình cả repo | |
| You decide | | |

**User's choice:** CI đỏ · sổ nợ theo file · cả web + shop · script nhỏ riêng

---

## Cách gỡ CSS cũ

| Option | Description | Selected |
|--------|-------------|----------|
| Gỡ sạch trong cùng phase | Sổ nợ màn về 0 là điều kiện xong phase | ✓ |
| Để song song, dọn sau | Dọn ở phase cuối milestone | |

| Option (styles.css) | Description | Selected |
|--------|-------------|----------|
| Phase 1 cô lập rule toàn cục | Không để CSS cũ đè component mới | ✓ |
| Giữ nguyên tới cuối | Tự đấu specificity | |

| Option (giai đoạn lai) | Description | Selected |
|--------|-------------|----------|
| Không chỉnh | Chấp nhận lệch tạm | ✓ |
| Áp font + màu nền chung | Có thể vỡ màn cũ | |

**User's choice:** Gỡ sạch trong cùng phase · cô lập rule toàn cục ở Phase 1 · không chỉnh màn cũ

---

## Kiểm tràn chữ tự động

| Option | Description | Selected |
|--------|-------------|----------|
| Lệnh tay trên máy + CI sau | Playwright local; vào CI sau Phase 8 | ✓ |
| Vào CI ngay Phase 1 | CI chậm thêm, cần seed | |
| Chỉ trên /__ui | Không bắt lỗi dữ liệu thật | |

| Option (dữ liệu) | Description | Selected |
|--------|-------------|----------|
| Bộ dữ liệu "xấu nhất" | Tên dài, tiền lớn, 99 phần, 999+ | ✓ |
| Dữ liệu DB dev hiện có | Có thể bỏ sót ca khó | |

| Option (kích thước) | Description | Selected |
|--------|-------------|----------|
| Thêm iPad 1180 + máy tính 1440 | Chụp cả 4 để duyệt | ✓ |
| Chỉ 360/390 | | |

**User's choice:** Lệnh tay + CI sau · dữ liệu "xấu nhất" · 4 kích thước

---

## Claude's Discretion

- Dùng chung font Be Vietnam Pro tự host của shop (chuyển vào packages/ui, thêm cỡ 500)
- Tiền tố class `.ui-*`; tổ chức thư mục/API component; định dạng sổ nợ; hợp nhất Sheet/Dialog hay không

## Deferred Ideas

- Playwright vào CI sau Phase 8
- ESLint/Stylelint toàn repo
- Gỡ phần còn lại styles.css theo phase màn
- Gộp token/font cũ của shop vào packages/ui (milestone trang khách)
