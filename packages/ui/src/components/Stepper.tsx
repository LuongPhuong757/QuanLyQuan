import { Minus, Plus } from 'lucide-react';
import { cx } from '../cx';

export interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Nhãn cho trình đọc màn hình, vd "Số lượng Cơm tấm". */
  label: string;
  /** Giãn hết chiều ngang (dùng trong hàng nút của dòng món). */
  block?: boolean;
  className?: string;
}

/**
 * Số lượng: − 1 + (DESIGN-SYSTEM §4 luật 14). Không bắt người dùng gõ số trên bàn phím điện thoại.
 * Nút 56×52, số 20px đậm.
 */
export function Stepper({ value, onChange, min = 0, max = 999, label, block, className }: StepperProps) {
  return (
    <div className={cx('ui-stepper', block && 'ui-stepper--block', className)} role="group" aria-label={label}>
      <button
        type="button"
        className="ui-stepper__btn"
        aria-label="Bớt 1"
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-disabled={value <= min || undefined}
      >
        <Minus aria-hidden="true" />
      </button>
      <output className="ui-stepper__value" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className="ui-stepper__btn"
        aria-label="Thêm 1"
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-disabled={value >= max || undefined}
      >
        <Plus aria-hidden="true" />
      </button>
    </div>
  );
}
