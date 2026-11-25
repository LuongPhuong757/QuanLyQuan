// Phân loại các dòng Excel menu của màn "Thiết lập quán" (docs/THIET-LAP-QUAN-SPEC.md §5, D-06).
//
// Khác `POST /menu/bulk-import` ở MỘT điểm: quán mới không có mã món, nên khớp theo TÊN khi dòng
// không ghi mã. Còn luật nặng ký nhất thì giữ y nguyên: ô trống = GIỮ NGUYÊN, không phải xoá — bài
// học 2026-09-07 (một lần import lại bảng giá đã xoá đường dẫn ảnh của 304/597 món trên prod).
// Hàm này cũng KHÔNG bao giờ trả về `image_url`.
//
// Với món đã có: chỉ đổi GIÁ và NHÓM (D-06). Không đổi tên (khớp theo tên thì tên đã bằng nhau),
// không đổi đơn vị — đơn vị chỉ dùng khi tạo món mới.
//
// Module thuần: test không cần DB.

export const TOI_DA_DONG = 2000;
const GIA_TOI_DA = 100_000_000;

export type DongExcel = {
  /** Số dòng trong file (dòng tiêu đề = 1) — để báo lỗi chỉ đúng chỗ. */
  dong: number;
  ma?: string;
  ten?: string;
  gia?: number | string;
  nhom?: string;
  don_vi?: string;
};

export type MonDangCo = { id: string; code: string; name: string; group: string; price: number };
export type NhomDangCo = { code: string; name: string };

export type MonMoi = { dong: number; ma: string | null; ten: string; gia: number; nhom: string; don_vi: string };
export type MonDoi = {
  dong: number;
  id: string;
  ten: string;
  gia_cu: number;
  /** `undefined` = giữ nguyên giá. */
  gia_moi?: number;
  nhom_cu: string;
  /** Tên nhóm mới; `undefined` = giữ nguyên nhóm. */
  nhom_moi?: string;
};
export type DongLoi = { dong: number; ten: string; ly_do: string };

export type KetQuaPhanLoai = {
  moi: MonMoi[];
  doi: MonDoi[];
  loi: DongLoi[];
  /** Dòng khớp món đã có nhưng không đổi gì. */
  khong_doi: number;
};

/** Gom khoảng trắng thừa. Giữ nguyên dấu: "Bò" và "Bơ" là hai món khác nhau. */
export function gonTen(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** Khoá so tên: không phân biệt hoa thường, CÓ phân biệt dấu. */
export function khoaTen(s: string): string {
  return gonTen(s).toLocaleLowerCase('vi');
}

/** "45.000", "45,000", "45000đ", 45000 → 45000. Rỗng → undefined. Không phải số → null. */
export function docGia(raw: number | string | undefined): number | undefined | null {
  if (raw === undefined) return undefined;
  if (typeof raw === 'number') {
    return Number.isInteger(raw) && raw >= 0 && raw <= GIA_TOI_DA ? raw : null;
  }
  const s = raw.trim();
  if (s === '') return undefined;
  const bo = s.replace(/[.,\s]/g, '').replace(/(đ|vnđ|vnd|d)$/i, '');
  if (!/^\d+$/.test(bo)) return null;
  const n = Number(bo);
  return n <= GIA_TOI_DA ? n : null;
}

function rong(s: string | undefined): string | undefined {
  if (s === undefined) return undefined;
  const g = gonTen(String(s));
  return g === '' ? undefined : g;
}

export function phanLoaiMenu(
  dongs: readonly DongExcel[],
  monDangCo: readonly MonDangCo[],
  nhomDangCo: readonly NhomDangCo[],
): KetQuaPhanLoai {
  const theoMa = new Map(monDangCo.map((m) => [m.code, m]));
  const theoTen = new Map<string, MonDangCo[]>();
  for (const m of monDangCo) {
    const k = khoaTen(m.name);
    theoTen.set(k, [...(theoTen.get(k) ?? []), m]);
  }
  const tenNhom = new Map(nhomDangCo.map((g) => [g.code, g.name]));
  const nhomTheoTen = new Map(nhomDangCo.map((g) => [khoaTen(g.name), g.name]));
  /** Tên nhóm trong file → tên nhóm sẽ dùng (nhóm đã có thì lấy đúng tên đang có). */
  const chuanNhom = (n: string): string => nhomTheoTen.get(khoaTen(n)) ?? n;

  const ketQua: KetQuaPhanLoai = { moi: [], doi: [], loi: [], khong_doi: 0 };
  const dongCuaTen = new Map<string, number>();

  for (const d of dongs) {
    const ma = rong(d.ma);
    const ten = rong(d.ten);
    const nhom = rong(d.nhom);
    const donVi = rong(d.don_vi);
    const loi = (ly_do: string) => ketQua.loi.push({ dong: d.dong, ten: ten ?? ma ?? '', ly_do });

    if (!ten && !ma) {
      loi('Thiếu tên món');
      continue;
    }
    const gia = docGia(d.gia);
    if (gia === null) {
      loi(`"${String(d.gia).trim()}" — giá phải là số, ví dụ 45000`);
      continue;
    }
    if (ma && ma.length > 32) {
      loi('Mã món dài quá 32 ký tự');
      continue;
    }
    if (ten && ten.length > 128) {
      loi('Tên món dài quá 128 ký tự');
      continue;
    }
    if (nhom && nhom.length > 64) {
      loi('Tên nhóm dài quá 64 ký tự');
      continue;
    }
    if (donVi && donVi.length > 32) {
      loi('Đơn vị dài quá 32 ký tự');
      continue;
    }

    // Trùng tên trong cùng file: không biết dòng nào là thật, bắt sửa file.
    if (ten) {
      const k = khoaTen(ten);
      const truoc = dongCuaTen.get(k);
      if (truoc !== undefined) {
        loi(`Trùng tên với dòng ${truoc}`);
        continue;
      }
      dongCuaTen.set(k, d.dong);
    }

    let mon: MonDangCo | undefined;
    if (ma) {
      mon = theoMa.get(ma);
    } else if (ten) {
      const khop = theoTen.get(khoaTen(ten)) ?? [];
      if (khop.length > 1) {
        loi(`Menu đang có ${khop.length} món cùng tên — điền cột Mã để chỉ rõ món nào`);
        continue;
      }
      mon = khop[0];
    }

    if (!mon) {
      if (!ten) {
        loi(`Mã ${ma} chưa có trong menu — món mới cần Tên`);
        continue;
      }
      if (gia === undefined) {
        loi('Món mới cần Giá');
        continue;
      }
      if (!nhom) {
        loi('Món mới cần Nhóm');
        continue;
      }
      ketQua.moi.push({ dong: d.dong, ma: ma ?? null, ten, gia, nhom: chuanNhom(nhom), don_vi: donVi ?? 'phần' });
      continue;
    }

    const nhomCu = tenNhom.get(mon.group) ?? mon.group;
    const doi: MonDoi = { dong: d.dong, id: mon.id, ten: mon.name, gia_cu: mon.price, nhom_cu: nhomCu };
    if (gia !== undefined && gia !== mon.price) doi.gia_moi = gia;
    if (nhom && khoaTen(nhom) !== khoaTen(nhomCu)) doi.nhom_moi = chuanNhom(nhom);
    if (doi.gia_moi === undefined && doi.nhom_moi === undefined) {
      ketQua.khong_doi++;
      continue;
    }
    ketQua.doi.push(doi);
  }
  return ketQua;
}

/** "Món chính" → "mon-chinh" (≤ `maxLen`), cùng cách với ImportMenuModal ở web. */
export function slugNhom(s: string, maxLen = 16): string {
  const n = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return n.slice(0, maxLen).replace(/-+$/, '') || 'nhom';
}

/** Lấy mã chưa dùng: `base`, rồi `base-2`, `base-3`… vẫn trong `maxLen` ký tự. */
export function maChuaDung(base: string, daDung: ReadonlySet<string>, maxLen: number): string {
  if (!daDung.has(base)) return base;
  for (let n = 2; ; n++) {
    const duoi = `-${n}`;
    const ma = base.slice(0, maxLen - duoi.length) + duoi;
    if (!daDung.has(ma)) return ma;
  }
}

/** Mã món tự sinh cho món mới không ghi mã: M0001, M0002… bỏ qua mã đã có. Ghi luôn vào `daDung`. */
export function sinhMaMon(daDung: Set<string>): string {
  for (let n = 1; ; n++) {
    const ma = `M${String(n).padStart(4, '0')}`;
    if (!daDung.has(ma)) {
      daDung.add(ma);
      return ma;
    }
  }
}
