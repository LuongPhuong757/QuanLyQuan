import type { HTMLAttributes } from 'react';
import { cx } from '../cx';

export type BadgeTone = 'info' | 'success' | 'danger' | 'warning' | 'qr' | 'muted';

/** Nhãn trạng thái. Children phải có CHỮ (vd "⚠ Trễ 25'"), không để màu tự nói. */
export function Badge({ tone = 'info', className, ...rest }: { tone?: BadgeTone } & HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('ui-badge', `ui-badge--${tone}`, className)} {...rest} />;
}
