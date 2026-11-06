// P01.D-19 — show/hide toggle + caps-lock warning + optional zxcvbn strength meter
import { useState, KeyboardEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  showStrength?: boolean;
  autoComplete?: string;
  ariaDescribedBy?: string;
};

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  showStrength = false,
  autoComplete = 'current-password',
  ariaDescribedBy,
}: Props) {
  const [show, setShow] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsOn(e.getModifierState('CapsLock'));
    }
  };

  let strength = -1;
  let strengthText = '';
  if (showStrength && value) {
    // Lazy load zxcvbn via global if available; fall back to simple heuristic
    const z = (globalThis as { zxcvbn?: (s: string) => { score: number } }).zxcvbn;
    if (z) {
      strength = z(value).score;
    } else {
      strength = Math.min(4, Math.floor(value.length / 4));
    }
    strengthText = ['Rất yếu', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'][strength] || '';
  }

  const strengthColor = ['#dc2626', '#f59e0b', '#f59e0b', '#10b981', '#059669'][Math.max(0, strength)];

  return (
    <div className="row password-row">
      <label htmlFor={id}>{label}</label>
      {/* Bọc RIÊNG ô nhập + nút mắt: nút neo theo chiều cao Ô NHẬP chứ không theo cả hàng (trước
          đây `top: 28px` tính từ đỉnh hàng → lệch lên khi nhãn đổi cỡ chữ). Icon SVG lucide thay
          emoji 👁/🙈 — emoji mỗi hệ điều hành vẽ một kiểu, lại lệch đường cơ sở. */}
      <div className="password-field">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          onBlur={onBlur}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={[error ? `${id}-err` : null, ariaDescribedBy].filter(Boolean).join(' ') || undefined}
        />
        <button
          type="button"
          className="toggle"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={show}
        >
          {show ? <EyeOff size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
        </button>
      </div>
      {error && (
        <div className="field-error" id={`${id}-err`}>
          {error}
        </div>
      )}
      {capsOn && <div className="field-error">⚠ Caps Lock đang bật</div>}
      {showStrength && value && (
        <>
          <div className="strength-meter" aria-hidden="true">
            {/* scaleX thay vì width: animate transform không gây reflow (detector: layout-transition). */}
            <div
              className="bar"
              style={{ transform: `scaleX(${(strength + 1) / 5})`, background: strengthColor }}
            />
          </div>
          <div className="strength-text">Độ mạnh: {strengthText}</div>
        </>
      )}
    </div>
  );
}
