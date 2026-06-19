import { describe, expect, it } from 'vitest';
import {
  applyResult,
  formatElapsed,
  isBetterMemory,
  isBetterReactionAvg,
  summarizePlay,
} from './records';
import { defaultArcadeState } from './storage';

describe('isBetterMemory', () => {
  it('is true when there is no previous best', () => {
    expect(isBetterMemory({ moves: 20, elapsedMs: 50000 }, null)).toBe(true);
  });
  it('prefers fewer moves', () => {
    expect(isBetterMemory({ moves: 10, elapsedMs: 99000 }, { moves: 12, elapsedMs: 1000 })).toBe(true);
    expect(isBetterMemory({ moves: 14, elapsedMs: 100 }, { moves: 12, elapsedMs: 90000 })).toBe(false);
  });
  it('breaks ties on faster time', () => {
    expect(isBetterMemory({ moves: 12, elapsedMs: 30000 }, { moves: 12, elapsedMs: 31000 })).toBe(true);
    expect(isBetterMemory({ moves: 12, elapsedMs: 31000 }, { moves: 12, elapsedMs: 30000 })).toBe(false);
  });
});

describe('isBetterReactionAvg', () => {
  it('is true with no previous best', () => {
    expect(isBetterReactionAvg(300, null)).toBe(true);
  });
  it('prefers a lower average', () => {
    expect(isBetterReactionAvg(250, 300)).toBe(true);
    expect(isBetterReactionAvg(350, 300)).toBe(false);
  });
});

describe('formatElapsed', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(38000)).toBe('0:38');
    expect(formatElapsed(92000)).toBe('1:32');
  });
});

describe('summarizePlay', () => {
  it('summarizes each game', () => {
    expect(summarizePlay({ game: 'snake', score: 42 })).toBe('Score 42');
    expect(summarizePlay({ game: 'memory', moves: 12, elapsedMs: 38000 })).toBe('12 moves, 0:38');
    expect(summarizePlay({ game: 'reaction', averageMs: 284.6, rounds: [] })).toBe('Avg 285 ms');
    expect(summarizePlay({ game: 'drive', score: 1500 })).toBe('1500 m');
  });
});

describe('applyResult', () => {
  it('keeps the higher snake score', () => {
    const start = { ...defaultArcadeState(), records: { snakeHighScore: 50, memoryBest: null, reactionBestAverageMs: null, driveHighScore: 0 } };
    expect(applyResult(start, { game: 'snake', score: 30 }, 1).records.snakeHighScore).toBe(50);
    expect(applyResult(start, { game: 'snake', score: 70 }, 1).records.snakeHighScore).toBe(70);
  });

  it('updates memory best only when better', () => {
    const start = { ...defaultArcadeState(), records: { snakeHighScore: 0, memoryBest: { moves: 12, elapsedMs: 30000 }, reactionBestAverageMs: null, driveHighScore: 0 } };
    expect(applyResult(start, { game: 'memory', moves: 14, elapsedMs: 1000 }, 1).records.memoryBest).toEqual({ moves: 12, elapsedMs: 30000 });
    expect(applyResult(start, { game: 'memory', moves: 10, elapsedMs: 99000 }, 1).records.memoryBest).toEqual({ moves: 10, elapsedMs: 99000 });
  });

  it('updates reaction best only when lower', () => {
    const start = { ...defaultArcadeState(), records: { snakeHighScore: 0, memoryBest: null, reactionBestAverageMs: 300, driveHighScore: 0 } };
    expect(applyResult(start, { game: 'reaction', averageMs: 320, rounds: [] }, 1).records.reactionBestAverageMs).toBe(300);
    expect(applyResult(start, { game: 'reaction', averageMs: 250, rounds: [] }, 1).records.reactionBestAverageMs).toBe(250);
  });

  it('keeps the higher drive score', () => {
    const start = { ...defaultArcadeState(), records: { snakeHighScore: 0, memoryBest: null, reactionBestAverageMs: null, driveHighScore: 800 } };
    expect(applyResult(start, { game: 'drive', score: 500 }, 1).records.driveHighScore).toBe(800);
    expect(applyResult(start, { game: 'drive', score: 1200 }, 1).records.driveHighScore).toBe(1200);
  });

  it('prepends recent plays newest first and caps at 10', () => {
    let state = defaultArcadeState();
    for (let i = 1; i <= 12; i++) {
      state = applyResult(state, { game: 'snake', score: i }, i);
    }
    expect(state.recentPlays).toHaveLength(10);
    expect(state.recentPlays[0]).toEqual({ game: 'snake', label: 'Score 12', at: 12 });
    expect(state.recentPlays[9]?.at).toBe(3);
  });

  it('does not mutate the input state', () => {
    const start = defaultArcadeState();
    const frozen = JSON.stringify(start);
    applyResult(start, { game: 'snake', score: 5 }, 1);
    expect(JSON.stringify(start)).toBe(frozen);
  });
});
