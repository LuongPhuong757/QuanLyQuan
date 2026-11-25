// Đọc file Excel menu cho màn "Thiết lập quán" (docs/THIET-LAP-QUAN-SPEC.md §5).
//
// Chỉ làm việc "nhận ra cột nào là cột nào" và bỏ ô trống. Mọi quyết định (món mới / đổi giá /
// lỗi) là của server (`apps/api/src/modules/thiet-lap/menu-excel.ts`) — máy khách không đoán.
//
// Ô trống KHÔNG được gửi đi (để `undefined`), vì ở server ô trống nghĩa là GIỮ NGUYÊN. Đừng bao giờ
// thay bằng '' / 0 / null: bài học 304 món mất ảnh ngày 2026-09-07.

export type DongExcel = {
  dong: number;
  ma?: string;
  ten?: string;
  gia?: number | string;
  nhom?: string;
  don_vi?: string;
};

type Cot = Exclude<keyof DongExcel, 'dong'>;

/** Tên cột chấp nhận được, đã bỏ dấu + chữ thường. File chủ quán tự gõ hay file xuất từ phần mềm
 *  khác đều có tiêu đề kiểu này. */
const BI_DANH: Record<Cot, string[]> = {
  ma: ['ma', 'ma mon', 'ma hang', 'code', 'sku'],
  ten: ['ten', 'ten mon', 'ten hang', 'mon', 'name'],
  gia: ['gia', 'gia ban', 'don gia', 'price'],
  nhom: ['nhom', 'nhom mon', 'nhom hang', 'danh muc', 'loai', 'group'],
  don_vi: ['don vi', 'don vi tinh', 'dvt', 'unit'],
};

export function boDau(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Tiêu đề trong file → cột của mình. Tiêu đề lạ thì bỏ qua. */
export function nhanCot(tieuDe: string): Cot | null {
  const k = boDau(tieuDe);
  for (const [cot, ds] of Object.entries(BI_DANH) as Array<[Cot, string[]]>) {
    if (ds.includes(k)) return cot;
  }
  return null;
}

/** Hàng từ `sheet_to_json(…, { defval: '' })` → dòng gửi server. `dong` = số dòng trong file
 *  (tiêu đề là dòng 1). Hàng trống hẳn thì bỏ. */
export function docBang(raw: ReadonlyArray<Record<string, unknown>>): { dongs: DongExcel[]; thieuCotTen: boolean } {
  const tieuDe = raw.length > 0 ? Object.keys(raw[0]) : [];
  const anh = new Map<string, Cot>();
  for (const t of tieuDe) {
    const c = nhanCot(t);
    if (c && ![...anh.values()].includes(c)) anh.set(t, c);
  }
  const thieuCotTen = ![...anh.values()].includes('ten');
  const dongs: DongExcel[] = [];
  raw.forEach((hang, i) => {
    const d: DongExcel = { dong: i + 2 };
    let coGi = false;
    for (const [t, cot] of anh) {
      const v = hang[t];
      if (v === undefined || v === null) continue;
      if (typeof v === 'number') {
        if (cot === 'gia') d.gia = v;
        else d[cot] = String(v);
        coGi = true;
        continue;
      }
      const s = String(v).trim();
      if (s === '') continue;
      d[cot] = s;
      coGi = true;
    }
    if (coGi) dongs.push(d);
  });
  return { dongs, thieuCotTen };
}

export const MAU_EXCEL: ReadonlyArray<Record<string, string | number>> = [
  { 'Tên món': 'Lẩu thái hải sản', 'Giá': 280000, 'Nhóm': 'Lẩu', 'Đơn vị': 'nồi', 'Mã': '' },
  { 'Tên món': 'Mực nướng sa tế', 'Giá': 129000, 'Nhóm': 'Nướng', 'Đơn vị': 'đĩa', 'Mã': '' },
  { 'Tên món': 'Bia Sài Gòn', 'Giá': 20000, 'Nhóm': 'Đồ uống', 'Đơn vị': 'chai', 'Mã': '' },
];
