/**
 * Màu theo từng quán (DESIGN-SYSTEM §5): quán chọn 1 màu chính, hệ thống tự tính hover/tint
 * và CHẶN màu không đạt AA với chữ trắng — không để quán chọn màu làm chữ không đọc được.
 */

const AA_NORMAL = 4.5;

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(rgb: [number, number, number]): string {
  return '#' + rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Độ sáng tương đối theo công thức WCAG 2.x. */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) throw new Error(`Màu không hợp lệ: ${hex}`);
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mix(hex: string, target: [number, number, number], amount: number): string {
  const rgb = hexToRgb(hex)!;
  return toHex([0, 1, 2].map((i) => rgb[i] + (target[i] - rgb[i]) * amount) as [number, number, number]);
}

export type BrandCheck =
  | { ok: true; primary: string; hover: string; tint: string; ratio: number }
  | { ok: false; reason: string; ratio?: number };

/** Kiểm + suy ra bộ màu thương hiệu từ 1 màu chính. Dùng cả ở màn cài đặt (báo lỗi trước khi lưu). */
export function deriveBrand(primary: string): BrandCheck {
  if (!hexToRgb(primary)) return { ok: false, reason: 'Mã màu phải dạng #RRGGBB' };
  const ratio = contrastRatio(primary, '#FFFFFF');
  if (ratio < AA_NORMAL) {
    return {
      ok: false,
      ratio,
      reason: `Màu quá sáng: chữ trắng trên nền này chỉ đạt ${ratio.toFixed(2)}:1, cần tối thiểu 4.5:1. Hãy chọn màu đậm hơn.`,
    };
  }
  return {
    ok: true,
    primary: primary.toUpperCase(),
    hover: mix(primary, [0, 0, 0], 0.18),
    tint: mix(primary, [255, 255, 255], 0.9),
    ratio,
  };
}

/** Ghi đè --brand-* lúc chạy. Màu không đạt AA → giữ mặc định, trả về lý do. */
export function applyBrand(primary: string, root: HTMLElement = document.documentElement): BrandCheck {
  const res = deriveBrand(primary);
  if (!res.ok) return res;
  root.style.setProperty('--brand-primary', res.primary);
  root.style.setProperty('--brand-primary-hover', res.hover);
  root.style.setProperty('--brand-primary-tint', res.tint);
  return res;
}
