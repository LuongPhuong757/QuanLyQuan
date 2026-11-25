// Thương hiệu theo quán ở trang KHÁCH (2026-11-19, docs/THIET-LAP-QUAN-SPEC.md §8c).
// Cùng hợp đồng với apps/web/src/lib/thuong-hieu.ts — khác: endpoint `/api/public/thuong-hieu`,
// biến màu của trang khách (`bienMauKhach`), logo đóng sẵn là logo-144.webp.
//
// Nguồn: `window.__THUONG_HIEU__` (API chèn vào index.html trên production — lần vẽ đầu đã đúng),
// rồi gọi API để cập nhật. API lỗi → giữ MẶC ĐỊNH = đúng Bà Lùn hiện tại.
import { useSyncExternalStore } from 'react';
import {
  bienMauKhach,
  duongDanLogo,
  MAU_ADMIN_MAC_DINH,
  MAU_KHACH_MAC_DINH,
  tenHienThi,
  type ThuongHieuCongKhai,
} from '@order/schemas';

declare global {
  interface Window {
    __THUONG_HIEU__?: ThuongHieuCongKhai;
  }
}

const LOGO_DONG_SAN = '/logo-144.webp';

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
    el.removeAttribute('type');
    el.href = href;
  }
}

function ap(th: ThuongHieuCongKhai) {
  const goc = document.documentElement.style;
  for (const [k, v] of Object.entries(bienMauKhach(th.mau_khach))) goc.setProperty(k, v);
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

async function taiLai(): Promise<void> {
  try {
    const r = await fetch('/api/public/thuong-hieu', { headers: { Accept: 'application/json' } });
    if (!r.ok) return;
    const j = (await r.json()) as { data?: ThuongHieuCongKhai };
    if (j.data && typeof j.data.ten === 'string') dat(j.data);
  } catch {
    /* giữ bản đang có */
  }
}

/** Gọi MỘT lần ở main.tsx, trước khi render. */
export function khoiDongThuongHieu(): void {
  ap(hienTai);
  void taiLai();
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

export function tenDayDu(th: ThuongHieuCongKhai): string {
  return th.ten.trim() || 'Quán ăn';
}

export function tenNgan(th: ThuongHieuCongKhai): string {
  return tenHienThi(th) || 'Quán ăn';
}

/** Logo nhỏ đầu trang (hiện ~36–40px). */
export function logoNho(th: ThuongHieuCongKhai): string {
  return th.logo_phien_ban > 0 ? duongDanLogo('vuong-180', th.logo_phien_ban) : LOGO_DONG_SAN;
}
