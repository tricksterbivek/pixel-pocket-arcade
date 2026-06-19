/**
 * Pure unit tests for snake game logic.
 * All tests are synchronous - no timers, no React, no side effects.
 * Written BEFORE the implementation (TDD red phase).
 */
import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  tick,
  setDirection,
  speedForScore,
  placeFood,
  type SnakeState,
  type Point,
} from './snakeLogic';

const GRID = 10;

// Helper: build a minimal playing state for targeted collision tests
function playingState(overrides: Partial<SnakeState>): SnakeState {
  return {
    snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }],
    food: { x: 0, y: 0 },
    direction: 'right',
    nextDirection: 'right',
    score: 0,
    phase: 'playing',
    gridSize: GRID,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------
describe('movement', () => {
  it('head advances in the current direction (right)', () => {
    const state = playingState({
      snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
      direction: 'right',
      nextDirection: 'right',
      food: { x: 9, y: 9 },
    });
    const next = tick(state);
    expect(next.snake[0]).toEqual({ x: 6, y: 5 });
  });

  it('head advances upward when direction is up', () => {
    const state = playingState({
      snake: [{ x: 5, y: 5 }, { x: 5, y: 6 }],
      direction: 'up',
      nextDirection: 'up',
      food: { x: 9, y: 9 },
    });
    const next = tick(state);
    expect(next.snake[0]).toEqual({ x: 5, y: 4 });
  });

  it('second segment is where head was (body follows)', () => {
    const state = playingState({
      snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
      direction: 'right',
      nextDirection: 'right',
      food: { x: 9, y: 9 },
    });
    const prevHead = state.snake[0];
    const next = tick(state);
    expect(next.snake[1]).toEqual(prevHead);
  });

  it('snake length stays the same when not eating', () => {
    const state = playingState({
      snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
      direction: 'right',
      nextDirection: 'right',
      food: { x: 9, y: 9 },
    });
    const next = tick(state);
    expect(next.snake.length).toBe(state.snake.length);
  });
});

// ---------------------------------------------------------------------------
// Growth when food is eaten
// ---------------------------------------------------------------------------
describe('growth when food is eaten', () => {
  it('length increases by 1 when food is eaten', () => {
    const state = playingState({
      snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
      food: { x: 6, y: 5 }, // directly in front of head going right
      direction: 'right',
      nextDirection: 'right',
    });
    const next = tick(state, () => 0.01);
    expect(next.snake.length).toBe(state.snake.length + 1);
  });

  it('score increases by 1 when food is eaten', () => {
    const state = playingState({
      snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }],
      food: { x: 6, y: 5 },
      direction: 'right',
      nextDirection: 'right',
      score: 3,
    });
    const next = tick(state, () => 0.01);
    expect(next.score).toBe(4);
  });

  it('tail does not pop on the eat tick', () => {
    const state = playingState({
      snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
      food: { x: 6, y: 5 },
      direction: 'right',
      nextDirection: 'right',
    });
    const prevTail: Point = { x: 3, y: 5 };
    const next = tick(state, () => 0.01);
    const nextTail = next.snake[next.snake.length - 1];
    expect(nextTail).toEqual(prevTail);
  });
});

// ---------------------------------------------------------------------------
// Collision detection
// ---------------------------------------------------------------------------
describe('collision detection', () => {
  it('game ends when head hits the right wall', () => {
    const state = playingState({
      snake: [{ x: GRID - 1, y: 5 }, { x: GRID - 2, y: 5 }],
      direction: 'right',
      nextDirection: 'right',
      food: { x: 0, y: 9 },
    });
    const next = tick(state);
    expect(next.phase).toBe('over');
  });

  it('game ends when head hits the left wall', () => {
    const state = playingState({
      snake: [{ x: 0, y: 5 }, { x: 1, y: 5 }],
      direction: 'left',
      nextDirection: 'left',
      food: { x: 9, y: 9 },
    });
    const next = tick(state);
    expect(next.phase).toBe('over');
  });

  it('game ends when head hits the top wall', () => {
    const state = playingState({
      snake: [{ x: 5, y: 0 }, { x: 5, y: 1 }],
      direction: 'up',
      nextDirection: 'up',
      food: { x: 9, y: 9 },
    });
    const next = tick(state);
    expect(next.phase).toBe('over');
  });

  it('game ends when head hits the bottom wall', () => {
    const state = playingState({
      snake: [{ x: 5, y: GRID - 1 }, { x: 5, y: GRID - 2 }],
      direction: 'down',
      nextDirection: 'down',
      food: { x: 9, y: 0 },
    });
    const next = tick(state);
    expect(next.phase).toBe('over');
  });

  it('game ends when head hits its own body (self collision)', () => {
    // Snake forms a backwards-C: head goes down into body
    //   (5,4)←(4,4)
    //          |
    //   (5,5)→(4,5)  head
    // nextDir down → (5,6) is body (not tail)
    const state = playingState({
      snake: [
        { x: 5, y: 5 }, // head, going down → (5,6)
        { x: 4, y: 5 }, // body
        { x: 4, y: 6 }, // body
        { x: 5, y: 6 }, // body (not tail) ← new head would land here
        { x: 6, y: 6 }, // tail (vacates)
      ],
      direction: 'down',
      nextDirection: 'down',
      food: { x: 0, y: 0 },
    });
    const next = tick(state);
    expect(next.phase).toBe('over');
  });

  it('does NOT end when head moves into where the tail was (tail vacates)', () => {
    // Snake curls so head moves to the previous tail position (valid)
    //  head(5,5)→(6,5)  and tail is at (6,5) - tail moves away
    const state = playingState({
      snake: [
        { x: 5, y: 5 }, // head going right → (6,5)
        { x: 4, y: 5 },
        { x: 4, y: 6 },
        { x: 5, y: 6 },
        { x: 6, y: 6 },
        { x: 6, y: 5 }, // tail: will vacate, so (6,5) is free
      ],
      direction: 'right',
      nextDirection: 'right',
      food: { x: 0, y: 0 },
    });
    const next = tick(state);
    expect(next.phase).toBe('playing');
  });
});

// ---------------------------------------------------------------------------
// Direction-reversal prevention
// ---------------------------------------------------------------------------
describe('direction-reversal prevention', () => {
  it('ignores left when currently going right', () => {
    const state = playingState({ direction: 'right', nextDirection: 'right' });
    const next = setDirection(state, 'left');
    expect(next.nextDirection).toBe('right');
  });

  it('ignores right when currently going left', () => {
    const state = playingState({ direction: 'left', nextDirection: 'left' });
    const next = setDirection(state, 'right');
    expect(next.nextDirection).toBe('left');
  });

  it('ignores up when currently going down', () => {
    const state = playingState({ direction: 'down', nextDirection: 'down' });
    const next = setDirection(state, 'up');
    expect(next.nextDirection).toBe('down');
  });

  it('ignores down when currently going up', () => {
    const state = playingState({ direction: 'up', nextDirection: 'up' });
    const next = setDirection(state, 'down');
    expect(next.nextDirection).toBe('up');
  });

  it('accepts a valid 90-degree turn', () => {
    const state = playingState({ direction: 'right', nextDirection: 'right' });
    const next = setDirection(state, 'up');
    expect(next.nextDirection).toBe('up');
  });

  it('accepts the same direction again', () => {
    const state = playingState({ direction: 'right', nextDirection: 'right' });
    const next = setDirection(state, 'right');
    expect(next.nextDirection).toBe('right');
  });
});

// ---------------------------------------------------------------------------
// Food placement
// ---------------------------------------------------------------------------
describe('food placement', () => {
  it('food never spawns on a snake cell (seeded rng, one free cell)', () => {
    // Fill the entire grid except one cell with snake segments
    const snake: Point[] = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (!(x === GRID - 1 && y === GRID - 1)) {
          snake.push({ x, y });
        }
      }
    }
    // Only (9,9) is free; any rng should return it
    const food = placeFood(snake, GRID, () => 0.5);
    expect(food).toEqual({ x: GRID - 1, y: GRID - 1 });
  });

  it('food can land in any free cell (seeded deterministic rng)', () => {
    const snake: Point[] = [{ x: 5, y: 5 }];
    // With rng = () => 0, should pick the first free cell
    const food = placeFood(snake, GRID, () => 0);
    // (0,0) is free and should be picked (first in row-major order)
    expect(food).toEqual({ x: 0, y: 0 });
    // Verify it's not on the snake
    expect(snake.some(s => s.x === food.x && s.y === food.y)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Speed progression
// ---------------------------------------------------------------------------
describe('speedForScore', () => {
  it('score 0 returns the slowest interval (200 ms)', () => {
    expect(speedForScore(0)).toBe(200);
  });

  it('score 50+ returns the fastest interval (80 ms)', () => {
    expect(speedForScore(50)).toBe(80);
    expect(speedForScore(999)).toBe(80);
  });

  it('each tier is strictly faster than the previous', () => {
    const tiers = [0, 5, 10, 20, 30, 50];
    for (let i = 0; i < tiers.length - 1; i++) {
      expect(speedForScore(tiers[i])).toBeGreaterThan(speedForScore(tiers[i + 1]));
    }
  });

  it('interval is identical within the same tier', () => {
    expect(speedForScore(5)).toBe(speedForScore(9));
    expect(speedForScore(10)).toBe(speedForScore(19));
  });
});

// ---------------------------------------------------------------------------
// createInitialState sanity checks
// ---------------------------------------------------------------------------
describe('createInitialState', () => {
  it('starts in idle phase', () => {
    const state = createInitialState(GRID);
    expect(state.phase).toBe('idle');
  });

  it('snake starts with length >= 1', () => {
    const state = createInitialState(GRID);
    expect(state.snake.length).toBeGreaterThanOrEqual(1);
  });

  it('food is not on the snake', () => {
    const state = createInitialState(GRID, () => 0.5);
    const onSnake = state.snake.some(p => p.x === state.food.x && p.y === state.food.y);
    expect(onSnake).toBe(false);
  });

  it('all snake cells are within the grid', () => {
    const state = createInitialState(GRID);
    for (const p of state.snake) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(GRID);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(GRID);
    }
  });
});
