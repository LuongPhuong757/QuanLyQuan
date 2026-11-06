// CẤU HÌNH TRANG DÙNG CHUNG (2026-11-06, chủ repo QuanLyQuan).
//
// MỘT chỗ khai tên + độ rộng của mỗi trang. Header (`<h1>`), tiêu đề tab trình duyệt, nhãn thanh
// nav dưới và `PageLayout` đều đọc từ đây — trước đây mỗi nơi tự ghi một tên ("Lịch sử" trên nav
// nhưng "📊 Quản lý giao dịch" trong trang, "Online" / "Đơn hàng online", "Bàn" / "Quản lý bàn").
//
// - `title`: tên ĐẦY ĐỦ — hiện ở header + tab trình duyệt.
// - `navLabel`: nhãn ngắn trên nav dưới (mặc định = title). Chỉ rút gọn khi title quá dài cho ô nav.
// - `width`: 'wide' = tràn màn (lưới/bảng nhiều cột) · 'narrow' = tối đa 960px (form, danh sách).
//   Header căn nội dung theo đúng độ rộng này để tên trang thẳng hàng với nội dung bên dưới.

export type PageWidth = 'wide' | 'narrow';

export type PageInfo = {
  title: string;
  navLabel?: string;
  width: PageWidth;
};

export const PAGES: Record<string, PageInfo> = {
  '/orders': { title: 'Sơ đồ bàn', navLabel: 'Order', width: 'wide' },
  '/kitchen': { title: 'Bếp', width: 'wide' },
  '/history': { title: 'Lịch sử', width: 'wide' },
  '/custom-receipt': { title: 'Hoá đơn tự do', navLabel: 'Hoá đơn', width: 'narrow' },
  '/menu': { title: 'Menu', width: 'wide' },
  '/tables': { title: 'Quản lý bàn', width: 'narrow' },
  '/admin/online-orders': { title: 'Đơn online', navLabel: 'Online', width: 'wide' },
  '/suppliers': { title: 'Nhà cung cấp', navLabel: 'NCC', width: 'wide' },
  '/admin/users': { title: 'Nhân sự', width: 'narrow' },
  '/admin/analytics': { title: 'Truy cập & khách hàng', navLabel: 'Truy cập', width: 'wide' },
  '/admin/bank-ledger': { title: 'Sổ ngân hàng', width: 'wide' },
  '/admin/audit': { title: 'Nhật ký hệ thống', width: 'wide' },
  '/dashboard': { title: 'Trang chính', navLabel: 'Báo cáo', width: 'narrow' },
  '/account': { title: 'Tài khoản', width: 'narrow' },
};

/** Trang ứng với đường dẫn (khớp tiền tố, mục dài hơn thắng — vd `/admin/users/abc` → Nhân sự). */
export function pageFor(pathname: string): PageInfo | null {
  let best: string | null = null;
  for (const p of Object.keys(PAGES)) {
    if ((pathname === p || pathname.startsWith(`${p}/`)) && (!best || p.length > best.length)) best = p;
  }
  return best ? PAGES[best] : null;
}

/** Nhãn nav dưới của một trang (rơi về title nếu không khai navLabel). */
export function navLabel(path: string): string {
  const p = PAGES[path];
  return p ? p.navLabel ?? p.title : path;
}
