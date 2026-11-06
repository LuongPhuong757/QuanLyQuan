import { describe, expect, it } from 'vitest';
import { formatAge } from './item-age.ts';

describe('formatAge', () => {
  it('dưới một tiếng thì chỉ có phút', () => {
    expect(formatAge(0)).toBe('0p');
    expect(formatAge(1)).toBe('1p');
    expect(formatAge(45)).toBe('45p');
    expect(formatAge(59)).toBe('59p');
  });

  // Chính là thứ chủ quán yêu cầu: 61 phút phải đọc ra "hơn một tiếng" ngay, không phải nhẩm.
  it('61 phút → 1g01, không phải 61p', () => {
    expect(formatAge(61)).toBe('1g01');
  });

  it('tròn giờ ghi :00 (2g00)', () => {
    expect(formatAge(60)).toBe('1g00');
    expect(formatAge(120)).toBe('2g00');
    expect(formatAge(180)).toBe('3g00');
  });

  it('lẻ phút sau giờ tròn', () => {
    expect(formatAge(65)).toBe('1g05');
    expect(formatAge(119)).toBe('1g59');
    expect(formatAge(125)).toBe('2g05');
  });

  // Ranh giới 59/60 là chỗ dễ lệch một phút nhất.
  it('đúng mốc 60 mới đổi sang giờ', () => {
    expect(formatAge(59)).toBe('59p');
    expect(formatAge(60)).toBe('1g00');
  });

  // Lệch giờ client/server cho ra số âm — `ageMinutes` đã chặn, nhưng hàm này nhận số từ 3 chỗ
  // gọi khác nhau (một chỗ tự tính lấy) nên phải tự đứng vững.
  it('số âm hoặc lẻ thập phân không làm vỡ chữ', () => {
    expect(formatAge(-5)).toBe('0p');
    expect(formatAge(61.9)).toBe('1g01');
    expect(formatAge(59.9)).toBe('59p');
  });

  it('ca dài bất thường vẫn đọc được, không quy sang ngày', () => {
    expect(formatAge(600)).toBe('10g00');
    expect(formatAge(1445)).toBe('24g05');
  });
});
