---
phase: "1"
slug: "n-n-m-ng-design-system"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-06"
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Nguồn: `01-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 + jsdom 26.1.0 + Testing Library (`packages/ui`); `node --test` (scripts) |
| **Config file** | `packages/ui/vitest.config.ts` — none, Wave 0 installs |
| **Quick run command** | `pnpm --filter @order/ui test && node --test scripts/` |
| **Full suite command** | `pnpm typecheck && pnpm test && pnpm ui:debt` (+ `pnpm build && pnpm bundle:budget` ở phase gate) |
| **Estimated runtime** | ~30 seconds (quick) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @order/ui test && node --test scripts/`
- **After every plan wave:** Run `pnpm typecheck && pnpm test && pnpm ui:debt`
- **Before `/gsd-verify-work`:** Full suite xanh + `pnpm ui:overflow` trên `/__ui/overflow` ở 4 viewport + chủ repo duyệt ảnh
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

*Planner điền Task ID khi tạo PLAN.md. Bảng dưới là ánh xạ yêu cầu → lệnh kiểm.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | NEN-01 | — | N/A | unit (jsdom) | `pnpm --filter @order/ui test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | NEN-02 | — | Không request tới Google Fonts | script | `node scripts/check-no-google-fonts.mjs` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | NEN-03 | — | N/A | unit | `pnpm --filter @order/ui test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | NEN-04 | — | N/A | unit | `node --test scripts/` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | NEN-05 | — | N/A | unit | `node --test scripts/` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | NEN-06 | — | N/A | unit + mắt | `pnpm --filter @order/web test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | NEN-07 / CHUNG-02 | — | Script chỉ cho phép localhost | Playwright (tay) | `pnpm ui:overflow` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CHUNG-01 | — | N/A | tài liệu | — | ❌ `docs/design/PARITY-TEMPLATE.md` | ⬜ pending |
| TBD | TBD | TBD | CHUNG-03 | — | N/A | script | `pnpm ui:debt` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CHUNG-04 | — | N/A | CI | `pnpm typecheck && pnpm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/ui/vitest.config.ts` (jsdom) + devDependencies (jsdom 26.1.0, RTL 16.3.3, @testing-library/dom ^10, user-event 14.6.8)
- [ ] `packages/ui/src/components/*.test.tsx` — mỗi component mới + Dialog/Button/Stepper/Field hiện có
- [ ] `scripts/lib/ui-debt.mjs`, `scripts/check-ui-debt.mjs`, `scripts/ui-debt.test.mjs`, `scripts/ui-debt-baseline.json`, `scripts/ui-screens.json`
- [ ] `scripts/check-overflow.mjs`, `scripts/overflow.config.json`
- [ ] `docs/design/PARITY-TEMPLATE.md`
- [ ] Script `package.json` gốc: `ui:debt`, `ui:report`, `ui:overflow`, `test:scripts`; bước CI tương ứng; Dockerfile COPY `packages/ui`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Nút ≥ 48px, chữ ≥ 16px đúng pixel thật | NEN-01 | jsdom không có layout | Playwright chụp ảnh 4 viewport, chủ repo duyệt |
| Không tràn / gãy chữ ở 360/390/1180/1440 | NEN-07, CHUNG-02 | Cần trình duyệt thật | `pnpm ui:overflow` rồi xem ảnh chụp |
| `dvh` hộp thoại không trôi trên iPhone | NEN-01 | Chỉ lộ trên Safari iOS | Mở `/__ui` trên iPhone thật |
| Be Vietnam Pro hiện đủ dấu tiếng Việt | NEN-02 | Kiểm bằng mắt | Mở `/__ui`, DevTools Network không có googleapis/gstatic |
| Leaflet CSS không vỡ sau khi bọc legacy vào `@layer` | NEN-01 (D-10) | So sánh trực quan | Mở màn có bản đồ, đối chiếu trước/sau |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
