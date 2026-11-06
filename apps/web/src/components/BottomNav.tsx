// Thanh điều hướng dưới — TỐI ĐA 4 mục chính + "Thêm" (2026-11-06, chủ repo yêu cầu).
//
// Trước đây nav admin có 9 mục và trượt ngang: trên điện thoại "Online" bị cắt đôi, "NCC" và
// "N/viên" nằm hẳn ngoài màn mà không có dấu hiệu nào cho biết còn mục phía sau. Chuẩn bottom nav
// là ≤ 5 mục, nên mỗi role giữ ≤ 4 mục DÙNG KHI ĐANG PHỤC VỤ, phần còn lại gom vào "Thêm" (mở một
// tấm danh sách to từ đáy màn — chữ đầy đủ, dễ bấm).
//
// Icon là SVG lucide thay emoji: emoji mỗi hệ điều hành vẽ một kiểu, lệch đường cơ sở.
// Nhãn chữ ĐẦY ĐỦ ("Lịch sử", "Nhân sự") thay viết tắt ("L/sử", "N/viên") — có icon rồi thì chữ
// không cần nén.
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu as MenuIcon, X, type LucideIcon } from 'lucide-react';

export type NavBadgeSpec = {
  count: number | null;
  /** Đọc cho screen reader, dạng "3 <label>". */
  label: string;
  tone?: 'alert' | 'info';
};

export type NavItem = {
  to: string;
  label: string;
  /** Mô tả dài hơn nhãn — đọc cho screen reader + hiện ở tấm "Thêm". */
  hint?: string;
  icon: LucideIcon;
  badge?: NavBadgeSpec;
};

/** Con số nhỏ ở góc trên-phải icon. `count` null/0 → không vẽ gì (thà không có số còn hơn sai).
 *  Đỏ = việc phải làm (đơn chờ duyệt), xanh dương = chỉ để biết (số bàn đang mở) — hai badge đứng
 *  cạnh nhau mà cùng màu thì liếc qua tưởng cả hai đều cần xử lý. */
export function NavBadge({ count, label, tone = 'alert' }: NavBadgeSpec) {
  if (count === null || count <= 0) return null;
  return (
    <span aria-label={`${count} ${label}`} className={`nav-badge nav-badge--${tone}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

function ItemIcon({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <span className="nav-icon-wrap">
      <Icon className="nav-icon" size={22} aria-hidden="true" />
      {item.badge && <NavBadge {...item.badge} />}
    </span>
  );
}

export function BottomNav({ primary, more = [] }: { primary: NavItem[]; more?: NavItem[] }) {
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  // Đổi trang (kể cả bấm một mục trong tấm "Thêm") → đóng tấm.
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const inMore = more.some((m) => loc.pathname === m.to || loc.pathname.startsWith(`${m.to}/`));
  // Badge của "Thêm" = tổng các badge ĐỎ bên trong (việc phải làm) — giấu mục vào "Thêm" mà mất
  // luôn con số phiếu nhập chờ duyệt thì admin không còn biết có việc.
  const moreAlert = more.reduce((s, m) => s + (m.badge?.tone !== 'info' ? m.badge?.count ?? 0 : 0), 0);

  return (
    <>
      <nav className="nav-bottom" aria-label="Điều hướng chính">
        {primary.map((item) => (
          <NavLink key={item.to} to={item.to} aria-label={item.hint ?? item.label}>
            <ItemIcon item={item} />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
        {more.length > 0 && (
          <button
            type="button"
            className="nav-more"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-current={inMore ? 'page' : undefined}
            onClick={() => setOpen(true)}
          >
            <span className="nav-icon-wrap">
              <MenuIcon className="nav-icon" size={22} aria-hidden="true" />
              <NavBadge count={moreAlert} label="việc đang chờ trong mục Thêm" />
            </span>
            <span className="nav-label">Thêm</span>
          </button>
        )}
      </nav>

      {open && (
        <div className="nav-sheet-overlay" onClick={() => setOpen(false)}>
          <div
            className="nav-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Các mục khác"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nav-sheet-head">
              <strong>Các mục khác</strong>
              <button
                type="button"
                className="secondary nav-sheet-close"
                aria-label="Đóng"
                onClick={() => setOpen(false)}
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>
            <ul className="nav-sheet-list">
              {more.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className="nav-sheet-item">
                    <ItemIcon item={item} />
                    <span className="nav-sheet-text">
                      <span className="nav-sheet-label">{item.label}</span>
                      {item.hint && <span className="nav-sheet-hint">{item.hint}</span>}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
