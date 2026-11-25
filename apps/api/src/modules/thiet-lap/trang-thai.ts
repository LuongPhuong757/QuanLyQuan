// Tình trạng 9 mục của màn "Thiết lập quán" (docs/THIET-LAP-QUAN-SPEC.md §3–4).
//
// Tính lại từ DB mỗi lần mở màn, KHÔNG lưu cờ "đã xong": cờ sẽ nói dối ngay khi ai đó xoá bàn hay
// ngừng mã QR ở màn khác. Module thuần — controller đếm, hàm này quyết định.
import { BANG_MAU_ADMIN, BANG_MAU_KHACH, type ThuongHieuCongKhai } from '@order/schemas';

export type DuLieuTrangThai = {
  store_name: string;
  store_phone: string;
  store_address: string;
  chu_quan: { full_name: string | null; username: string } | null;
  so_ban: number;
  so_mon: number;
  so_nhom: number;
  ngan_hang: Array<{ bank_name: string | null; account_no: string | null; account_name: string | null }>;
  so_nhan_vien: number;
  printing_enabled: boolean;
  printer_host: string;
  printer_connection: string;
  open_hours_count: number;
  online_ordering_enabled: boolean;
  table_ordering_enabled: boolean;
  thuong_hieu: ThuongHieuCongKhai;
};

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

export type MucThietLap = {
  ma: MaMuc;
  ten: string;
  bat_buoc: boolean;
  xong: boolean;
  /** Một dòng tóm tắt hiện dưới tên mục. */
  tom_tat: string;
};

export type TrangThaiThietLap = { muc: MucThietLap[]; san_sang: boolean; con_thieu: number };

function duoiSoTk(no: string | null): string {
  return no ? `…${no.slice(-4)}` : '';
}

function tomTatMayIn(d: DuLieuTrangThai): string {
  if (!d.printing_enabled) return 'Chưa bật · bếp xem đơn trên màn hình';
  if (d.printer_connection === 'USB') return 'Đang bật · nối USB';
  return d.printer_host ? `Đang bật · ${d.printer_host}` : 'Đang bật · chưa có địa chỉ máy in';
}

function tomTatThongTin(ten: string, sdt: string, diaChi: string): string {
  if (ten === '') return 'Chưa đặt tên quán';
  if (sdt === '') return `${ten} · chưa có số điện thoại`;
  return [ten, sdt, diaChi].filter(Boolean).join(' · ');
}

function tomTatThuongHieu(th: ThuongHieuCongKhai): string {
  const ten = (bang: typeof BANG_MAU_ADMIN, hex: string) => bang.find((m) => m.hex === hex)?.ten ?? hex;
  return [
    th.logo_phien_ban > 0 ? 'Đã có logo' : 'Chưa tải logo',
    `Quản lý: ${ten(BANG_MAU_ADMIN, th.mau_admin)}`,
    `Khách: ${ten(BANG_MAU_KHACH, th.mau_khach)}`,
  ].join(' · ');
}

export function tinhTrangThai(d: DuLieuTrangThai): TrangThaiThietLap {
  const tenQuan = d.store_name.trim();
  const sdt = d.store_phone.trim();
  const tk = d.ngan_hang[0];
  const muc: MucThietLap[] = [
    {
      ma: 'thong-tin',
      ten: 'Thông tin quán',
      bat_buoc: true,
      xong: tenQuan !== '' && sdt !== '',
      tom_tat: tomTatThongTin(tenQuan, sdt, d.store_address.trim()),
    },
    {
      ma: 'chu-quan',
      ten: 'Tài khoản chủ quán',
      bat_buoc: true,
      xong: d.chu_quan !== null,
      tom_tat: d.chu_quan
        ? `${d.chu_quan.full_name || d.chu_quan.username} · đăng nhập: ${d.chu_quan.username}`
        : 'Chưa có',
    },
    {
      ma: 'ban',
      ten: 'Bàn',
      bat_buoc: true,
      xong: d.so_ban > 0,
      tom_tat: d.so_ban > 0 ? `${d.so_ban} bàn` : 'Chưa có bàn',
    },
    {
      ma: 'menu',
      ten: 'Menu',
      bat_buoc: true,
      xong: d.so_mon > 0,
      tom_tat: d.so_mon > 0 ? `${d.so_mon} món · ${d.so_nhom} nhóm` : 'Chưa có món nào',
    },
    {
      ma: 'ngan-hang',
      ten: 'Tài khoản ngân hàng',
      bat_buoc: true,
      xong: d.ngan_hang.length > 0,
      tom_tat: tk
        ? [tk.bank_name, duoiSoTk(tk.account_no), tk.account_name].filter(Boolean).join(' · ') +
          (d.ngan_hang.length > 1 ? ` (+${d.ngan_hang.length - 1} TK khác)` : '')
        : 'Chưa có — khách chỉ trả được tiền mặt',
    },
    {
      ma: 'nhan-vien',
      ten: 'Nhân viên',
      bat_buoc: false,
      xong: d.so_nhan_vien > 0,
      tom_tat: d.so_nhan_vien > 0 ? `${d.so_nhan_vien} người` : 'Chưa có nhân viên',
    },
    {
      ma: 'may-in',
      ten: 'Máy in',
      bat_buoc: false,
      xong: d.printing_enabled,
      tom_tat: tomTatMayIn(d),
    },
    {
      ma: 'gio-ban',
      ten: 'Giờ bán',
      bat_buoc: false,
      xong: d.open_hours_count > 0,
      tom_tat: d.open_hours_count > 0 ? 'Đã đặt' : 'Chưa đặt',
    },
    {
      ma: 'tinh-nang',
      ten: 'Tính năng',
      bat_buoc: false,
      xong: true,
      tom_tat: `Đặt online: ${d.online_ordering_enabled ? 'bật' : 'tắt'} · Gọi món tại bàn: ${d.table_ordering_enabled ? 'bật' : 'tắt'} · In: ${d.printing_enabled ? 'bật' : 'tắt'}`,
    },
    {
      ma: 'thuong-hieu',
      ten: 'Thương hiệu',
      bat_buoc: false,
      xong: d.thuong_hieu.logo_phien_ban > 0,
      tom_tat: tomTatThuongHieu(d.thuong_hieu),
    },
  ];
  const con_thieu = muc.filter((m) => m.bat_buoc && !m.xong).length;
  return { muc, san_sang: con_thieu === 0, con_thieu };
}
