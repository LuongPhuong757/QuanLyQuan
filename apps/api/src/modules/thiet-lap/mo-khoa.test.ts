import { describe, expect, it } from 'vitest';
import { docVe, kyVe, MO_KHOA_TTL_MS } from './mo-khoa.js';
import { tinhTrangThai, type DuLieuTrangThai } from './trang-thai.js';

const SECRET = 'bi-mat-test';
const NOW = 1_800_000_000_000;

describe('vé mở khoá', () => {
  const ve = { sub: 'u1', boi: 'Cô Ba', exp: NOW + MO_KHOA_TTL_MS };
  const token = kyVe(ve, SECRET);

  it('vé hợp lệ đọc ra đúng người mở khoá', () => {
    expect(docVe(token, SECRET, NOW, 'u1')).toEqual(ve);
  });
  it('hết hạn sau 15 phút', () => {
    expect(docVe(token, SECRET, NOW + MO_KHOA_TTL_MS, 'u1')).toBeNull();
  });
  it('chép vé sang phiên đăng nhập khác là vô dụng', () => {
    expect(docVe(token, SECRET, NOW, 'u2')).toBeNull();
  });
  it('sửa nội dung vé hoặc sai khoá ký là bị từ chối', () => {
    const [payload, sig] = token.split('.');
    const gia = Buffer.from(JSON.stringify({ ...ve, exp: NOW + 10 * MO_KHOA_TTL_MS })).toString('base64url');
    expect(docVe(`${gia}.${sig}`, SECRET, NOW, 'u1')).toBeNull();
    expect(docVe(token, 'khoa-khac', NOW, 'u1')).toBeNull();
    expect(docVe(`${payload}`, SECRET, NOW, 'u1')).toBeNull();
    expect(docVe(undefined, SECRET, NOW, 'u1')).toBeNull();
  });
});

const TRONG: DuLieuTrangThai = {
  store_name: '',
  store_phone: '',
  store_address: '',
  chu_quan: null,
  so_ban: 0,
  so_mon: 0,
  so_nhom: 0,
  ngan_hang: [],
  so_nhan_vien: 0,
  printing_enabled: false,
  printer_host: '',
  printer_connection: 'LAN',
  open_hours_count: 0,
  online_ordering_enabled: false,
  table_ordering_enabled: false,
  thuong_hieu: { ten: '', ten_ngan: '', mau_admin: '#0f766e', mau_khach: '#b82a1e', logo_phien_ban: 0, linh_vat: true },
};

describe('tinhTrangThai', () => {
  it('DB trống: thiếu đủ 5 mục bắt buộc', () => {
    const tt = tinhTrangThai(TRONG);
    expect(tt.san_sang).toBe(false);
    expect(tt.con_thieu).toBe(5);
    expect(tt.muc).toHaveLength(10);
  });

  it('đủ 5 mục bắt buộc là sẵn sàng bán, mục tuỳ chọn không chặn', () => {
    const tt = tinhTrangThai({
      ...TRONG,
      store_name: 'Quán Cô Ba',
      store_phone: '0909123456',
      chu_quan: { full_name: 'Cô Ba', username: 'co.ba' },
      so_ban: 20,
      so_mon: 47,
      so_nhom: 6,
      ngan_hang: [{ bank_name: 'Vietcombank', account_no: '0011004821', account_name: 'NGUYEN THI BA' }],
    });
    expect(tt.san_sang).toBe(true);
    expect(tt.muc.find((m) => m.ma === 'ngan-hang')?.tom_tat).toBe('Vietcombank · …4821 · NGUYEN THI BA');
  });

  it('có tên quán nhưng thiếu số điện thoại vẫn chưa xong', () => {
    const tt = tinhTrangThai({ ...TRONG, store_name: 'Quán Cô Ba' });
    const m = tt.muc.find((x) => x.ma === 'thong-tin')!;
    expect(m.xong).toBe(false);
    expect(m.tom_tat).toBe('Quán Cô Ba · chưa có số điện thoại');
  });
});
