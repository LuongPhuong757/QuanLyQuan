import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { TriangleAlert } from 'lucide-react';
import { cx } from '../cx';

interface FieldShellProps {
  /** Bắt buộc: nhãn luôn hiện trên ô, không chỉ placeholder. */
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
}

function useFieldIds(id?: string) {
  const auto = useId();
  const base = id ?? auto;
  return { id: base, hintId: `${base}-hint`, errId: `${base}-err` };
}

function Shell({
  label,
  hint,
  error,
  className,
  ids,
  children,
}: FieldShellProps & { ids: ReturnType<typeof useFieldIds>; children: ReactNode }) {
  return (
    <div className={cx('ui-field', className)}>
      <label className="ui-field__label" htmlFor={ids.id}>
        {label}
      </label>
      {children}
      {error ? (
        <span className="ui-field__error" id={ids.errId} role="alert">
          <TriangleAlert aria-hidden="true" />
          {error}
        </span>
      ) : hint ? (
        <span className="ui-field__hint" id={ids.hintId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function describedBy(ids: ReturnType<typeof useFieldIds>, hint: unknown, error: unknown) {
  return error ? ids.errId : hint ? ids.hintId : undefined;
}

export type InputProps = FieldShellProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
    /** Hậu tố cố định bên phải ô, vd "đ". Ô có hậu tố thì canh phải, chữ đậm (kiểu ô tiền). */
    suffix?: ReactNode;
  };

export function Input({ label, hint, error, className, id, suffix, ...rest }: InputProps) {
  const ids = useFieldIds(id);
  const input = (
    <input
      id={ids.id}
      className={cx('ui-input', suffix != null && 'ui-input--suffixed')}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(ids, hint, error)}
      {...rest}
    />
  );
  return (
    <Shell label={label} hint={hint} error={error} className={className} ids={ids}>
      {suffix != null ? (
        <span className="ui-input-wrap">
          {input}
          <span className="ui-input-wrap__suffix" aria-hidden="true">
            {suffix}
          </span>
        </span>
      ) : (
        input
      )}
    </Shell>
  );
}

/** Ô nhập tiền: hậu tố "đ" + bàn phím số (DESIGN-SYSTEM §4 luật 14). */
export function MoneyInput(props: Omit<InputProps, 'suffix' | 'inputMode'>) {
  return <Input inputMode="numeric" autoComplete="off" suffix="đ" {...props} />;
}

export type TextareaProps = FieldShellProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>;

export function Textarea({ label, hint, error, className, id, ...rest }: TextareaProps) {
  const ids = useFieldIds(id);
  return (
    <Shell label={label} hint={hint} error={error} className={className} ids={ids}>
      <textarea
        id={ids.id}
        className="ui-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, hint, error)}
        {...rest}
      />
    </Shell>
  );
}

export type SelectProps = FieldShellProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'>;

export function Select({ label, hint, error, className, id, children, ...rest }: SelectProps) {
  const ids = useFieldIds(id);
  return (
    <Shell label={label} hint={hint} error={error} className={className} ids={ids}>
      <select
        id={ids.id}
        className="ui-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, hint, error)}
        {...rest}
      >
        {children}
      </select>
    </Shell>
  );
}
