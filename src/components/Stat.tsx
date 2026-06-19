import type { ReactNode } from 'react';

interface StatProps {
  label: string;
  value: ReactNode;
  /** Optional CSS color (for example 'var(--accent)') for the value. */
  accent?: string;
}

/** A label-over-value readout with tabular figures so digits never jitter. */
export function Stat({ label, value, accent }: StatProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <span
        className="font-mono text-2xl font-bold tabular-nums text-fg"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
