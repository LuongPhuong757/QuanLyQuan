import { describe, expect, it } from 'vitest';
import { docBang, nhanCot } from './thiet-lap-excel.ts';

describe('nhanCot', () => {
  it('nhận tiêu đề có dấu, không dấu, tiếng Anh', () => {
    expect(nhanCot('Tên món')).toBe('ten');
    expect(nhanCot('TEN MON')).toBe('ten');
    expect(nhanCot('Giá bán')).toBe('gia');
    expect(nhanCot('ĐVT')).toBe('don_vi');
    expect(nhanCot('Danh mục')).toBe('nhom');
    expect(nhanCot('code')).toBe('ma');
    expect(nhanCot('Ghi chú')).toBeNull();
  });
});

describe('docBang', () => {
  it('ô trống không được gửi đi (server hiểu là giữ nguyên)', () => {
    const { dongs, thieuCotTen } = docBang([
      { 'Tên món': 'Bia Sài Gòn', 'Giá': 22000, 'Nhóm': '', 'Ghi chú': 'x' },
      { 'Tên món': '', 'Giá': '', 'Nhóm': '', 'Ghi chú': '' },
      { 'Tên món': ' Trà đá ', 'Giá': '5.000', 'Nhóm': 'Đồ uống', 'Ghi chú': '' },
    ]);
    expect(thieuCotTen).toBe(false);
    expect(dongs).toEqual([
      { dong: 2, ten: 'Bia Sài Gòn', gia: 22000 },
      { dong: 4, ten: 'Trà đá', gia: '5.000', nhom: 'Đồ uống' },
    ]);
  });

  it('báo khi file không có cột tên món', () => {
    expect(docBang([{ 'Giá': 1000 }]).thieuCotTen).toBe(true);
  });
});
