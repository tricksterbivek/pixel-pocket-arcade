/**
 * Pure deterministic Snake game logic.
 * No React, no timers, no localStorage. Inject randomness via `rng`.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';
export type GamePhase = 'idle' | 'playing' | 'paused' | 'over';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface SnakeState {
  readonly snake: readonly Point[];   // [0] = head
  readonly food: Point;
  readonly direction: Direction;
  readonly nextDirection: Direction;  // queued input, applied on next tick
  readonly score: number;
  readonly phase: GamePhase;
  readonly gridSize: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GRID_SIZE = 20;

const DELTA: Record<Direction, Point> = {
  up:    { x:  0, y: -1 },
  down:  { x:  0, y:  1 },
  left:  { x: -1, y:  0 },
  right: { x:  1, y:  0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
};

// ---------------------------------------------------------------------------
// Speed progression (stepped, pure function)
// ---------------------------------------------------------------------------

/** Returns the tick interval in milliseconds for a given score. */
export function speedForScore(score: number): number {
  if (score >= 50) return 80;
  if (score >= 30) return 100;
  if (score >= 20) return 125;
  if (score >= 10) return 150;
  if (score >= 5)  return 175;
  return 200;
}

// ---------------------------------------------------------------------------
// Food placement
// ---------------------------------------------------------------------------

/**
 * Returns a random free cell not occupied by the snake.
 * Uses `rng` (injected) for testability. Enumerates all free cells to
 * guarantee the result is never on the snake - no rejection loop needed.
 */
export function placeFood(
  snake: readonly Point[],
  gridSize: number,
  rng: () => number = Math.random,
): Point {
  const occupied = new Set(snake.map(p => `${p.x},${p.y}`));
  const free: Point[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  // Fallback: if grid is somehow completely full, return center (shouldn't happen in practice)
  if (free.length === 0) return { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) };
  return free[Math.floor(rng() * free.length)];
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

/** Creates the opening state. Phase is 'idle' - game doesn't move until first input. */
export function createInitialState(
  gridSize: number = GRID_SIZE,
  rng: () => number = Math.random,
): SnakeState {
  const cx = Math.floor(gridSize / 2);
  const cy = Math.floor(gridSize / 2);
  // 3-cell snake facing right: head at center
  const snake: Point[] = [
    { x: cx,     y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  const food = placeFood(snake, gridSize, rng);
  return {
    snake,
    food,
    direction: 'right',
    nextDirection: 'right',
    score: 0,
    phase: 'idle',
    gridSize,
  };
}

// ---------------------------------------------------------------------------
// Direction input
// ---------------------------------------------------------------------------

/**
 * Queues a direction change. Opposite directions are silently ignored to
 * prevent the snake reversing into itself.
 */
export function setDirection(state: SnakeState, dir: Direction): SnakeState {
  if (OPPOSITE[state.direction] === dir) return state;
  return { ...state, nextDirection: dir };
}

// ---------------------------------------------------------------------------
// Tick (one game step)
// ---------------------------------------------------------------------------

/**
 * Advances the game by one step. Returns the same state when not 'playing'.
 * Collision: wall → 'over'. Self-collision → 'over'.
 * Food eaten → score++, snake grows, new food placed.
 */
export function tick(
  state: SnakeState,
  rng: () => number = Math.random,
): SnakeState {
  if (state.phase !== 'playing') return state;

  // Apply the queued direction (already validated against reversal in setDirection)
  const direction: Direction =
    OPPOSITE[state.direction] === state.nextDirection
      ? state.direction
      : state.nextDirection;

  const head = state.snake[0];
  const d = DELTA[direction];
  const newHead: Point = { x: head.x + d.x, y: head.y + d.y };

  // Wall collision
  if (
    newHead.x < 0 || newHead.x >= state.gridSize ||
    newHead.y < 0 || newHead.y >= state.gridSize
  ) {
    return { ...state, direction, phase: 'over' };
  }

  const eating = newHead.x === state.food.x && newHead.y === state.food.y;

  // Self-collision: check newHead against body cells that will NOT vacate.
  // When not eating the tail pops, so exclude it from the check.
  const bodyToCheck = eating
    ? state.snake                        // tail stays → all cells occupied
    : state.snake.slice(0, -1);          // tail vacates → exclude it

  if (bodyToCheck.some(p => p.x === newHead.x && p.y === newHead.y)) {
    return { ...state, direction, phase: 'over' };
  }

  const newSnake: Point[] = eating
    ? [newHead, ...state.snake]
    : [newHead, ...state.snake.slice(0, -1)];

  if (eating) {
    const newScore = state.score + 1;
    const newFood = placeFood(newSnake, state.gridSize, rng);
    return { ...state, direction, snake: newSnake, food: newFood, score: newScore };
  }

  return { ...state, direction, snake: newSnake };
}
