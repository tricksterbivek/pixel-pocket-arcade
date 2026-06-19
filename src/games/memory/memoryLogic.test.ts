import { describe, expect, it } from 'vitest';
import { createGame, flipCard, dismissMismatch } from './memoryLogic';
import type { MemoryState } from './memoryLogic';
import { isBetterMemory } from '../../lib/records';

// Simple deterministic LCG for seeded testing
function seededRng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Match all pairs in order - used to reach the complete state. */
function completeGame(initial: MemoryState): MemoryState {
  let s = initial;
  for (let i = 0; i < 16; i++) {
    if (s.cards[i].face === 'matched') continue;
    const sym = s.cards[i].symbol;
    const j = s.cards.findIndex((c, k) => k !== i && c.symbol === sym && c.face !== 'matched');
    if (j === -1) continue;
    s = flipCard(s, i);
    s = flipCard(s, j);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Pair generation
// ---------------------------------------------------------------------------

describe('createGame - pair generation', () => {
  it('produces exactly 16 cards', () => {
    expect(createGame().cards).toHaveLength(16);
  });

  it('produces exactly 8 distinct symbols each appearing exactly twice', () => {
    const counts = new Map<string, number>();
    for (const card of createGame().cards) {
      counts.set(card.symbol, (counts.get(card.symbol) ?? 0) + 1);
    }
    expect(counts.size).toBe(8);
    for (const count of counts.values()) {
      expect(count).toBe(2);
    }
  });

  it('starts all cards face-down, phase idle, moves 0', () => {
    const state = createGame();
    expect(state.phase).toBe('idle');
    expect(state.moves).toBe(0);
    expect(state.cards.every(c => c.face === 'down')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Shuffle integrity
// ---------------------------------------------------------------------------

describe('shuffle integrity', () => {
  it('card ids form the complete set 0-15 (no duplicates, no missing)', () => {
    const ids = createGame(seededRng(42)).cards.map(c => c.id).sort((a, b) => a - b);
    expect(ids).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it('is deterministic: same seed yields same symbol order', () => {
    const sym1 = createGame(seededRng(99)).cards.map(c => c.symbol);
    const sym2 = createGame(seededRng(99)).cards.map(c => c.symbol);
    expect(sym1).toEqual(sym2);
  });

  it('symbol multiset is preserved after shuffle', () => {
    const rng = seededRng(7);
    const state = createGame(rng);
    const symbolsSorted = state.cards.map(c => c.symbol).sort().join('');
    // Build the expected multiset: 8 symbols × 2 each, sorted
    const uniqueSymbols = [...new Set(state.cards.map(c => c.symbol))].sort();
    expect(uniqueSymbols).toHaveLength(8);
    const expectedSorted = [...uniqueSymbols, ...uniqueSymbols].sort().join('');
    expect(symbolsSorted).toBe(expectedSorted);
  });

  it('different seeds produce different orderings (high probability)', () => {
    const s1 = createGame(seededRng(1)).cards.map(c => c.symbol).join('');
    const s2 = createGame(seededRng(2)).cards.map(c => c.symbol).join('');
    expect(s1).not.toBe(s2);
  });
});

// ---------------------------------------------------------------------------
// Match handling
// ---------------------------------------------------------------------------

describe('match handling', () => {
  it('transitions phase idle → playing on first flip', () => {
    const state = createGame(seededRng(1));
    const next = flipCard(state, 0);
    expect(next.phase).toBe('playing');
    expect(next.cards[0].face).toBe('up');
  });

  it('sets both cards to matched when symbols are equal', () => {
    const state = createGame(seededRng(1));
    const sym = state.cards[0].symbol;
    const j = state.cards.findIndex((c, k) => k !== 0 && c.symbol === sym);
    const s1 = flipCard(state, 0);
    const s2 = flipCard(s1, j);
    expect(s2.cards[0].face).toBe('matched');
    expect(s2.cards[j].face).toBe('matched');
    expect(s2.phase).toBe('playing'); // still playing - more pairs remain
  });

  it('transitions to complete when the last pair is matched', () => {
    const final = completeGame(createGame(seededRng(3)));
    expect(final.phase).toBe('complete');
    expect(final.cards.every(c => c.face === 'matched')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mismatch handling
// ---------------------------------------------------------------------------

describe('mismatch handling', () => {
  it('does not mark mismatched cards as matched', () => {
    const state = createGame(seededRng(1));
    const diffIdx = state.cards.findIndex(c => c.symbol !== state.cards[0].symbol);
    const locked = flipCard(flipCard(state, 0), diffIdx);
    expect(locked.cards[0].face).toBe('up');
    expect(locked.cards[diffIdx].face).toBe('up');
    expect(locked.phase).toBe('locked');
  });

  it('dismissMismatch flips all up cards back to down and resumes playing', () => {
    const state = createGame(seededRng(1));
    const diffIdx = state.cards.findIndex(c => c.symbol !== state.cards[0].symbol);
    const locked = flipCard(flipCard(state, 0), diffIdx);
    const resumed = dismissMismatch(locked);
    expect(resumed.cards[0].face).toBe('down');
    expect(resumed.cards[diffIdx].face).toBe('down');
    expect(resumed.phase).toBe('playing');
  });

  it('dismissMismatch is a no-op when not in locked phase', () => {
    const state = createGame(seededRng(1));
    expect(dismissMismatch(state)).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// Interaction locking
// ---------------------------------------------------------------------------

describe('interaction locking', () => {
  it('rejects a third flip while two unmatched cards are face up', () => {
    const state = createGame(seededRng(1));
    const diffIdx = state.cards.findIndex(c => c.symbol !== state.cards[0].symbol);
    const thirdIdx = state.cards.findIndex((_, k) => k !== 0 && k !== diffIdx);
    const locked = flipCard(flipCard(state, 0), diffIdx);
    expect(locked.phase).toBe('locked');
    const attempted = flipCard(locked, thirdIdx);
    expect(attempted).toBe(locked); // same reference - no state change
  });

  it('rejects flips when phase is complete', () => {
    const complete = completeGame(createGame(seededRng(4)));
    expect(complete.phase).toBe('complete');
    expect(flipCard(complete, 0)).toBe(complete);
  });

  it('rejects flipping an already matched card', () => {
    const state = createGame(seededRng(1));
    const sym = state.cards[0].symbol;
    const j = state.cards.findIndex((c, k) => k !== 0 && c.symbol === sym);
    const afterMatch = flipCard(flipCard(state, 0), j);
    expect(afterMatch.cards[0].face).toBe('matched');
    expect(flipCard(afterMatch, 0)).toBe(afterMatch);
  });

  it('rejects flipping an already face-up card', () => {
    const state = createGame(seededRng(1));
    const s1 = flipCard(state, 0);
    expect(flipCard(s1, 0)).toBe(s1);
  });
});

// ---------------------------------------------------------------------------
// Move counting
// ---------------------------------------------------------------------------

describe('move counting', () => {
  it('does not increment moves on the first card of a pair', () => {
    const state = createGame(seededRng(1));
    expect(flipCard(state, 0).moves).toBe(0);
  });

  it('increments moves by 1 on a successful match', () => {
    const state = createGame(seededRng(1));
    const sym = state.cards[0].symbol;
    const j = state.cards.findIndex((c, k) => k !== 0 && c.symbol === sym);
    expect(flipCard(flipCard(state, 0), j).moves).toBe(1);
  });

  it('increments moves by 1 on a mismatch', () => {
    const state = createGame(seededRng(1));
    const diffIdx = state.cards.findIndex(c => c.symbol !== state.cards[0].symbol);
    expect(flipCard(flipCard(state, 0), diffIdx).moves).toBe(1);
  });

  it('counts 8 moves when all 8 pairs are matched', () => {
    const final = completeGame(createGame(seededRng(5)));
    expect(final.moves).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// Best-result comparison (via isBetterMemory from records)
// ---------------------------------------------------------------------------

describe('best-result comparison', () => {
  it('any result beats null (no prior best)', () => {
    expect(isBetterMemory({ moves: 20, elapsedMs: 99000 }, null)).toBe(true);
  });

  it('fewer moves beats more moves regardless of time', () => {
    expect(isBetterMemory({ moves: 10, elapsedMs: 99000 }, { moves: 12, elapsedMs: 1000 })).toBe(true);
    expect(isBetterMemory({ moves: 14, elapsedMs: 100 }, { moves: 12, elapsedMs: 99000 })).toBe(false);
  });

  it('breaks ties on faster time', () => {
    expect(isBetterMemory({ moves: 8, elapsedMs: 30000 }, { moves: 8, elapsedMs: 31000 })).toBe(true);
    expect(isBetterMemory({ moves: 8, elapsedMs: 31000 }, { moves: 8, elapsedMs: 30000 })).toBe(false);
  });
});
