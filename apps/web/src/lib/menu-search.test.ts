import { describe, expect, it } from 'vitest';
import { filterMenuBySearch, menuSearchScore } from './menu-search.ts';

const MENU = [
  { code: 'M001', name: 'Khoai tây lắc' },
  { code: 'M002', name: 'Khoai tây chiên' },
  { code: 'M003', name: 'Cánh giữa chiên giòn' },
  { code: 'M004', name: 'Trà đào cam sả' },
  { code: 'M005', name: 'Cà phê sữa đá' },
  { code: 'KTL', name: 'Kem tươi lạnh' },
];

const names = (q: string) => filterMenuBySearch(MENU, q).map((i) => i.name);

describe('viết tắt', () => {
  it('ktl → khoai tây lắc', () => {
    expect(names('ktl')).toContain('Khoai tây lắc');
  });

  it('ưu tiên mã món trùng trước tên viết tắt', () => {
    expect(names('ktl')[0]).toBe('Kem tươi lạnh'); // code === 'KTL'
  });

  it('viết tắt nhiều ký tự mỗi từ', () => {
    expect(names('khtlac')).toContain('Khoai tây lắc');
    expect(names('ktchien')).toContain('Khoai tây chiên');
  });

  it('trộn viết tắt + từ đầy đủ', () => {
    expect(names('kt lac')).toContain('Khoai tây lắc');
    expect(names('kt lac')).not.toContain('Khoai tây chiên');
  });

  it('tdcs → trà đào cam sả', () => {
    expect(names('tdcs')).toEqual(['Trà đào cam sả']);
  });

  it('cfsd không khớp vì "cà" và "phê" là 2 từ', () => {
    expect(names('cfsd')).toEqual([]);
    expect(names('cpsd')).toEqual(['Cà phê sữa đá']);
  });
});

describe('gõ không dấu / đủ tên', () => {
  it('bỏ dấu vẫn ra', () => {
    expect(names('khoai tay lac')).toContain('Khoai tây lắc');
    expect(names('tra dao')).toEqual(['Trà đào cam sả']);
  });

  it('token rời không cần liền nhau', () => {
    expect(names('canh chien')).toContain('Cánh giữa chiên giòn');
  });

  it('đ → d', () => {
    expect(names('dao')).toEqual(['Trà đào cam sả']);
  });
});

describe('xếp hạng và biên', () => {
  it('khớp đầu tên đứng trên khớp giữa tên', () => {
    expect(names('chien')[0]).toBe('Khoai tây chiên');
  });

  it('query rỗng giữ nguyên thứ tự gốc', () => {
    expect(filterMenuBySearch(MENU, '   ')).toBe(MENU);
  });

  it('không khớp → rỗng', () => {
    expect(names('pizza')).toEqual([]);
  });

  it('score null khi lệch, số khi khớp', () => {
    expect(menuSearchScore(MENU[0], 'pizza')).toBeNull();
    expect(menuSearchScore(MENU[0], 'ktl')).toBeGreaterThan(0);
  });
});

describe('gọi tắt phổ biến (alias)', () => {
  const DRINKS = [
    { name: 'Cà phê sữa đá', code: 'D007' },
    { name: 'Coca Cola', code: 'D010' },
    { name: 'Bia Hà Nội', code: 'D020' },
    { name: 'Bia Sài Gòn', code: 'D021' },
  ];
  it('cf / cafe ra cà phê', () => {
    expect(filterMenuBySearch(DRINKS, 'cf')[0].name).toBe('Cà phê sữa đá');
    expect(filterMenuBySearch(DRINKS, 'cafe')[0].name).toBe('Cà phê sữa đá');
  });
  it('coke ra coca', () => {
    expect(filterMenuBySearch(DRINKS, 'coke').map((m) => m.name)).toEqual(['Coca Cola']);
  });
  it('bia hn chỉ ra Bia Hà Nội', () => {
    expect(filterMenuBySearch(DRINKS, 'bia hn').map((m) => m.name)).toEqual(['Bia Hà Nội']);
  });
  it('alias không làm mất kết quả cũ', () => {
    expect(filterMenuBySearch(DRINKS, 'cpsd')[0].name).toBe('Cà phê sữa đá');
  });
});
