import { useState, type CSSProperties, type JSX } from 'react';
import type { ThuongHieuCongKhai } from '@order/schemas';
import { logoNho, tenDayDu, tenNgan, useThuongHieu } from '../lib/thuong-hieu.ts';

/**
 * Logo quán: ảnh logo + wordmark chữ nằm cạnh nhau (tên + logo theo thương hiệu của quán, 2026-11-19).
 *
 * Ảnh lấy từ `apps/shop/public/logo.jpg` — chủ quán xác nhận đây là logo shop
 * (chốt 2026-07-30), cùng file với `apps/web/public/logo.jpg` bên trang admin.
 * Giữ 2 bản riêng thay vì import chéo: mỗi app build và deploy độc lập, dùng
 * chung file qua đường dẫn tương đối sẽ vỡ khi build.
 *
 * NẾU file bị thiếu, component tự rơi về monogram "BL" tự vẽ — không bao giờ
 * để lộ icon ảnh vỡ ra trang khách.
 *
 * Phần chữ dựng theo biển phấn đen trong ảnh lẩu hải sản của quán: "QUÁN" nhỏ,
 * giãn chữ, nằm trên "BÀ LÙN" lớn đậm. Là chữ nên nét luôn sạch ở mọi mật độ
 * điểm ảnh, không cần @2x/@3x.
 *
 * CHÚ Ý VỀ FONT: `--font-display` khai báo 'Baloo 2' nhưng font đó CHƯA được
 * self-host (chưa có apps/shop/public/fonts/ + fonts.css — xem ghi chú trong
 * tokens.css). Hiện wordmark rơi về font hệ thống. Khi nạp Baloo 2 xong, chữ sẽ
 * bo tròn ấm hơn, không cần sửa file này.
 */

// Ảnh logo: `logoNho(th)` — quán chưa tải logo thì là `/logo-144.webp` đóng sẵn, bản thu nhỏ 144px
// webp (~6KB) của `logo.jpg` (1633×1920, 85KB). Logo chỉ hiện ~40px, ×3 màn sắc nét = 120px là đủ —
// tải ảnh gốc là 85KB cho một chấm tròn, nặng hơn 4 ảnh món cộng lại (đo 2026-10-30).

/** Tên ngắn dài hơn mức này thì cho xuống dòng + thu chữ, kẻo đẩy tràn hàng nút ở header 360px. */
const TEN_DAI = 12;

/**
 * Tách tên thành dòng nhỏ phía trên ("QUÁN") + dòng lớn ("Bà Lùn"), giữ đúng dáng biển phấn cũ.
 *  - Tên ngắn tự bắt đầu bằng "Quán …" → dòng nhỏ "Quán", dòng lớn phần còn lại.
 *  - Tên ngắn là đuôi của tên đầy đủ ("Quán Bà Lùn" / "Bà Lùn") → dòng nhỏ là phần đầu ("Quán").
 *  - Còn lại → không có dòng nhỏ: đặt chữ "Quán" lên một "Nhà hàng X" là sai tên người ta.
 */
function tachTen(th: ThuongHieuCongKhai): { tren: string; duoi: string } {
  const ngan = tenNgan(th);
  const m = /^quán\s+(.+)$/iu.exec(ngan);
  if (m) return { tren: 'Quán', duoi: m[1] };
  const day = tenDayDu(th);
  if (day !== ngan && day.endsWith(` ${ngan}`)) return { tren: day.slice(0, -ngan.length).trim(), duoi: ngan };
  return { tren: '', duoi: ngan };
}

type Props = {
  /** `plaque` = biển gỗ đậm (dùng ở header). `bare` = chữ trần trên nền sáng. */
  variant?: 'plaque' | 'bare';
  /** Chiều cao dòng "BÀ LÙN" — token cỡ chữ, mặc định --fs-md. */
  size?: string;
  /** Đặt `false` để chỉ hiện chữ (ví dụ chỗ hẹp, hoặc trang in). */
  withLogo?: boolean;
};

export function Wordmark({
  variant = 'plaque',
  size = 'var(--fs-md)',
  withLogo = true,
}: Props): JSX.Element {
  const onDark = variant === 'plaque';
  // `logoBroken` chỉ bật khi trình duyệt thực sự tải ảnh thất bại (404 vì chủ
  // quán chưa đặt file, hoặc file hỏng) — không đoán trước bằng cách nào khác.
  const [logoBroken, setLogoBroken] = useState(false);
  const th = useThuongHieu();
  const { tren, duoi } = tachTen(th);
  const dai = duoi.length > TEN_DAI;

  return (
    <span style={variant === 'plaque' ? plaque : bare} role="img" aria-label={tenDayDu(th)}>
      {withLogo &&
        (logoBroken ? (
          <span aria-hidden="true" style={monogram}>
            {chuCaiDau(duoi)}
          </span>
        ) : (
          <img
            src={logoNho(th)}
            alt=""
            aria-hidden="true"
            width={40}
            height={40}
            decoding="async"
            onError={() => setLogoBroken(true)}
            style={logoImg}
          />
        ))}

      <span style={textStack}>
        {tren && (
          <span style={{ ...kicker, color: onDark ? 'var(--wood-400)' : 'var(--wood-700)' }}>
            {tren}
          </span>
        )}
        <span
          style={{
            ...name,
            ...(dai ? nameDai : null),
            fontSize: dai ? `calc(${size} * 0.8)` : size,
            color: onDark ? 'var(--text-on-wood)' : 'var(--brand-600)',
          }}
        >
          {duoi}
        </span>
      </span>
    </span>
  );
}

/** Monogram khi ảnh logo lỗi: chữ cái đầu của 2 từ đầu ("Bà Lùn" → "BL"). */
function chuCaiDau(ten: string): string {
  return ten
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toLocaleUpperCase('vi') ?? '')
    .join('');
}

const base: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--sp-2)',
  lineHeight: 'var(--lh-tight)',
  // Không cho chữ bị chọn/kéo khi khách bấm nhanh 2 lần trên mobile.
  userSelect: 'none',
};

const plaque: CSSProperties = {
  ...base,
  padding: 'var(--sp-2) var(--sp-3)',
  borderRadius: 'var(--r-card)',
  background: 'var(--bg-wood)',
  // Viền hổ phách mảnh = đường khắc trên biển gỗ trong ảnh quán.
  boxShadow: 'inset 0 0 0 1px var(--wood-500)',
};

const bare: CSSProperties = base;

const textStack: CSSProperties = {
  display: 'inline-flex',
  // Cho cột chữ co lại được trong hàng flex của header — không thì tên dài đội cả hàng ra ngoài.
  minWidth: 0,
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'center',
};

const logoBox: CSSProperties = {
  width: 'var(--size-brand-logo)',
  height: 'var(--size-brand-logo)',
  flexShrink: 0,
  borderRadius: 'var(--r-badge)',
};

const logoImg: CSSProperties = {
  ...logoBox,
  // `cover` để logo vuông hay chữ nhật đều lấp kín vòng tròn, không viền trắng.
  objectFit: 'cover',
  // Logo hiện là ảnh dọc, chủ thể nằm nửa trên — crop giữa sẽ cắt mất phần
  // đầu, nên đẩy khung crop lên 35%.
  objectPosition: 'center 35%',
  display: 'block',
};

const monogram: CSSProperties = {
  ...logoBox,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg-wood)',
  color: 'var(--wood-400)',
  fontFamily: 'var(--font-display)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-heavy)' as unknown as number,
  letterSpacing: 'var(--ls-tight)',
  boxShadow: 'inset 0 0 0 1px var(--wood-500)',
};

const kicker: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'var(--fs-caption)',
  fontWeight: 'var(--fw-semibold)' as unknown as number,
  letterSpacing: 'var(--ls-wide)',
  textTransform: 'uppercase',
};

const name: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 'var(--fw-heavy)' as unknown as number,
  letterSpacing: 'var(--ls-tight)',
  whiteSpace: 'nowrap',
};

/** Tên dài: được xuống dòng (tối đa 2 dòng), cắt "…" nếu vẫn quá — bố cục header không vỡ. */
const nameDai: CSSProperties = {
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  lineHeight: 1.15,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};
