import { useState, useEffect, useRef, useCallback } from 'react';
import { GameShell } from '../../components/GameShell';
import { StatusBadge } from '../../components/StatusBadge';
import { Stat } from '../../components/Stat';
import { getGame } from '../../data/games';
import { useArcade } from '../../hooks/useArcade';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { isBetterMemory, formatElapsed } from '../../lib/records';
import { audio } from '../../lib/audio';
import { createGame, flipCard, dismissMismatch } from './memoryLogic';
import type { MemoryState } from './memoryLogic';

const game = getGame('memory');

export default function MemoryGame() {
  const { state, recordResult } = useArcade();
  const reducedMotion = useReducedMotion();

  const [gameState, setGameState] = useState<MemoryState>(() => createGame());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  // Refs for stable reads in event handlers and timer management.
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState; // always current during render

  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultRecordedRef = useRef(false);
  const elapsedMsRef = useRef(0);

  // ------------------------------------------------------------------
  // Timer: started in handleFlip (not an effect) to avoid strict-mode
  // double-invocation issues with intervals.
  // ------------------------------------------------------------------

  // Unmount cleanup only.
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  // Auto-dismiss mismatch after a fixed reveal window. The window stays the same
  // for reduced-motion users so they can still read and compare the mismatched
  // pair; only the flip animation is disabled (see the card transition below).
  useEffect(() => {
    if (gameState.phase !== 'locked') return;
    const id = setTimeout(() => setGameState(prev => dismissMismatch(prev)), 800);
    return () => clearTimeout(id);
  }, [gameState.phase, gameState.moves]);

  // Record result once when game completes.
  useEffect(() => {
    if (gameState.phase !== 'complete' || resultRecordedRef.current) return;
    resultRecordedRef.current = true;
    const finalMs = elapsedMsRef.current;
    const best = state.records.memoryBest;
    if (isBetterMemory({ moves: gameState.moves, elapsedMs: finalMs }, best)) {
      setIsNewBest(true);
    }
    recordResult({ game: 'memory', moves: gameState.moves, elapsedMs: finalMs });
  }, [gameState.phase, gameState.moves, state.records.memoryBest, recordResult]);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleFlip = useCallback((idx: number) => {
    const prev = gameStateRef.current;
    const next = flipCard(prev, idx);
    if (next === prev) return;

    // Start timer on the very first card flip.
    if (prev.phase === 'idle') {
      startTimeRef.current = performance.now();
      intervalRef.current = window.setInterval(() => {
        const ms = performance.now() - startTimeRef.current!;
        elapsedMsRef.current = ms;
        setElapsedMs(ms);
      }, 100);
    }

    // Stop timer when all pairs are matched.
    if (next.phase === 'complete' && intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      const finalMs =
        startTimeRef.current !== null ? performance.now() - startTimeRef.current : 0;
      elapsedMsRef.current = finalMs;
      setElapsedMs(finalMs);
    }

    // Audio - unlock on first touch, then cue the event type.
    audio.unlock();
    if (next.phase === 'complete') {
      audio.play('success');
    } else if (next.phase === 'locked') {
      audio.play('error');
    } else if (next.moves > prev.moves) {
      // moves only increments on the 2nd card; if not locked → match
      audio.play('success');
    } else {
      audio.play('select');
    }

    setGameState(next);
  }, []);

  const handleRestart = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = null;
    resultRecordedRef.current = false;
    elapsedMsRef.current = 0;
    setElapsedMs(0);
    setIsNewBest(false);
    setGameState(createGame());
  }, []);

  // ------------------------------------------------------------------
  // Derived display values
  // ------------------------------------------------------------------

  const { phase, moves } = gameState;
  const memoryBest = state.records.memoryBest;

  const statusBadge =
    phase === 'complete' ? (
      <StatusBadge status="success" label={isNewBest ? 'New Best!' : 'Complete!'} />
    ) : phase === 'idle' ? (
      <StatusBadge status="idle" />
    ) : phase === 'locked' ? (
      <StatusBadge status="playing" label="Checking…" />
    ) : (
      <StatusBadge status="playing" />
    );

  const stats = (
    <>
      <Stat label="Moves" value={moves} />
      <Stat label="Time" value={formatElapsed(elapsedMs)} />
      <Stat
        label="Best"
        value={
          memoryBest
            ? `${memoryBest.moves} | ${formatElapsed(memoryBest.elapsedMs)}`
            : '-'
        }
      />
      {isNewBest && <Stat label="Record" value="🏆" accent="var(--accent)" />}
    </>
  );

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <GameShell
      game={game}
      status={statusBadge}
      stats={stats}
      onRestart={handleRestart}
      restartLabel="New Game"
    >
      {/* 4×4 responsive grid - fits 375 px phone with no horizontal scroll */}
      <div className="grid w-full max-w-xs grid-cols-4 gap-2 sm:max-w-sm">
        {gameState.cards.map((card, idx) => {
          const isDown = card.face === 'down';
          // Do not disable face-down cards during the mismatch lock: keep keyboard
          // focus in place. flipCard() already no-ops while phase is 'locked'.
          const isDisabled = !isDown || phase === 'complete';

          const ariaLabel = isDown
            ? `Card ${idx + 1}, face down`
            : card.face === 'matched'
              ? `${card.symbol}, matched`
              : card.symbol;

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleFlip(idx)}
              disabled={isDisabled}
              aria-label={ariaLabel}
              className="group relative aspect-square min-h-[44px] rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-default"
              style={{
                transformStyle: 'preserve-3d',
                transition: reducedMotion ? 'none' : 'transform 0.3s ease',
                transform: !isDown
                  ? 'perspective(600px) rotateY(180deg)'
                  : 'perspective(600px) rotateY(0deg)',
              }}
            >
              {/* Back face (shown when face-down) */}
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center rounded-md border-2 border-border-strong bg-surface group-hover:border-[var(--accent)]"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <span className="select-none font-display text-xl font-bold text-muted">
                  ?
                </span>
              </span>
              {/* Front face (shown when face-up or matched) */}
              <span
                aria-hidden="true"
                className={`absolute inset-0 flex items-center justify-center rounded-md border-2 border-[var(--accent)] bg-raised text-2xl select-none${card.face === 'matched' ? ' opacity-60' : ''}`}
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                {card.symbol}
              </span>
            </button>
          );
        })}
      </div>

      {/* Screen-reader completion announcement */}
      {phase === 'complete' && (
        <p className="sr-only" aria-live="assertive">
          {isNewBest
            ? `Congratulations! New best: ${moves} moves in ${formatElapsed(elapsedMs)}.`
            : `Puzzle complete in ${moves} moves and ${formatElapsed(elapsedMs)}.`}
        </p>
      )}
    </GameShell>
  );
}
