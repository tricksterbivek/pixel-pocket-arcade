/**
 * Pure, deterministic Memory Match logic. No React, no timers, no side effects.
 * Inject `rng` for reproducible tests; defaults to Math.random in production.
 */

export type CardFace = 'down' | 'up' | 'matched';
export type GamePhase = 'idle' | 'playing' | 'locked' | 'complete';

export interface Card {
  /** Stable 0-based index - equals array position after createGame(). */
  id: number;
  symbol: string;
  face: CardFace;
}

export interface MemoryState {
  cards: Card[];
  moves: number;
  phase: GamePhase;
}

// Eight distinct emoji pairs.
const SYMBOLS = ['🌙', '⭐', '🔥', '💎', '🎵', '🎮', '🚀', '🌸'] as const;

/** Fisher-Yates in-place shuffle. */
function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/** Create a fresh shuffled game. Pass a seeded rng for deterministic tests. */
export function createGame(rng: () => number = Math.random): MemoryState {
  const pairs: string[] = SYMBOLS.flatMap(s => [s, s]);
  const shuffled = shuffle(pairs, rng);
  const cards: Card[] = shuffled.map((symbol, id) => ({ id, symbol, face: 'down' }));
  return { cards, moves: 0, phase: 'idle' };
}

/**
 * Flip the card at array index `idx`. Returns the same state reference if the
 * flip is rejected (locked phase, complete, card already up/matched).
 *
 * One move = one pair attempt (both match and mismatch count equally).
 */
export function flipCard(state: MemoryState, idx: number): MemoryState {
  if (state.phase === 'locked' || state.phase === 'complete') return state;

  const card = state.cards[idx];
  // Reject if out of bounds, already face-up, or matched.
  if (!card || card.face !== 'down') return state;

  // Flip this card face-up.
  const cards = state.cards.map((c, i) =>
    i === idx ? { ...c, face: 'up' as const } : c,
  );

  const faceUp = cards.reduce<number[]>(
    (acc, c, i) => (c.face === 'up' ? [...acc, i] : acc),
    [],
  );

  // First card of pair - start playing, wait for second.
  if (faceUp.length < 2) {
    return { ...state, cards, phase: 'playing' };
  }

  // Second card - evaluate the pair.
  const [a, b] = faceUp;
  const moves = state.moves + 1;

  if (cards[a].symbol === cards[b].symbol) {
    // Match: mark both and check for completion.
    const matched = cards.map((c, i) =>
      i === a || i === b ? { ...c, face: 'matched' as const } : c,
    );
    const phase = matched.every(c => c.face === 'matched') ? 'complete' : 'playing';
    return { cards: matched, moves, phase };
  }

  // Mismatch: lock until the caller calls dismissMismatch().
  return { cards, moves, phase: 'locked' };
}

/**
 * Flip all face-up cards back to face-down and resume playing.
 * No-op if not in 'locked' phase (safe to call idempotently).
 */
export function dismissMismatch(state: MemoryState): MemoryState {
  if (state.phase !== 'locked') return state;
  const cards = state.cards.map(c =>
    c.face === 'up' ? { ...c, face: 'down' as const } : c,
  );
  return { ...state, cards, phase: 'playing' };
}
