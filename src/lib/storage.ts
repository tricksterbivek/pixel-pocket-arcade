import type { ArcadeStorageV1, GameId, RecentPlay } from '../types/game';

export const STORAGE_KEY = 'pixel-pocket-arcade';
export const MAX_RECENT = 10;
const VALID_GAME_IDS: readonly GameId[] = ['snake', 'memory', 'reaction'];

export function defaultArcadeState(): ArcadeStorageV1 {
  return {
    version: 1,
    settings: { soundEnabled: true },
    records: {
      snakeHighScore: 0,
      memoryBest: null,
      reactionBestAverageMs: null,
    },
    recentPlays: [],
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInt(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function parseRecentPlay(value: unknown): RecentPlay | null {
  if (!isObject(value)) return null;
  const { game, label, at } = value;
  if (typeof game !== 'string' || !VALID_GAME_IDS.includes(game as GameId)) return null;
  if (typeof label !== 'string') return null;
  if (!isFiniteNumber(at)) return null;
  return { game: game as GameId, label: label.slice(0, 120), at };
}

/**
 * Validate untrusted parsed JSON into a known-good state. Unknown or
 * malformed fields fall back to defaults rather than throwing, so a
 * corrupted document can never crash the app or leak bad data.
 */
export function parseArcadeState(value: unknown): ArcadeStorageV1 {
  const fallback = defaultArcadeState();
  if (!isObject(value) || value.version !== 1) return fallback;

  const settings = isObject(value.settings) ? value.settings : {};
  const records = isObject(value.records) ? value.records : {};

  const memoryBestRaw = records.memoryBest;
  const memoryBest =
    isObject(memoryBestRaw) &&
    isNonNegativeInt(memoryBestRaw.moves) &&
    isFiniteNumber(memoryBestRaw.elapsedMs) &&
    memoryBestRaw.elapsedMs >= 0
      ? { moves: memoryBestRaw.moves, elapsedMs: memoryBestRaw.elapsedMs }
      : null;

  const recentPlaysRaw = Array.isArray(value.recentPlays) ? value.recentPlays : [];
  const recentPlays = recentPlaysRaw
    .slice(0, 100) // bound validation work on a hostile oversized array
    .map(parseRecentPlay)
    .filter((play): play is RecentPlay => play !== null)
    .slice(0, MAX_RECENT);

  return {
    version: 1,
    settings: {
      soundEnabled:
        typeof settings.soundEnabled === 'boolean'
          ? settings.soundEnabled
          : fallback.settings.soundEnabled,
    },
    records: {
      snakeHighScore: isNonNegativeInt(records.snakeHighScore) ? records.snakeHighScore : 0,
      memoryBest,
      reactionBestAverageMs:
        isFiniteNumber(records.reactionBestAverageMs) && records.reactionBestAverageMs >= 0
          ? records.reactionBestAverageMs
          : null,
    },
    recentPlays,
  };
}

function getStore(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadArcade(store: Storage | null = getStore()): ArcadeStorageV1 {
  if (!store) return defaultArcadeState();
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return defaultArcadeState();
    return parseArcadeState(JSON.parse(raw));
  } catch {
    return defaultArcadeState();
  }
}

export function saveArcade(state: ArcadeStorageV1, store: Storage | null = getStore()): void {
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be full or blocked; persistence is best effort.
  }
}

export function resetArcade(store: Storage | null = getStore()): ArcadeStorageV1 {
  if (store) {
    try {
      store.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  return defaultArcadeState();
}
