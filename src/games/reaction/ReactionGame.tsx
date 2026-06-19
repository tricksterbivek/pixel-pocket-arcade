import { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { GameShell } from '../../components/GameShell';
import { StatusBadge } from '../../components/StatusBadge';
import { Stat } from '../../components/Stat';
import { getGame } from '../../data/games';
import { useArcade } from '../../hooks/useArcade';
import { isBetterReactionAvg } from '../../lib/records';
import { audio } from '../../lib/audio';
import { reactionReducer, initialState, calcAverage, ROUNDS_REQUIRED } from './reactionLogic';
import type { Phase } from './reactionLogic';

const game = getGame('reaction');

// Maps reducer phase → StatusBadge props
const STATUS_MAP: Record<
  Phase,
  { status: 'idle' | 'playing' | 'paused' | 'success' | 'error'; label: string }
> = {
  idle:      { status: 'idle',    label: 'Ready' },
  waiting:   { status: 'paused',  label: 'Wait...' },
  ready:     { status: 'playing', label: 'Go!' },
  result:    { status: 'success', label: 'Round done' },
  tooSoon:   { status: 'error',   label: 'Too soon!' },
  completed: { status: 'success', label: 'Complete' },
};

interface TargetTheme {
  borderColor: string;
  bg: string;
  color: string;
  headline: string;
  sub: string | null;
  pulse: boolean;
}

function getTheme(
  phase: Phase,
  lastMs: number | null,
  roundNum: number,
  sessionAvg: number | null,
  isNewBest: boolean,
): TargetTheme {
  switch (phase) {
    case 'idle':
      return {
        borderColor: 'var(--color-border)',
        bg: 'transparent',
        color: 'var(--color-muted)',
        headline: 'Tap to Start',
        sub: 'Click · Space · Touch',
        pulse: false,
      };
    case 'waiting':
      return {
        borderColor: 'var(--color-reaction)',
        bg: 'color-mix(in srgb, var(--color-reaction) 10%, transparent)',
        color: 'var(--color-reaction)',
        headline: 'Wait...',
        sub: `Round ${roundNum} of ${ROUNDS_REQUIRED}`,
        pulse: false,
      };
    case 'ready':
      return {
        borderColor: 'var(--color-snake)',
        bg: 'color-mix(in srgb, var(--color-snake) 18%, transparent)',
        color: 'var(--color-snake)',
        headline: 'GO!',
        sub: 'React now!',
        pulse: true, // CSS @media reduces this automatically
      };
    case 'result':
      return {
        borderColor: 'var(--color-border)',
        bg: 'transparent',
        color: 'var(--color-fg)',
        headline: `${lastMs ?? 0} ms`,
        sub: 'Tap for next round',
        pulse: false,
      };
    case 'tooSoon':
      return {
        borderColor: 'var(--color-danger)',
        bg: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
        color: 'var(--color-danger)',
        headline: 'Too Soon!',
        sub: 'Tap to retry this round',
        pulse: false,
      };
    case 'completed':
      return {
        borderColor: 'var(--color-snake)',
        bg: 'color-mix(in srgb, var(--color-snake) 10%, transparent)',
        color: 'var(--color-snake)',
        headline: `${sessionAvg ?? 0} ms`,
        sub: isNewBest ? 'New best average!' : 'Session average',
        pulse: false,
      };
  }
}

export default function ReactionGame() {
  const [state, dispatch] = useReducer(reactionReducer, initialState);
  const { state: arcadeState, recordResult } = useArcade();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyAtRef = useRef<number | null>(null);
  const recordedRef = useRef(false);
  const [isNewBest, setIsNewBest] = useState(false);

  const clearWaitTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { clearWaitTimer(); }, [clearWaitTimer]);

  // Arm: dispatch ARM then schedule the random-wait before READY
  const arm = useCallback(() => {
    clearWaitTimer();
    readyAtRef.current = null;
    dispatch({ type: 'ARM' });
    audio.play('select');
    const waitMs = 1000 + Math.random() * 2000; // 1000-3000 ms
    timerRef.current = setTimeout(() => {
      readyAtRef.current = performance.now();
      dispatch({ type: 'READY' });
      timerRef.current = null;
    }, waitMs);
  }, [clearWaitTimer]);

  const restart = useCallback(() => {
    clearWaitTimer();
    readyAtRef.current = null;
    recordedRef.current = false;
    setIsNewBest(false);
    dispatch({ type: 'RESTART' });
  }, [clearWaitTimer]);

  // Record result exactly once after five valid rounds
  useEffect(() => {
    if (state.phase !== 'completed' || recordedRef.current) return;
    recordedRef.current = true;
    const averageMs = calcAverage(state.rounds);
    const better = isBetterReactionAvg(averageMs, arcadeState.records.reactionBestAverageMs);
    setIsNewBest(better);
    recordResult({ game: 'reaction', averageMs, rounds: state.rounds });
    audio.play('success');
  }, [state.phase, state.rounds, arcadeState.records.reactionBestAverageMs, recordResult]);

  // Single activation - branches on current phase
  const activate = useCallback(() => {
    audio.unlock();
    switch (state.phase) {
      case 'idle':
        arm();
        break;
      case 'waiting': {
        clearWaitTimer();
        dispatch({ type: 'TOO_SOON' });
        audio.play('error');
        break;
      }
      case 'ready': {
        const elapsed =
          readyAtRef.current !== null
            ? Math.round(performance.now() - readyAtRef.current)
            : 0;
        readyAtRef.current = null;
        const completesSession = state.rounds.length + 1 >= ROUNDS_REQUIRED;
        dispatch({ type: 'REACT', time: elapsed });
        // On the final round the completion effect plays the success cue, so
        // skip the per-round cue here to avoid a doubled sound.
        if (!completesSession) audio.play('success');
        break;
      }
      case 'result':
      case 'tooSoon':
        arm();
        break;
      case 'completed':
        // No action - "New Game" button in GameShell handles restart
        break;
    }
  }, [state.phase, state.rounds.length, arm, clearWaitTimer]);

  // Pointer (mouse + touch) - use onPointerDown so we don't fire twice via click
  function handlePointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    e.preventDefault(); // suppress the synthesized mouse events that follow touch
    activate();
  }

  // Keyboard - Space / Enter only; preventDefault prevents scroll + synthetic click
  function handleKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      activate();
    }
  }

  // ── Derived display values ────────────────────────────────────────────────
  const { status, label } = STATUS_MAP[state.phase];
  const roundNum = Math.min(state.rounds.length + 1, ROUNDS_REQUIRED);
  const bestMs = arcadeState.records.reactionBestAverageMs;
  const sessionAvg =
    state.phase === 'completed' ? Math.round(calcAverage(state.rounds)) : null;

  const theme = getTheme(
    state.phase,
    state.lastMs,
    roundNum,
    sessionAvg,
    isNewBest,
  );

  return (
    <GameShell
      game={game}
      status={<StatusBadge status={status} label={label} />}
      stats={
        <>
          <Stat
            label="Round"
            value={`${state.phase === 'completed' ? ROUNDS_REQUIRED : roundNum} / ${ROUNDS_REQUIRED}`}
          />
          <Stat
            label="Last"
            value={state.lastMs !== null ? `${state.lastMs} ms` : '-'}
            accent={state.lastMs !== null ? 'var(--color-reaction)' : undefined}
          />
          <Stat
            label="Best avg"
            value={bestMs !== null ? `${Math.round(bestMs)} ms` : '-'}
            accent={bestMs !== null ? 'var(--color-snake)' : undefined}
          />
        </>
      }
      onRestart={restart}
      restartLabel="New Game"
    >
      <button
        type="button"
        className={[
          'flex aspect-square w-full max-w-md cursor-pointer select-none flex-col',
          'items-center justify-center gap-4 rounded-lg border-4',
          'touch-manipulation transition-colors duration-150',
          state.phase === 'ready' ? 'animate-pulse' : '',
          state.phase === 'completed' ? 'cursor-default' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          borderColor: theme.borderColor,
          backgroundColor: theme.bg,
          color: theme.color,
        }}
        aria-label={
          theme.headline + (theme.sub ? `. ${theme.sub}` : '')
        }
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
      >
        <span className="font-display text-5xl font-bold leading-none tabular-nums">
          {theme.headline}
        </span>
        {theme.sub && (
          <span className="font-display text-base font-semibold opacity-70">
            {theme.sub}
          </span>
        )}
      </button>
    </GameShell>
  );
}
