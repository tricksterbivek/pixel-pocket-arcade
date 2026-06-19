import type { ArcadeStorage, GameResult, RecentPlay } from '../types/game';
import { MAX_RECENT } from './storage';

type MemoryScore = { moves: number; elapsedMs: number };

/** Memory ranks by fewer moves first, then faster time when moves are tied. */
export function isBetterMemory(next: MemoryScore, prev: MemoryScore | null): boolean {
  if (!prev) return true;
  if (next.moves !== prev.moves) return next.moves < prev.moves;
  return next.elapsedMs < prev.elapsedMs;
}

/** Reaction ranks by lower average. */
export function isBetterReactionAvg(next: number, prev: number | null): boolean {
  return prev === null || next < prev;
}

/** Format milliseconds as m:ss for display. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Short human readable summary of a completed play. */
export function summarizePlay(result: GameResult): string {
  switch (result.game) {
    case 'snake':
      return `Score ${result.score}`;
    case 'memory':
      return `${result.moves} moves, ${formatElapsed(result.elapsedMs)}`;
    case 'reaction':
      return `Avg ${Math.round(result.averageMs)} ms`;
    case 'drive':
      return `${result.score} m`;
  }
}

/**
 * Pure reducer: fold a completed result into arcade state. Updates the
 * relevant record if it beats the previous best and prepends a recent play
 * (newest first, capped at MAX_RECENT). `at` is injected for determinism.
 */
export function applyResult(
  state: ArcadeStorage,
  result: GameResult,
  at: number,
): ArcadeStorage {
  const records = { ...state.records };

  switch (result.game) {
    case 'snake':
      records.snakeHighScore = Math.max(records.snakeHighScore, result.score);
      break;
    case 'memory':
      if (isBetterMemory(result, records.memoryBest)) {
        records.memoryBest = { moves: result.moves, elapsedMs: result.elapsedMs };
      }
      break;
    case 'reaction':
      if (isBetterReactionAvg(result.averageMs, records.reactionBestAverageMs)) {
        records.reactionBestAverageMs = result.averageMs;
      }
      break;
    case 'drive':
      records.driveHighScore = Math.max(records.driveHighScore, result.score);
      break;
  }

  const play: RecentPlay = { game: result.game, label: summarizePlay(result), at };
  const recentPlays = [play, ...state.recentPlays].slice(0, MAX_RECENT);

  return { ...state, records, recentPlays };
}
