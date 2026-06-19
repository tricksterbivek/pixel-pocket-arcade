/**
 * Pure deterministic state machine for the Reaction Timer game.
 * No React, no timers, no randomness. The React component owns those.
 */

export type Phase = 'idle' | 'waiting' | 'ready' | 'result' | 'tooSoon' | 'completed';

export interface ReactionState {
  phase: Phase;
  /** Times (ms) for each VALID round in order. */
  rounds: readonly number[];
  /** The most recently recorded valid reaction time, for the result display. */
  lastMs: number | null;
}

export type ReactionAction =
  | { type: 'ARM' }
  | { type: 'READY' }
  | { type: 'REACT'; time: number }
  | { type: 'TOO_SOON' }
  | { type: 'RESTART' };

export const ROUNDS_REQUIRED = 5;

export const initialState: ReactionState = {
  phase: 'idle',
  rounds: [],
  lastMs: null,
};

export function reactionReducer(state: ReactionState, action: ReactionAction): ReactionState {
  switch (action.type) {
    case 'ARM': {
      if (
        state.phase === 'idle' ||
        state.phase === 'result' ||
        state.phase === 'tooSoon'
      ) {
        return { ...state, phase: 'waiting' };
      }
      return state;
    }

    case 'READY': {
      if (state.phase === 'waiting') {
        return { ...state, phase: 'ready' };
      }
      return state;
    }

    case 'REACT': {
      // Early-click guard: clicking during waiting is a too-soon fault
      if (state.phase === 'waiting') {
        return { ...state, phase: 'tooSoon' };
      }
      if (state.phase === 'ready') {
        const rounds = [...state.rounds, action.time];
        const phase = rounds.length >= ROUNDS_REQUIRED ? 'completed' : 'result';
        return { ...state, phase, rounds, lastMs: action.time };
      }
      return state;
    }

    case 'TOO_SOON': {
      if (state.phase === 'waiting') {
        return { ...state, phase: 'tooSoon' };
      }
      return state;
    }

    case 'RESTART': {
      return { ...initialState };
    }

    default:
      return state;
  }
}

/** Mean of recorded round times, 0 for empty list. */
export function calcAverage(rounds: readonly number[]): number {
  if (rounds.length === 0) return 0;
  return rounds.reduce((a, b) => a + b, 0) / rounds.length;
}
