// Chèn thương hiệu quán vào index.html lúc API trả trang (2026-11-19, spec §8c T-10).
//
// Vì sao ở SERVER: Facebook/Zalo đọc thẻ `og:*` mà KHÔNG chạy JavaScript — đổi tiêu đề bằng React
// thì link dán lên vẫn ra "Quán Bà Lùn" của bản build. Production đã có sẵn chỗ để làm: mọi request
// đi qua API, API đọc index.html rồi gửi (main.ts, M2.D-66). Ở đó thay vài thẻ là đủ, không cần
// build riêng theo quán.
//
// Kèm `window.__THUONG_HIEU__` để lần vẽ đầu tiên của React đã đúng tên/màu (không nháy tên cũ).
//
// Module thuần: không Nest/DB, test bằng chuỗi.
import {
  duongDanLogo,
  MAU_ADMIN_MAC_DINH,
  MAU_KHACH_MAC_DINH,
  tenHienThi,
  type ThuongHieuCongKhai,
} from '@order/schemas';

/** Đọc thương hiệu từ bản cài đặt đã parse (SettingsService.readAll()). */
export function thuongHieuTuCaiDat(s: {
  store_name: string;
  store_short_name: string;
  brand_color_admin: string;
  brand_color_shop: string;
  brand_logo_version: number;
  mascots_enabled: boolean;
}): ThuongHieuCongKhai {
  return {
    ten: s.store_name ?? '',
    ten_ngan: s.store_short_name ?? '',
    mau_admin: s.brand_color_admin || MAU_ADMIN_MAC_DINH,
    mau_khach: s.brand_color_shop || MAU_KHACH_MAC_DINH,
    logo_phien_ban: Number(s.brand_logo_version) || 0,
    linh_vat: s.mascots_enabled !== false,
  };
}

function thoatThuocTinh(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Thay `content="…"` của thẻ meta có name/property = `khoa`. Không có thẻ → giữ nguyên HTML. */
function datMeta(html: string, khoa: string, giaTri: string): string {
  const re = new RegExp(`<meta\\b(?=[^>]*\\b(?:name|property)="${khoa.replace(/[.:]/g, '\\$&')}")[^>]*>`, 'g');
  return html.replace(re, (the) => the.replace(/content="[^"]*"/, `content="${thoatThuocTinh(giaTri)}"`));
}

/** Thay href của `<link rel="…">`, bỏ `type` (favicon.svg khai type svg, logo tải lên là png). */
function datLink(html: string, rel: string, href: string): string {
  const re = new RegExp(`<link\\b(?=[^>]*\\brel="${rel}")[^>]*>`, 'g');
  return html.replace(re, (the) =>
    the.replace(/\s+type="[^"]*"/, '').replace(/href="[^"]*"/, `href="${thoatThuocTinh(href)}"`),
  );
}

function datTitle(html: string, tieuDe: string): string {
  return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${thoatThuocTinh(tieuDe)}</title>`);
}

export function chenThuongHieu(
  html: string,
  th: ThuongHieuCongKhai,
  opts: { app: 'web' | 'shop'; origin: string },
): string {
  let out = html;
  const ten = th.ten.trim();
  const ngan = tenHienThi(th);

  // Quán chưa đặt tên (DB mới) → giữ chữ của bản build, chỉ chèn dữ liệu cho React.
  if (ten) {
    if (opts.app === 'web') {
      out = datTitle(out, `Admin · ${ngan}`);
    } else {
      const moTa = `Đặt món online tại ${ten} — giao tận nơi hoặc tự đến lấy, theo dõi đơn theo thời gian thực.`;
      out = datTitle(out, `${ten} — Đặt hàng`);
      out = datMeta(out, 'description', moTa);
      out = datMeta(out, 'og:site_name', ten);
      out = datMeta(out, 'og:title', `${ten} — Đặt hàng online`);
      out = datMeta(out, 'og:description', moTa);
      out = datMeta(out, 'og:image:alt', `Logo ${ten}`);
      out = datMeta(out, 'og:url', `${opts.origin}/`);
      out = datMeta(out, 'twitter:title', `${ten} — Đặt hàng online`);
      out = datMeta(out, 'twitter:description', moTa);
    }
  }

  if (th.logo_phien_ban > 0) {
    out = datLink(out, 'icon', duongDanLogo('vuong-32', th.logo_phien_ban));
    out = datLink(out, 'apple-touch-icon', duongDanLogo('vuong-180', th.logo_phien_ban));
    if (opts.app === 'shop') {
      const anh = `${opts.origin}${duongDanLogo('chia-se', th.logo_phien_ban)}`;
      out = datMeta(out, 'og:image', anh);
      out = datMeta(out, 'og:image:secure_url', anh);
      out = datMeta(out, 'twitter:image', anh);
    }
  }

  // `<` trong JSON thoát thành <: tên quán chứa "</script>" không được thoát ra khỏi thẻ.
  const json = JSON.stringify(th).replace(/</g, '\\u003c');
  return out.replace('</head>', `<script>window.__THUONG_HIEU__=${json}</script></head>`);
}
