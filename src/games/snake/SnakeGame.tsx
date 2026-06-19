import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { GameShell } from '../../components/GameShell';
import { StatusBadge } from '../../components/StatusBadge';
import { Stat } from '../../components/Stat';
import { DPad } from '../../components/DPad';
import { getGame } from '../../data/games';
import { useArcade } from '../../hooks/useArcade';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { audio } from '../../lib/audio';
import {
  createInitialState,
  tick,
  setDirection,
  speedForScore,
  type SnakeState,
  type Direction,
  type GamePhase,
  GRID_SIZE,
} from './snakeLogic';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Internal canvas resolution. CSS will scale this to fit the viewport. */
const CANVAS_PX = 400;

/** Theme colours - match src/index.css `@theme` values exactly. */
const CLR = {
  bg:        '#0b0e14',
  grid:      'rgba(255,255,255,0.04)',
  bodyA:     '#1fa84d',
  bodyB:     '#27c85e',
  head:      '#34e27a', // --color-snake
  food:      '#ff5a5a', // --color-danger
  overlay:   'rgba(11,14,20,0.88)',
} as const;

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type Action =
  | { type: 'direction'; dir: Direction }
  | { type: 'tick' }
  | { type: 'toggle-pause' }
  | { type: 'pause' }
  | { type: 'restart' };

function reducer(state: SnakeState, action: Action): SnakeState {
  switch (action.type) {
    case 'direction':
      // First input starts the game from idle
      if (state.phase === 'idle') return { ...setDirection(state, action.dir), phase: 'playing' };
      if (state.phase !== 'playing') return state;
      return setDirection(state, action.dir);
    case 'tick':
      return tick(state); // tick() is a no-op when phase !== 'playing'
    case 'toggle-pause':
      if (state.phase === 'playing') return { ...state, phase: 'paused' };
      if (state.phase === 'paused')  return { ...state, phase: 'playing' };
      return state;
    case 'pause':
      if (state.phase === 'playing') return { ...state, phase: 'paused' };
      return state;
    case 'restart':
      return createInitialState(GRID_SIZE);
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Canvas drawing
// ---------------------------------------------------------------------------

function drawBoard(
  ctx: CanvasRenderingContext2D,
  state: SnakeState,
  skipDecorations: boolean,
): void {
  const { gridSize, snake, food } = state;
  const cell = CANVAS_PX / gridSize;

  // Background
  ctx.fillStyle = CLR.bg;
  ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

  // Grid lines (decorative - skip for reduced-motion users)
  if (!skipDecorations) {
    ctx.strokeStyle = CLR.grid;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= gridSize; i++) {
      const p = i * cell;
      ctx.beginPath(); ctx.moveTo(p, 0);         ctx.lineTo(p, CANVAS_PX); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p);         ctx.lineTo(CANVAS_PX, p); ctx.stroke();
    }
  }

  // Snake body (alternating shade for visibility)
  const gap = Math.max(1, Math.floor(cell * 0.1));
  for (let i = 1; i < snake.length; i++) {
    const p = snake[i];
    ctx.fillStyle = i % 2 === 0 ? CLR.bodyA : CLR.bodyB;
    ctx.fillRect(p.x * cell + gap, p.y * cell + gap, cell - gap * 2, cell - gap * 2);
  }

  // Head (brighter)
  const head = snake[0];
  ctx.fillStyle = CLR.head;
  ctx.fillRect(head.x * cell + gap, head.y * cell + gap, cell - gap * 2, cell - gap * 2);

  // Food (filled circle)
  const cx = food.x * cell + cell / 2;
  const cy = food.y * cell + cell / 2;
  ctx.fillStyle = CLR.food;
  ctx.beginPath();
  ctx.arc(cx, cy, cell * 0.32, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function speedLevel(score: number): number {
  if (score >= 50) return 6;
  if (score >= 30) return 5;
  if (score >= 20) return 4;
  if (score >= 10) return 3;
  if (score >= 5)  return 2;
  return 1;
}

const STATUS_MAP: Record<GamePhase, 'idle' | 'playing' | 'paused' | 'error'> = {
  idle:    'idle',
  playing: 'playing',
  paused:  'paused',
  over:    'error',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SnakeGame() {
  const game = getGame('snake');
  const { state: arcadeState, recordResult } = useArcade();
  const highScore = arcadeState.records.snakeHighScore;
  const reducedMotion = useReducedMotion();

  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState(GRID_SIZE));
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stable refs so audio effects don't need stale closure deps
  const highScoreRef = useRef(highScore);
  highScoreRef.current = highScore;
  const recordResultRef = useRef(recordResult);
  recordResultRef.current = recordResult;
  const gameOverHandledRef = useRef(false);
  const prevScoreRef = useRef(state.score);

  // Show "New high score!" in the game-over overlay (set once per game)
  const [isNewHigh, setIsNewHigh] = useState(false);

  // ---- canvas draw ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawBoard(ctx, state, reducedMotion);
  }, [state, reducedMotion]);

  // ---- game loop timer ----
  const intervalMs = speedForScore(state.score);
  useEffect(() => {
    if (state.phase !== 'playing') return;
    const id = window.setInterval(() => dispatch({ type: 'tick' }), intervalMs);
    return () => clearInterval(id);
  }, [state.phase, intervalMs]);

  // ---- audio: score ----
  useEffect(() => {
    if (state.score > prevScoreRef.current) {
      audio.play('score');
    }
    prevScoreRef.current = state.score;
  }, [state.score]);

  // ---- audio + recordResult: game over (fire once per game) ----
  useEffect(() => {
    if (state.phase === 'over' && !gameOverHandledRef.current) {
      gameOverHandledRef.current = true;
      const newHigh = state.score > 0 && state.score > highScoreRef.current;
      setIsNewHigh(newHigh);
      audio.play(newHigh ? 'success' : 'error');
      recordResultRef.current({ game: 'snake', score: state.score });
    }
    if (state.phase !== 'over') {
      gameOverHandledRef.current = false;
      setIsNewHigh(false);
    }
  }, [state.phase, state.score]);

  // ---- keyboard controls ----
  useEffect(() => {
    const ARROW = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    function onKeyDown(e: KeyboardEvent) {
      if (ARROW.has(e.key)) e.preventDefault(); // never scroll the page while playing
      audio.unlock();
      switch (e.key) {
        case 'ArrowUp':    case 'w': case 'W': dispatch({ type: 'direction', dir: 'up'    }); break;
        case 'ArrowDown':  case 's': case 'S': dispatch({ type: 'direction', dir: 'down'  }); break;
        case 'ArrowLeft':  case 'a': case 'A': dispatch({ type: 'direction', dir: 'left'  }); break;
        case 'ArrowRight': case 'd': case 'D': dispatch({ type: 'direction', dir: 'right' }); break;
        case ' ': case 'p': case 'P': dispatch({ type: 'toggle-pause' }); break;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // ---- auto-pause on tab hide / window blur ----
  const handleHidden = useCallback(() => dispatch({ type: 'pause' }), []);
  usePageVisibility(handleHidden);

  // ---- d-pad / button callbacks (stable) ----
  const handleDirection = useCallback((dir: Direction) => {
    audio.unlock();
    dispatch({ type: 'direction', dir });
  }, []);
  const handleCenter = useCallback(() => dispatch({ type: 'toggle-pause' }), []);
  const handleRestart = useCallback(() => dispatch({ type: 'restart' }), []);

  const isPaused = state.phase === 'paused';

  return (
    <GameShell
      game={game}
      status={
        <StatusBadge
          status={STATUS_MAP[state.phase]}
          label={state.phase === 'over' ? 'Game Over' : undefined}
        />
      }
      stats={
        <>
          <Stat label="Score" value={state.score} accent="var(--accent)" />
          <Stat label="Best"  value={highScore} />
          <Stat label="Speed" value={`Lv ${speedLevel(state.score)}`} />
        </>
      }
      onRestart={handleRestart}
      controls={
        <DPad
          onDirection={handleDirection}
          onCenter={handleCenter}
          centerLabel={<span aria-hidden="true">{isPaused ? '▸' : '‖'}</span>}
          centerAriaLabel={isPaused ? 'Resume' : 'Pause'}
        />
      }
    >
      {/*
        Board: square, fits any phone >= 375 px wide with no horizontal scroll.
        `min()` caps at 480 px on desktop while keeping it inside the viewport.
        ponytail: CSS min() over JS ResizeObserver - fewer moving parts.
      */}
      <div
        style={{ width: 'min(90vw, 55vh, 480px)', aspectRatio: '1 / 1' }}
        className="relative overflow-hidden rounded-md border-2 border-border shadow-pixel"
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_PX}
          height={CANVAS_PX}
          style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
          aria-label="Snake game board"
          role="img"
        />

        {/* Idle overlay */}
        {state.phase === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: CLR.overlay }}>
            <p className="font-display text-sm text-muted px-4 text-center">
              Press an arrow key or D-pad to start
            </p>
          </div>
        )}

        {/* Paused overlay */}
        {state.phase === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: CLR.overlay }}>
            <p className="font-display text-sm text-muted px-4 text-center">
              Paused - Space · P · center button to resume
            </p>
          </div>
        )}

        {/* Game-over overlay */}
        {state.phase === 'over' && (
          <div
            role="alert"
            aria-live="assertive"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: CLR.overlay }}
          >
            <p
              className="font-display text-2xl font-bold"
              style={{ color: CLR.food }}
            >
              Game Over
            </p>
            <p className="font-display text-sm text-muted">Score: {state.score}</p>
            {isNewHigh && (
              <p
                className="font-display text-sm font-semibold"
                style={{ color: CLR.head }}
              >
                ✦ New high score!
              </p>
            )}
            <p className="font-display text-xs text-muted mt-1">Press Restart to play again</p>
          </div>
        )}
      </div>
    </GameShell>
  );
}
