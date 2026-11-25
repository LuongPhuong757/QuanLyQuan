import { describe, expect, it } from 'vitest';
import { docGia, khoaTen, maChuaDung, phanLoaiMenu, sinhMaMon, slugNhom, type MonDangCo } from './menu-excel.js';

const NHOM = [
  { code: 'lau', name: 'Lẩu' },
  { code: 'nuoc', name: 'Đồ uống' },
];
const MON: MonDangCo[] = [
  { id: 'a', code: 'M0001', name: 'Lẩu Thái Hải Sản', group: 'lau', price: 280000 },
  { id: 'b', code: 'M0002', name: 'Bia Sài Gòn', group: 'nuoc', price: 20000 },
];

describe('docGia', () => {
  it('đọc được các cách gõ giá thường gặp', () => {
    expect(docGia(45000)).toBe(45000);
    expect(docGia('45.000')).toBe(45000);
    expect(docGia('45,000')).toBe(45000);
    expect(docGia('45000đ')).toBe(45000);
    expect(docGia(' 45 000 ')).toBe(45000);
  });
  it('ô trống là giữ nguyên (undefined), chữ là lỗi (null)', () => {
    expect(docGia(undefined)).toBeUndefined();
    expect(docGia('  ')).toBeUndefined();
    expect(docGia('ba mươi')).toBeNull();
    expect(docGia(-5)).toBeNull();
    expect(docGia(12.5)).toBeNull();
  });
});

describe('khoaTen', () => {
  it('không phân biệt hoa thường và khoảng trắng thừa, nhưng phân biệt dấu', () => {
    expect(khoaTen('  BIA   sài gòn ')).toBe(khoaTen('Bia Sài Gòn'));
    expect(khoaTen('Bò')).not.toBe(khoaTen('Bơ'));
  });
});

describe('phanLoaiMenu', () => {
  it('khớp theo tên, chỉ đổi giá/nhóm khi khác', () => {
    const kq = phanLoaiMenu(
      [
        { dong: 2, ten: 'lẩu thái hải sản', gia: '299.000' },
        { dong: 3, ten: 'Bia Sài Gòn', gia: 20000, nhom: 'đồ uống' },
      ],
      MON,
      NHOM,
    );
    expect(kq.doi).toEqual([
      { dong: 2, id: 'a', ten: 'Lẩu Thái Hải Sản', gia_cu: 280000, gia_moi: 299000, nhom_cu: 'Lẩu' },
    ]);
    expect(kq.khong_doi).toBe(1);
    expect(kq.moi).toHaveLength(0);
  });

  it('ô trống là GIỮ NGUYÊN — không bao giờ ra lệnh xoá', () => {
    const kq = phanLoaiMenu([{ dong: 2, ten: 'Bia Sài Gòn', gia: '', nhom: '' }], MON, NHOM);
    expect(kq.doi).toHaveLength(0);
    expect(kq.khong_doi).toBe(1);
  });

  it('món mới cần đủ giá và nhóm; nhóm có sẵn lấy đúng tên đang có', () => {
    const kq = phanLoaiMenu(
      [
        { dong: 2, ten: 'Mực nướng sa tế', gia: 129000, nhom: 'NƯỚNG' },
        { dong: 3, ten: 'Trà đá', gia: 5000, nhom: 'đồ UỐNG', don_vi: 'cốc' },
        { dong: 4, ten: 'Nghêu hấp', nhom: 'Hải sản' },
        { dong: 5, ten: 'Gỏi cuốn', gia: 30000 },
      ],
      MON,
      NHOM,
    );
    expect(kq.moi).toEqual([
      { dong: 2, ma: null, ten: 'Mực nướng sa tế', gia: 129000, nhom: 'NƯỚNG', don_vi: 'phần' },
      { dong: 3, ma: null, ten: 'Trà đá', gia: 5000, nhom: 'Đồ uống', don_vi: 'cốc' },
    ]);
    expect(kq.loi.map((l) => [l.dong, l.ly_do])).toEqual([
      [4, 'Món mới cần Giá'],
      [5, 'Món mới cần Nhóm'],
    ]);
  });

  it('báo lỗi theo dòng: giá chữ, trùng tên trong file, thiếu tên', () => {
    const kq = phanLoaiMenu(
      [
        { dong: 2, ten: 'Gỏi cuốn', gia: 'ba mươi', nhom: 'Khai vị' },
        { dong: 3, ten: 'Chả giò', gia: 40000, nhom: 'Khai vị' },
        { dong: 4, ten: 'chả  giò', gia: 45000, nhom: 'Khai vị' },
        { dong: 5, gia: 1000 },
      ],
      MON,
      NHOM,
    );
    expect(kq.loi.map((l) => l.dong)).toEqual([2, 4, 5]);
    expect(kq.loi[1].ly_do).toBe('Trùng tên với dòng 3');
    expect(kq.moi.map((m) => m.dong)).toEqual([3]);
  });

  it('có cột Mã thì khớp theo mã trước', () => {
    const kq = phanLoaiMenu([{ dong: 2, ma: 'M0002', ten: 'Bia Sài Gòn', gia: 22000 }], MON, NHOM);
    expect(kq.doi[0]).toMatchObject({ id: 'b', gia_moi: 22000 });
  });

  it('menu có 2 món cùng tên thì bắt điền mã', () => {
    const trung = [...MON, { id: 'c', code: 'X1', name: 'bia sài gòn', group: 'nuoc', price: 25000 }];
    const kq = phanLoaiMenu([{ dong: 2, ten: 'Bia Sài Gòn', gia: 22000 }], trung, NHOM);
    expect(kq.loi[0].ly_do).toContain('điền cột Mã');
  });

  it('nhập lại cùng file lần 2 thì 0 mới, 0 đổi', () => {
    const kq = phanLoaiMenu(
      [
        { dong: 2, ten: 'Lẩu Thái Hải Sản', gia: 280000, nhom: 'Lẩu' },
        { dong: 3, ten: 'Bia Sài Gòn', gia: 20000, nhom: 'Đồ uống' },
      ],
      MON,
      NHOM,
    );
    expect(kq.moi).toHaveLength(0);
    expect(kq.doi).toHaveLength(0);
    expect(kq.khong_doi).toBe(2);
  });
});

describe('mã tự sinh', () => {
  it('slugNhom bỏ dấu, giới hạn 16 ký tự', () => {
    expect(slugNhom('Món chính')).toBe('mon-chinh');
    expect(slugNhom('Đồ uống có cồn các loại')).toBe('do-uong-co-con-c');
    expect(slugNhom('!!!')).toBe('nhom');
  });
  it('maChuaDung thêm hậu tố khi trùng', () => {
    expect(maChuaDung('lau', new Set(['lau', 'lau-2']), 16)).toBe('lau-3');
  });
  it('sinhMaMon bỏ qua mã đã có và ghi nhận mã vừa cấp', () => {
    const daDung = new Set(['M0001', 'M0003']);
    expect(sinhMaMon(daDung)).toBe('M0002');
    expect(sinhMaMon(daDung)).toBe('M0004');
  });
});
