// Khung trang dùng chung (2026-11-06, chủ repo QuanLyQuan).
//
// Thay cho các vỏ `container` / `container wide` / `container txn-page` / `orders-page`… mỗi trang
// một độ rộng, lề khác header. Chỉ còn HAI kiểu (khai ở `lib/pages.ts`):
//   - wide   : tràn màn — lưới bàn, bảng nhiều cột.
//   - narrow : tối đa 960px — form, danh sách.
// Lề hai bên = biến `--page-gutter`, header dùng CHÍNH biến đó và cùng độ rộng → tên trang trên
// header thẳng hàng với mép nội dung.
//
// `actions`: các nút thao tác của trang ("+ Thêm món"…) — hiện ở MỘT hàng cố định ngay dưới
// header, cùng vị trí ở mọi trang. Quy ước: tối đa MỘT nút chính (đỏ), còn lại `secondary`; nhãn
// dạng "+ Thêm <đối tượng>". KHÔNG đặt `<h1>` tên trang trong trang — header đã có.
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { pageFor, type PageWidth } from '../lib/pages.ts';

export function PageLayout({
  width,
  actions,
  children,
  className,
}: {
  /** Bỏ trống → lấy theo `PAGES` của đường dẫn hiện tại (mặc định 'narrow'). */
  width?: PageWidth;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const loc = useLocation();
  const w = width ?? pageFor(loc.pathname)?.width ?? 'narrow';
  return (
    <div className={`page page--${w} with-bottom-nav${className ? ` ${className}` : ''}`}>
      {actions && <div className="page-actions">{actions}</div>}
      {children}
    </div>
  );
}
