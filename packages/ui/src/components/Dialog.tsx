import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /**
   * Hàng nút cuối. Có footer thì KHÔNG hiện nút ✕ — footer phải tự có nút lùi ("Quay lại …"),
   * vì mỗi hộp thoại chỉ một lối thoát (DESIGN-SYSTEM §4 luật 12). Không có footer thì hiện ✕.
   */
  footer?: ReactNode;
}

/**
 * Điện thoại: bảng trượt từ đáy. ≥ 640px: hộp giữa màn.
 * Luật: chồng tối đa 2 tầng hộp thoại (DESIGN-SYSTEM §8) — component không chặn được,
 * màn tự giữ.
 */
export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    boxRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="ui-dialog__overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={boxRef} className="ui-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="ui-dialog__grab" aria-hidden="true" />
        <div className="ui-dialog__head">
          <h2 className="ui-dialog__title" id={titleId}>
            {title}
          </h2>
          {!footer && (
            <button type="button" className="ui-dialog__close" aria-label="Đóng" onClick={onClose}>
              <X aria-hidden="true" />
            </button>
          )}
        </div>
        {children}
        {footer && <div className="ui-dialog__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
