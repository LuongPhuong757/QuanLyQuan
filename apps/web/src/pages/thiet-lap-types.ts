// Kiểu dữ liệu màn "Thiết lập quán" — khớp `GET /admin/thiet-lap/trang-thai`
// (apps/api/src/modules/thiet-lap/thiet-lap.controller.ts).
import type { MauBang, ThuongHieuCongKhai } from '@order/schemas';

export type MaMuc =
  | 'thong-tin'
  | 'chu-quan'
  | 'ban'
  | 'menu'
  | 'ngan-hang'
  | 'nhan-vien'
  | 'may-in'
  | 'gio-ban'
  | 'tinh-nang'
  | 'thuong-hieu';

export type Ve = { token: string; het_han: number; boi: string };

export type TaiKhoanNganHang = {
  id: string;
  label: string;
  bank_bin: string | null;
  bank_name: string | null;
  account_no: string | null;
  account_name: string | null;
};

export type TinhNang = {
  online_ordering_enabled: boolean;
  table_ordering_enabled: boolean;
  printing_enabled: boolean;
};

export type TrangThai = {
  muc: Array<{ ma: MaMuc; ten: string; bat_buoc: boolean; xong: boolean; tom_tat: string }>;
  san_sang: boolean;
  con_thieu: number;
  chi_tiet: {
    thong_tin: { store_name: string; store_phone: string; store_address: string };
    chu_quan: { full_name: string; username: string } | null;
    ban: { so_ban: number; so_lon_nhat: number };
    ngan_hang: TaiKhoanNganHang[];
    tinh_nang: TinhNang;
    thuong_hieu: ThuongHieuCongKhai;
  };
  bang_mau: { admin: MauBang[]; khach: MauBang[] };
  ngan_hang_ho_tro: Array<{ bin: string; ten: string }>;
  nhat_ky: Array<{ id: string; ts_ms: number; ai: string | null; mo_ta: string }>;
  ve: Ve;
};

/** Gọi API kèm vé mở khoá. Ném `Error` với câu tiếng Việt đọc được khi lỗi. */
export type GoiApi = (method: 'GET' | 'POST' | 'PUT', url: string, body?: unknown) => Promise<unknown>;

export type KetQuaXemTruoc = {
  moi: Array<{ dong: number; ma: string | null; ten: string; gia: number; nhom: string; don_vi: string }>;
  doi: Array<{ dong: number; id: string; ten: string; gia_cu: number; gia_moi?: number; nhom_cu: string; nhom_moi?: string }>;
  loi: Array<{ dong: number; ten: string; ly_do: string }>;
  khong_doi: number;
};
