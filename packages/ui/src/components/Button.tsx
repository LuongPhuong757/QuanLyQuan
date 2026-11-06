import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { cx } from '../cx';

/**
 * Chỉ 4 kiểu (DESIGN-SYSTEM §4 luật 9): primary = mọi hành động · secondary · ghost (đóng/quay lại)
 * · danger (phá huỷ, dạng viền). CỐ Ý không có 'success': xanh lá chỉ dành cho trạng thái "đã xong"
 * (Badge, thông báo), không làm màu nút.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  variant?: ButtonVariant;
  /** 'lg' = 64px cho nút chính lớn (Gửi bếp, Thanh toán). Không có cỡ nhỏ hơn 52. */
  size?: 'md' | 'lg';
  block?: boolean;
  /** Icon Lucide đặt trước nhãn, vd <Check />. Luôn đi kèm chữ, không có nút chỉ-icon. */
  icon?: ReactNode;
  /**
   * Lý do nút đang bị chặn. Có giá trị → nút đổi sang viền đứt + ⚠ + dòng lý do ngay trên nút,
   * onClick KHÔNG chạy mà gọi onBlockedClick (vd cuộn tới ô còn thiếu).
   * Cố ý không hỗ trợ `disabled`: người dùng lớn tuổi không hiểu vì sao nút "chết".
   */
  blockedReason?: string;
  onBlockedClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  /** Nhãn nút KHÔNG xuống dòng (luật 8) — viết đủ ngắn để vừa màn 360px. */
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  icon,
  blockedReason,
  onBlockedClick,
  onClick,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const blocked = Boolean(blockedReason);
  return (
    <button
      type={type}
      className={cx(
        'ui-btn',
        `ui-btn--${variant}`,
        size === 'lg' && 'ui-btn--lg',
        block && 'ui-btn--block',
        className,
      )}
      aria-disabled={blocked || undefined}
      onClick={(e) => (blocked ? onBlockedClick?.(e) : onClick?.(e))}
      {...rest}
    >
      <span className="ui-btn__label">
        {icon}
        {children}
      </span>
      {blocked && (
        <span className="ui-btn__reason">
          <TriangleAlert aria-hidden="true" />
          {blockedReason}
        </span>
      )}
    </button>
  );
}
