import type { ElementType } from 'react';

interface WordmarkProps {
  as?: ElementType;
  className?: string;
}

/** The "Pixel Pocket Arcade" lockup. Visible text carries the name; the
 * leading block is decorative. ARCADE glows in the brand accent. */
export function Wordmark({ as: Tag = 'span', className = '' }: WordmarkProps) {
  return (
    <Tag className={`font-display font-bold uppercase tracking-[0.08em] ${className}`}>
      <span aria-hidden="true" className="text-brand">
        {'■ '}
      </span>
      <span className="text-fg">Pixel Pocket </span>
      <span className="text-brand">Arcade</span>
    </Tag>
  );
}
