export type GameStatus = 'idle' | 'playing' | 'paused' | 'success' | 'error';

const STATUS: Record<GameStatus, { color: string; icon: string; label: string }> = {
  idle: { color: 'var(--color-muted)', icon: '○', label: 'Idle' },
  playing: { color: 'var(--color-memory)', icon: '▸', label: 'Playing' },
  paused: { color: 'var(--color-reaction)', icon: '‖', label: 'Paused' },
  success: { color: 'var(--color-snake)', icon: '✓', label: 'Done' },
  error: { color: 'var(--color-danger)', icon: '!', label: 'Error' },
};

interface StatusBadgeProps {
  status: GameStatus;
  /** Override the default label text while keeping the icon and color. */
  label?: string;
}

/**
 * State is conveyed by icon, text, and color together, never color alone.
 * Place inside an aria-live region (GameShell does this) for announcements.
 */
export function StatusBadge({ status, label }: StatusBadgeProps) {
  const meta = STATUS[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
      style={{
        color: meta.color,
        borderColor: 'color-mix(in srgb, currentColor 45%, transparent)',
        backgroundColor: 'color-mix(in srgb, currentColor 14%, transparent)',
      }}
    >
      <span aria-hidden="true">{meta.icon}</span>
      {label ?? meta.label}
    </span>
  );
}
