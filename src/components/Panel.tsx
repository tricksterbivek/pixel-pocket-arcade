import type { HTMLAttributes } from 'react';

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
}

/** Bordered arcade surface used for stats, sections, and modal bodies. */
export function Panel({ raised = false, className = '', ...rest }: PanelProps) {
  const bg = raised ? 'bg-raised' : 'bg-surface';
  return (
    <div
      className={`rounded-md border-2 border-border ${bg} p-4 shadow-raised ${className}`}
      {...rest}
    />
  );
}
