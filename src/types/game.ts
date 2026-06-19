export type GameId = 'snake' | 'memory' | 'reaction';

/**
 * Shared, render-agnostic description of a game. Used by the home page,
 * the game shell, and routing. The lead adds fields only when more than
 * one game needs them.
 */
export interface GameDefinition {
  id: GameId;
  title: string;
  description: string;
  route: string;
  controls: readonly string[];
  scoreLabel: string;
  /** CSS custom-property name for this game's accent, e.g. '--accent-snake'. */
  accent: string;
}

/** Completed-game results. Each game reports its own native metrics. */
export interface SnakeResult {
  game: 'snake';
  score: number;
}
export interface MemoryResult {
  game: 'memory';
  moves: number;
  elapsedMs: number;
}
export interface ReactionResult {
  game: 'reaction';
  averageMs: number;
  rounds: readonly number[];
}
export type GameResult = SnakeResult | MemoryResult | ReactionResult;

/** One entry in the home page recent-plays list. */
export interface RecentPlay {
  game: GameId;
  /** Human readable summary, e.g. 'Score 42' or 'Avg 284 ms'. */
  label: string;
  /** Epoch milliseconds when the play completed. */
  at: number;
}

/** The single versioned storage document for the whole arcade. */
export interface ArcadeStorageV1 {
  version: 1;
  settings: {
    soundEnabled: boolean;
  };
  records: {
    snakeHighScore: number;
    memoryBest: { moves: number; elapsedMs: number } | null;
    reactionBestAverageMs: number | null;
  };
  recentPlays: RecentPlay[];
}
