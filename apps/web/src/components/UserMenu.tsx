// Avatar tài khoản trên header = NÚT mở menu (2026-11-06, chủ repo QuanLyQuan).
//
// - Vòng tròn 44px, CHỮ CÁI ĐẦU của tên hiển thị (chưa đặt tên → chữ đầu của tên đăng nhập), màu
//   trung tính. Bỏ viên màu theo vai trò (vàng/xanh/xanh lá/tím — ngoài bảng màu chung).
// - Menu: tên đầy đủ + vai trò + tên đăng nhập, "Tài khoản", "Đăng xuất". "Đăng xuất" không còn đứng
//   thường trực trên header (hiếm dùng, dễ bấm nhầm).
// - Chưa đặt tên hiển thị → nhắc "Đặt tên hiển thị". Chỉ ADMIN đổi được tên (màn Nhân sự); nhân viên
//   tự đổi tên cần API mới — ghi ở docs/design/VIEC-NGOAI-UI.md.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, PencilLine, UserRound } from 'lucide-react';

function initials(fullName: string | null | undefined, username: string): string {
  const src = (fullName ?? '').trim();
  if (src) {
    // Tên Việt: chữ đầu của TÊN (từ cuối) — "Nguyễn Văn An" → "A", như cách gọi nhau trong quán.
    const parts = src.split(/\s+/);
    return parts[parts.length - 1].charAt(0).toLocaleUpperCase('vi-VN');
  }
  return username.charAt(0).toLocaleUpperCase('vi-VN') || '?';
}

export function UserMenu({
  fullName,
  username,
  roleLabel,
  isAdmin,
  onLogout,
}: {
  fullName: string | null | undefined;
  username: string;
  roleLabel: string | null;
  isAdmin: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hasName = !!fullName?.trim() && fullName.trim() !== username;
  const shown = hasName ? fullName!.trim() : username;

  // Bấm ra ngoài / Esc → đóng.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={wrapRef}>
      <button
        type="button"
        className="user-avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Tài khoản: ${shown}${roleLabel ? ` (${roleLabel})` : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        {initials(fullName, username)}
      </button>
      {open && (
        <div className="user-menu-panel" role="menu">
          <div className="user-menu-who">
            <strong>{shown}</strong>
            <span>{roleLabel ? `${roleLabel} - ` : ''}{username}</span>
          </div>
          {!hasName && isAdmin && (
            <Link to="/admin/users" role="menuitem" className="user-menu-item user-menu-hint" onClick={() => setOpen(false)}>
              <PencilLine size={20} aria-hidden="true" /> Đặt tên hiển thị
            </Link>
          )}
          <Link to="/account" role="menuitem" className="user-menu-item" onClick={() => setOpen(false)}>
            <UserRound size={20} aria-hidden="true" /> Tài khoản
          </Link>
          <button
            type="button"
            role="menuitem"
            className="user-menu-item user-menu-logout"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <LogOut size={20} aria-hidden="true" /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
