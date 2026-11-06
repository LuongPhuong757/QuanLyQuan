import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { cx } from '../cx';

type CardLook = { selected?: boolean; dashed?: boolean };

function cardClass({ selected, dashed }: CardLook, className?: string) {
  return cx('ui-card', selected && 'ui-card--selected', dashed && 'ui-card--dashed', className);
}

/** Khối nội dung tĩnh. Không lồng Card trong Card. */
export function Card({ selected, dashed, className, ...rest }: CardLook & HTMLAttributes<HTMLDivElement>) {
  return <div className={cardClass({ selected, dashed }, className)} {...rest} />;
}

/** Thẻ chạm được (vd thẻ bàn) — là <button> thật để bàn phím/trình đọc màn hình dùng được. */
export function CardButton({
  selected,
  dashed,
  className,
  type = 'button',
  ...rest
}: CardLook & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} aria-pressed={selected} className={cardClass({ selected, dashed }, className)} {...rest} />;
}
