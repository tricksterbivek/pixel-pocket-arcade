import type { ElementType } from 'react';

interface WordmarkProps {
  as?: ElementType;
  className?: string;
}

/** Compact brand lockup: a gradient logo tile plus the name. */
export function Wordmark({ as: Tag = 'span', className = '' }: WordmarkProps) {
  return (
    <Tag className={`inline-flex items-center gap-2 font-display font-extrabold tracking-tight ${className}`}>
      <span
        aria-hidden="true"
        className="grid aspect-square h-[1.15em] place-items-center rounded-[0.3em] bg-linear-to-br from-brand to-memory text-[0.62em] text-inverse shadow-raised"
      >
        ▶
      </span>
      <span className="text-fg">
        Pixel Pocket <span className="text-brand">Arcade</span>
      </span>
    </Tag>
  );
}
