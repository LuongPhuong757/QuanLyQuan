// Thương hiệu theo quán (2026-11-19, màn Thiết lập → Thương hiệu, docs/THIET-LAP-QUAN-SPEC.md §8c).
//
// Ở package dùng chung vì 3 nơi phải khớp tuyệt đối: API kiểm màu gửi lên có nằm trong bảng không,
// trang quản lý và trang khách sinh thang màu y hệt nhau từ cùng một mã.
//
// Vì sao BẢNG MÀU chứ không cho gõ mã tự do (chủ quán chốt): mỗi màu dưới đây đã kiểm chữ trắng
// trên nó ≥ 4.5:1 (test ở apps/api thiet-lap/thuong-hieu.test.ts) — người lớn tuổi đọc chữ trên
// nút được. Gõ tự do là mở đường cho nút vàng chanh chữ trắng.

export type MauBang = { hex: string; ten: string };

export const MAU_ADMIN_MAC_DINH = '#0f766e';
export const MAU_KHACH_MAC_DINH = '#b82a1e';

/** Trang quản lý: KHÔNG có đỏ / cam / xanh lá — ba màu đó là lỗi / cảnh báo / đã xong (bộ quy
 *  tắc --ds-*). Nút chính đỏ thì người dùng không còn phân biệt được "bấm đi" với "có lỗi". */
export const BANG_MAU_ADMIN: readonly MauBang[] = [
  { hex: '#0f766e', ten: 'Xanh ngọc' },
  { hex: '#1d4ed8', ten: 'Xanh dương' },
  { hex: '#1e3a8a', ten: 'Xanh than' },
  { hex: '#0e7490', ten: 'Xanh biển' },
  { hex: '#6d28d9', ten: 'Tím' },
  { hex: '#a21caf', ten: 'Tím hồng' },
  { hex: '#be185d', ten: 'Hồng đậm' },
  { hex: '#7c4a2d', ten: 'Nâu cà phê' },
  { hex: '#44403c', ten: 'Nâu đá' },
  { hex: '#27272a', ten: 'Đen than' },
];

/** Trang khách: được chọn đỏ (Bà Lùn dùng đỏ ớt). Lỗi ở trang khách có màu riêng `--danger-*`. */
export const BANG_MAU_KHACH: readonly MauBang[] = [
  { hex: '#b82a1e', ten: 'Đỏ ớt' },
  { hex: '#c2410c', ten: 'Cam đất' },
  { hex: '#a16207', ten: 'Vàng nghệ đậm' },
  { hex: '#15803d', ten: 'Xanh lá' },
  { hex: '#0f766e', ten: 'Xanh ngọc' },
  { hex: '#1d4ed8', ten: 'Xanh dương' },
  { hex: '#6d28d9', ten: 'Tím' },
  { hex: '#be185d', ten: 'Hồng đậm' },
  { hex: '#7c4a2d', ten: 'Nâu cà phê' },
  { hex: '#27272a', ten: 'Đen than' },
];

export function trongBang(bang: readonly MauBang[], hex: string): boolean {
  const h = hex.toLowerCase();
  return bang.some((m) => m.hex === h);
}

/** Dữ liệu thương hiệu công khai — `GET /api/public/thuong-hieu` (+ `/auth/thuong-hieu` cho trang
 *  quản lý, vì proxy dev của web không có tiền tố /api). */
export type ThuongHieuCongKhai = {
  ten: string;
  /** Rỗng = dùng `ten`. */
  ten_ngan: string;
  mau_admin: string;
  mau_khach: string;
  /** 0 = chưa tải logo → dùng logo đóng sẵn trong bản build. > 0 = có logo ở /uploads/thuong-hieu/. */
  logo_phien_ban: number;
  linh_vat: boolean;
};

/** Đường dẫn các bản logo server sinh ra (thiet-lap/logo.ts). `?v=` để trình duyệt bỏ bản cũ. */
export function duongDanLogo(
  loai: 'vuong-512' | 'vuong-180' | 'vuong-32' | 'den-trang' | 'chia-se',
  phienBan: number,
): string {
  const ext = loai === 'chia-se' ? 'jpg' : 'png';
  return `/uploads/thuong-hieu/${loai}.${ext}?v=${phienBan}`;
}

/** Tên ngắn nếu có, không thì tên đầy đủ. */
export function tenHienThi(th: Pick<ThuongHieuCongKhai, 'ten' | 'ten_ngan'>): string {
  return th.ten_ngan.trim() || th.ten.trim();
}

/** "Quán Cô Ba" → "Quan Co Ba" — SMS có dấu bị tính 2 tin (UCS-2 70 ký tự/tin). */
export function boDau(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// ── Thang màu ────────────────────────────────────────────────────────────────

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hexTu([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
}

/** Pha `hex` với trắng (t > 0) hoặc đen (t < 0) theo tỉ lệ |t|. */
function pha(hex: string, t: number): string {
  const dich = t > 0 ? 255 : 0;
  const k = Math.abs(t);
  return hexTu(rgb(hex).map((c) => c + (dich - c) * k) as [number, number, number]);
}

export function kenhRgb(hex: string): string {
  return rgb(hex).join(' ');
}

/** Độ tương phản WCAG giữa hai màu. */
export function doTuongPhan(a: string, b: string): number {
  const L = (hex: string) => {
    const [r, g, bl] = rgb(hex).map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [L(a), L(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** Biến CSS cho trang quản lý (khớp apps/web/src/styles/tokens.css). Màu mặc định trả ĐÚNG bảng
 *  teal đang dùng để Bà Lùn không lệch một sắc nào. */
export function bienMauAdmin(hex: string): Record<string, string> {
  const h = hex.toLowerCase();
  const thang =
    h === MAU_ADMIN_MAC_DINH
      ? { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 600: '#0d9488', 800: '#115e59', 900: '#134e4a' }
      : { 50: pha(h, 0.94), 100: pha(h, 0.84), 200: pha(h, 0.66), 600: pha(h, 0.14), 800: pha(h, -0.2), 900: pha(h, -0.36) };
  return {
    '--brand-50': thang[50],
    '--brand-100': thang[100],
    '--brand-200': thang[200],
    '--brand-600': thang[600],
    '--brand': h,
    '--brand-800': thang[800],
    '--brand-900': thang[900],
    '--brand-rgb': kenhRgb(h),
  };
}

/** Bậc 500 trang khách là chữ GIÁ TIỀN và tab đang chọn trên nền sáng — phải đạt 4.5:1 cho chữ
 *  nhỏ. Sáng hơn 10% làm cam đất / vàng nghệ / xanh lá / xanh ngọc tụt dưới 4.5 (đo 2026-11-19),
 *  nên bản sáng không đạt thì dùng luôn màu gốc. */
function bac500(h: string): string {
  const sang = pha(h, 0.1);
  return doTuongPhan(sang, '#ffffff') >= 4.5 ? sang : h;
}

/** Biến CSS cho trang khách (khớp apps/shop/src/styles/tokens.css). Mã trong bảng là bậc 600. */
export function bienMauKhach(hex: string): Record<string, string> {
  const h = hex.toLowerCase();
  const thang =
    h === MAU_KHACH_MAC_DINH
      ? { '050': '#fef6f3', 100: '#fbe4de', 500: '#cf3323', 700: '#8f1d14' }
      : { '050': pha(h, 0.95), 100: pha(h, 0.85), 500: bac500(h), 700: pha(h, -0.22) };
  return {
    '--brand-050': thang['050'],
    '--brand-100': thang[100],
    '--brand-500': thang[500],
    '--brand-600': h,
    '--brand-700': thang[700],
    '--brand-rgb': kenhRgb(h),
  };
}
