// Thương hiệu theo quán ở trang QUẢN LÝ (2026-11-19, docs/THIET-LAP-QUAN-SPEC.md §8c).
//
// Nguồn dữ liệu, theo thứ tự:
//   1. `window.__THUONG_HIEU__` — production: API chèn sẵn vào index.html (main.ts →
//      thiet-lap/html-thuong-hieu.ts), nên lần vẽ ĐẦU TIÊN đã đúng tên/màu, không nháy tên cũ.
//   2. `GET /auth/thuong-hieu` — luôn gọi thêm để cập nhật (máy dev không có bước 1; vừa đổi ở màn
//      Thiết lập thì gọi `taiLaiThuongHieu()`). Tiền tố /auth vì proxy dev của web là danh sách
//      cứng không có /api (CLAUDE.md §5).
//
// Không có dữ liệu (API lỗi) → giữ MẶC ĐỊNH = đúng Bà Lùn hiện tại, để không bao giờ trắng tên.
import { useSyncExternalStore } from 'react';
import {
  bienMauAdmin,
  duongDanLogo,
  MAU_ADMIN_MAC_DINH,
  MAU_KHACH_MAC_DINH,
  tenHienThi,
  type ThuongHieuCongKhai,
} from '@order/schemas';
import { api } from './api.ts';

declare global {
  interface Window {
    __THUONG_HIEU__?: ThuongHieuCongKhai;
  }
}

/** Logo đóng sẵn trong bản build (public/) — dùng khi quán chưa tải logo. */
const LOGO_DONG_SAN = '/favicon.svg';

const MAC_DINH: ThuongHieuCongKhai = {
  ten: 'Quán Bà Lùn',
  ten_ngan: 'Bà Lùn',
  mau_admin: MAU_ADMIN_MAC_DINH,
  mau_khach: MAU_KHACH_MAC_DINH,
  logo_phien_ban: 0,
  linh_vat: true,
};

let hienTai: ThuongHieuCongKhai = (typeof window !== 'undefined' && window.__THUONG_HIEU__) || MAC_DINH;
const nguoiNghe = new Set<() => void>();

function datLinkIcon(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  if (el.getAttribute('href') !== href) {
    el.removeAttribute('type'); // favicon.svg khai type svg — logo tải lên là png
    el.href = href;
  }
}

/** Ghi biến màu lên :root + favicon. Gọi lại vô hại. */
function ap(th: ThuongHieuCongKhai) {
  const goc = document.documentElement.style;
  for (const [k, v] of Object.entries(bienMauAdmin(th.mau_admin))) goc.setProperty(k, v);
  if (th.logo_phien_ban > 0) {
    datLinkIcon('icon', duongDanLogo('vuong-32', th.logo_phien_ban));
    datLinkIcon('apple-touch-icon', duongDanLogo('vuong-180', th.logo_phien_ban));
  }
}

function dat(th: ThuongHieuCongKhai) {
  hienTai = th;
  ap(th);
  nguoiNghe.forEach((f) => f());
}

export async function taiLaiThuongHieu(): Promise<void> {
  try {
    const r = await api.get<{ data: ThuongHieuCongKhai }>('/auth/thuong-hieu');
    if (r.data?.data && typeof r.data.data.ten === 'string') dat(r.data.data);
  } catch {
    /* giữ bản đang có — tên/màu cũ còn hơn trắng */
  }
}

/** Gọi MỘT lần ở main.tsx, trước khi render. */
export function khoiDongThuongHieu(): void {
  ap(hienTai);
  void taiLaiThuongHieu();
}

export function layThuongHieu(): ThuongHieuCongKhai {
  return hienTai;
}

export function useThuongHieu(): ThuongHieuCongKhai {
  return useSyncExternalStore(
    (f) => {
      nguoiNghe.add(f);
      return () => nguoiNghe.delete(f);
    },
    () => hienTai,
    () => hienTai,
  );
}

/** Tên đầy đủ — hoá đơn, màn đăng nhập. Rỗng (quán mới chưa đặt) → "Quán của bạn". */
export function tenDayDu(th: ThuongHieuCongKhai): string {
  return th.ten.trim() || 'Quán của bạn';
}

/** Tên ngắn — tab trình duyệt, thanh bên. */
export function tenNgan(th: ThuongHieuCongKhai): string {
  return tenHienThi(th) || 'Quán của bạn';
}

/** Ảnh logo vuông cho thanh bên / màn đăng nhập. */
export function logoVuong(th: ThuongHieuCongKhai): string {
  return th.logo_phien_ban > 0 ? duongDanLogo('vuong-180', th.logo_phien_ban) : LOGO_DONG_SAN;
}
