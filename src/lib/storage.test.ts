import { describe, expect, it } from 'vitest';
import {
  MAX_RECENT,
  defaultArcadeState,
  loadArcade,
  parseArcadeState,
  resetArcade,
  saveArcade,
} from './storage';
import type { ArcadeStorageV1 } from '../types/game';

function fakeStore(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

describe('defaultArcadeState', () => {
  it('starts sound on with empty records', () => {
    const s = defaultArcadeState();
    expect(s.version).toBe(1);
    expect(s.settings.soundEnabled).toBe(true);
    expect(s.records).toEqual({
      snakeHighScore: 0,
      memoryBest: null,
      reactionBestAverageMs: null,
    });
    expect(s.recentPlays).toEqual([]);
  });
});

describe('parseArcadeState', () => {
  it('round-trips a valid document', () => {
    const valid: ArcadeStorageV1 = {
      version: 1,
      settings: { soundEnabled: false },
      records: { snakeHighScore: 42, memoryBest: { moves: 12, elapsedMs: 38000 }, reactionBestAverageMs: 284 },
      recentPlays: [{ game: 'snake', label: 'Score 42', at: 1000 }],
    };
    expect(parseArcadeState(valid)).toEqual(valid);
  });

  it('falls back to defaults on non-object', () => {
    expect(parseArcadeState(null)).toEqual(defaultArcadeState());
    expect(parseArcadeState('nope')).toEqual(defaultArcadeState());
    expect(parseArcadeState(42)).toEqual(defaultArcadeState());
  });

  it('falls back to defaults on unsupported version', () => {
    expect(parseArcadeState({ version: 2, settings: {}, records: {}, recentPlays: [] })).toEqual(
      defaultArcadeState(),
    );
  });

  it('salvages individual malformed fields', () => {
    const parsed = parseArcadeState({
      version: 1,
      settings: { soundEnabled: 'yes' },
      records: { snakeHighScore: -5, memoryBest: { moves: 1 }, reactionBestAverageMs: 'fast' },
      recentPlays: 'broken',
    });
    expect(parsed.settings.soundEnabled).toBe(true);
    expect(parsed.records.snakeHighScore).toBe(0);
    expect(parsed.records.memoryBest).toBeNull();
    expect(parsed.records.reactionBestAverageMs).toBeNull();
    expect(parsed.recentPlays).toEqual([]);
  });

  it('drops invalid recent plays and caps the list', () => {
    const plays = Array.from({ length: 15 }, (_, i) => ({ game: 'memory', label: `m${i}`, at: i }));
    plays.push({ game: 'not-a-game', label: 'x', at: 1 } as unknown as (typeof plays)[number]);
    const parsed = parseArcadeState({
      version: 1,
      settings: { soundEnabled: true },
      records: {},
      recentPlays: plays,
    });
    expect(parsed.recentPlays).toHaveLength(MAX_RECENT);
    expect(parsed.recentPlays.every((p) => p.game === 'memory')).toBe(true);
  });
});

describe('load / save / reset', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadArcade(fakeStore())).toEqual(defaultArcadeState());
  });

  it('persists and reloads', () => {
    const store = fakeStore();
    const state = defaultArcadeState();
    state.records.snakeHighScore = 99;
    saveArcade(state, store);
    expect(loadArcade(store)).toEqual(state);
  });

  it('recovers from corrupted JSON', () => {
    const store = fakeStore();
    store.setItem('pixel-pocket-arcade', '{not valid json');
    expect(loadArcade(store)).toEqual(defaultArcadeState());
  });

  it('reset clears storage and returns defaults', () => {
    const store = fakeStore();
    saveArcade({ ...defaultArcadeState(), records: { snakeHighScore: 5, memoryBest: null, reactionBestAverageMs: null } }, store);
    expect(resetArcade(store)).toEqual(defaultArcadeState());
    expect(store.getItem('pixel-pocket-arcade')).toBeNull();
  });

  it('handles a null store without throwing', () => {
    expect(loadArcade(null)).toEqual(defaultArcadeState());
    expect(() => saveArcade(defaultArcadeState(), null)).not.toThrow();
    expect(resetArcade(null)).toEqual(defaultArcadeState());
  });
});
