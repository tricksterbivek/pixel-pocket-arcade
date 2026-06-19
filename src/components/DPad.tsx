import type { ReactNode } from 'react';

export type Direction = 'up' | 'down' | 'left' | 'right';

interface DPadProps {
  onDirection: (direction: Direction) => void;
  onCenter?: () => void;
  centerLabel?: ReactNode;
  centerAriaLabel?: string;
  disabled?: boolean;
}

const ARROWS: Record<Direction, string> = { up: '▲', down: '▼', left: '◀', right: '▶' };
const POSITION: Record<Direction, string> = {
  up: 'col-start-2 row-start-1',
  left: 'col-start-1 row-start-2',
  right: 'col-start-3 row-start-2',
  down: 'col-start-2 row-start-3',
};

// `touch-none` (touch-action: none) is the platform way to stop the page from
// scrolling or zooming when a directional control is tapped or held. No JS
// preventDefault gymnastics required.
const PAD_BUTTON =
  'flex h-14 w-14 items-center justify-center rounded-md border-2 border-border-strong bg-raised ' +
  'text-fg text-lg touch-none select-none shadow-pixel transition-transform duration-100 ease-out ' +
  'active:scale-95 disabled:opacity-50';

export function DPad({ onDirection, onCenter, centerLabel, centerAriaLabel, disabled }: DPadProps) {
  return (
    <div
      className="grid grid-cols-3 grid-rows-3 gap-2 touch-none [overscroll-behavior:contain]"
      role="group"
      aria-label="Directional pad"
    >
      {(Object.keys(ARROWS) as Direction[]).map((dir) => (
        <button
          key={dir}
          type="button"
          aria-label={dir.charAt(0).toUpperCase() + dir.slice(1)}
          disabled={disabled}
          onClick={() => onDirection(dir)}
          className={`${PAD_BUTTON} ${POSITION[dir]}`}
        >
          <span aria-hidden="true">{ARROWS[dir]}</span>
        </button>
      ))}
      {onCenter ? (
        <button
          type="button"
          aria-label={centerAriaLabel ?? 'Pause or resume'}
          disabled={disabled}
          onClick={onCenter}
          className={`${PAD_BUTTON} col-start-2 row-start-2 text-sm`}
        >
          {centerLabel ?? <span aria-hidden="true">‖</span>}
        </button>
      ) : (
        <span className="col-start-2 row-start-2" aria-hidden="true" />
      )}
    </div>
  );
}
