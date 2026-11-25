import { describe, expect, it } from 'vitest';
import {
  BANG_MAU_ADMIN,
  BANG_MAU_KHACH,
  bienMauAdmin,
  bienMauKhach,
  boDau,
  doTuongPhan,
  type ThuongHieuCongKhai,
} from '@order/schemas';
import { chenThuongHieu } from './html-thuong-hieu.js';
import { buildOtpSms } from '../public/otp-sms.js';
import { buildEscalationSms } from '../notifications/channels/sms-channel.js';

describe('bảng màu', () => {
  it('chữ trắng trên MỌI màu trong bảng đạt ≥ 4.5:1 (người lớn tuổi đọc được chữ trên nút)', () => {
    for (const m of [...BANG_MAU_ADMIN, ...BANG_MAU_KHACH]) {
      expect(doTuongPhan(m.hex, '#ffffff'), m.ten).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('chữ giá tiền (bậc 500 trang khách) cũng đạt 4.5:1 với mọi màu', () => {
    for (const m of BANG_MAU_KHACH) {
      expect(doTuongPhan(bienMauKhach(m.hex)['--brand-500'], '#ffffff'), m.ten).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('màu mặc định trả ĐÚNG bảng teal / đỏ ớt đang dùng — Bà Lùn không lệch sắc nào', () => {
    expect(bienMauAdmin('#0f766e')).toMatchObject({ '--brand-50': '#f0fdfa', '--brand-800': '#115e59', '--brand-rgb': '15 118 110' });
    expect(bienMauKhach('#B82A1E')).toMatchObject({ '--brand-500': '#cf3323', '--brand-700': '#8f1d14', '--brand-rgb': '184 42 30' });
  });

  it('bảng màu quản lý không có đỏ / cam / xanh lá (dành cho lỗi / cảnh báo / xong)', () => {
    const ten = BANG_MAU_ADMIN.map((m) => m.ten.toLowerCase()).join(' ');
    expect(ten).not.toMatch(/đỏ|cam|xanh lá/);
  });
});

const HTML = `<html><head>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <title>Quán Bà Lùn — Đặt hàng</title>
    <meta
      name="description"
      content="Đặt món online tại Quán Bà Lùn — giao tận nơi."
    />
    <meta property="og:title" content="Quán Bà Lùn — Đặt hàng online" />
    <meta property="og:image" content="https://quanbalun.site/og-image.jpg?v=2" />
    <meta property="og:image:secure_url" content="https://quanbalun.site/og-image.jpg?v=2" />
  </head><body></body></html>`;

const TH: ThuongHieuCongKhai = {
  ten: 'Quán Cô Ba',
  ten_ngan: 'Cô Ba',
  mau_admin: '#1d4ed8',
  mau_khach: '#c2410c',
  logo_phien_ban: 3,
  linh_vat: false,
};

describe('chenThuongHieu', () => {
  it('trang khách: tiêu đề + mô tả + og theo quán, ảnh chia sẻ là URL tuyệt đối', () => {
    const out = chenThuongHieu(HTML, TH, { app: 'shop', origin: 'https://coba.vn' });
    expect(out).toContain('<title>Quán Cô Ba — Đặt hàng</title>');
    expect(out).toContain('content="Đặt món online tại Quán Cô Ba');
    expect(out).toContain('property="og:title" content="Quán Cô Ba — Đặt hàng online"');
    expect(out).toContain('property="og:image" content="https://coba.vn/uploads/thuong-hieu/chia-se.jpg?v=3"');
    expect(out).toContain('og:image:secure_url" content="https://coba.vn/uploads/thuong-hieu/chia-se.jpg?v=3"');
    expect(out).toContain('rel="icon" href="/uploads/thuong-hieu/vuong-32.png?v=3"');
    expect(out).not.toContain('Bà Lùn');
  });

  it('trang quản lý: tab "Admin · <tên ngắn>"', () => {
    const out = chenThuongHieu('<head><title>Admin · Quán Bà Lùn</title></head>', TH, { app: 'web', origin: 'x' });
    expect(out).toContain('<title>Admin · Cô Ba</title>');
  });

  it('quán chưa đặt tên + chưa có logo → giữ nguyên chữ/ảnh của bản build', () => {
    const out = chenThuongHieu(HTML, { ...TH, ten: '', ten_ngan: '', logo_phien_ban: 0 }, { app: 'shop', origin: 'x' });
    expect(out).toContain('<title>Quán Bà Lùn — Đặt hàng</title>');
    expect(out).toContain('og-image.jpg?v=2');
    expect(out).toContain('href="/favicon.svg"');
  });

  it('chèn dữ liệu cho React, tên chứa </script> không thoát được khỏi thẻ', () => {
    const out = chenThuongHieu(HTML, { ...TH, ten: 'Quán </script><script>alert(1)' }, { app: 'shop', origin: 'x' });
    expect(out).toContain('window.__THUONG_HIEU__=');
    expect(out).not.toContain('</script><script>alert(1)');
    expect(out).toContain('<title>Quán &lt;/script&gt;&lt;script&gt;alert(1) — Đặt hàng</title>');
  });
});

describe('SMS theo tên quán (tự bỏ dấu)', () => {
  it('boDau', () => {
    expect(boDau('Quán Cô Ba Đồng Khởi')).toBe('Quan Co Ba Dong Khoi');
  });
  it('OTP mặc định thay {quan}; mẫu eSMS đã duyệt không có {quan} thì gửi y nguyên', () => {
    expect(buildOtpSms('123456', undefined, 'Quán Cô Ba')).toContain('Quan Co Ba khong bao gio hoi ma nay');
    expect(buildOtpSms('123456')).toContain('Quan Ba Lun khong bao gio');
    expect(buildOtpSms('123456', 'Ma OTP {code} cua ban')).toBe('Ma OTP 123456 cua ban');
  });
  it('tin báo đơn chờ mang tên quán không dấu', () => {
    expect(buildEscalationSms({ waitingSeconds: 90, pendingCount: 2, tenQuan: 'Quán Cô Ba' })).toMatch(/^Quan Co Ba: có 2 đơn/);
  });
});
