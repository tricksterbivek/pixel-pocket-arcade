import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { GameDefinition } from '../types/game';
import { Button } from './Button';
import { Panel } from './Panel';

interface GameShellProps {
  game: GameDefinition;
  /** Status indicator (for example a StatusBadge). Announced via a live region. */
  status?: ReactNode;
  /** Score or performance readouts (for example Stat components). */
  stats?: ReactNode;
  onRestart?: () => void;
  restartLabel?: string;
  /** Extra controls rendered under the board, for example a touch D-pad. */
  controls?: ReactNode;
  children: ReactNode;
}

/**
 * Shared chrome for every game page: back navigation, the page h1, text
 * instructions, a live status region, stats, a responsive board area, the
 * restart control, and an optional controls slot. Exposes the game accent as
 * the `--accent` CSS variable for children to use.
 */
export function GameShell({
  game,
  status,
  stats,
  onRestart,
  restartLabel = 'Restart',
  controls,
  children,
}: GameShellProps) {
  const accentStyle = { ['--accent']: `var(${game.accent})` } as CSSProperties;

  return (
    <div style={accentStyle} className="mx-auto w-full max-w-3xl px-4 pb-12 [overscroll-behavior:contain]">
      <Link
        to="/"
        className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-semibold text-muted hover:text-fg"
      >
        <span aria-hidden="true">‹</span> Back to arcade
      </Link>

      <header className="mt-1">
        <h1 className="text-3xl" style={{ color: 'var(--accent)' }}>
          {game.title}
        </h1>
        <p className="mt-2 max-w-prose text-muted">{game.description}</p>
        <details className="mt-2">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-muted hover:text-fg">
            How to play
          </summary>
          <ul className="mt-1 list-disc pl-5 text-sm text-muted">
            {game.controls.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      </header>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div aria-live="polite" className="flex min-h-11 items-center">
          {status}
        </div>
        {onRestart && (
          <Button variant="secondary" onClick={onRestart}>
            {restartLabel}
          </Button>
        )}
      </div>

      {stats && (
        <Panel className="mt-4">
          <div className="flex flex-wrap gap-x-8 gap-y-4">{stats}</div>
        </Panel>
      )}

      <div className="mt-5 flex justify-center overflow-hidden">{children}</div>

      {controls && <div className="mt-6 flex justify-center">{controls}</div>}
    </div>
  );
}
