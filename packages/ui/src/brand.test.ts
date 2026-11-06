import { describe, expect, it } from 'vitest';
import { contrastRatio, deriveBrand } from './brand';

describe('contrastRatio — khớp số đã chốt ở DESIGN-SYSTEM §3', () => {
  it.each([
    ['#0057D9', 6.24],
    ['#0047B3', 8.23],
    ['#047857', 5.48],
    ['#C81E1E', 5.74],
    ['#C2410C', 5.18],
    ['#525252', 7.81],
    ['#8A8A8A', 3.45],
  ])('%s trên trắng ≈ %s', (hex, expected) => {
    expect(contrastRatio(hex, '#FFFFFF')).toBeCloseTo(expected, 1);
  });
});

describe('deriveBrand', () => {
  it('nhận màu đạt AA và suy ra hover đậm hơn', () => {
    const r = deriveBrand('#0057D9');
    expect(r.ok).toBe(true);
    if (r.ok) expect(contrastRatio(r.hover, '#FFFFFF')).toBeGreaterThan(r.ratio);
  });

  it('chặn màu quá sáng (vàng) — chữ trắng không đọc được', () => {
    const r = deriveBrand('#FACC15');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/4\.5:1/);
  });

  it('chặn mã màu sai định dạng', () => {
    expect(deriveBrand('xanh').ok).toBe(false);
  });
});
