import type { HTMLAttributes } from 'react';

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
}

/** Glassy rounded surface used for stats, sections, and modal bodies. */
export function Panel({ raised = false, className = '', ...rest }: PanelProps) {
  const bg = raised ? 'bg-raised/70' : 'bg-surface/70';
  return (
    <div
      className={`rounded-lg border border-border ${bg} p-5 shadow-raised backdrop-blur ${className}`}
      {...rest}
    />
  );
}
