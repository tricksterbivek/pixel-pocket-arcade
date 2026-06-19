import { describe, expect, it } from 'vitest';
import { reactionReducer, initialState, calcAverage, ROUNDS_REQUIRED } from './reactionLogic';
import { isBetterReactionAvg } from '../../lib/records';

// ---------------------------------------------------------------------------
// Helpers - build up state synchronously without any real timers
// ---------------------------------------------------------------------------

/** Arm then immediately ready (skip wait) */
function armAndReady(state: typeof initialState) {
  return reactionReducer(reactionReducer(state, { type: 'ARM' }), { type: 'READY' });
}

// ---------------------------------------------------------------------------
// State machine transitions
// ---------------------------------------------------------------------------

describe('ARM action', () => {
  it('idle → waiting', () => {
    expect(reactionReducer(initialState, { type: 'ARM' }).phase).toBe('waiting');
  });

  it('result → waiting', () => {
    const after = reactionReducer(armAndReady(initialState), { type: 'REACT', time: 300 });
    expect(after.phase).toBe('result');
    expect(reactionReducer(after, { type: 'ARM' }).phase).toBe('waiting');
  });

  it('tooSoon → waiting', () => {
    const ts = reactionReducer(reactionReducer(initialState, { type: 'ARM' }), { type: 'TOO_SOON' });
    expect(ts.phase).toBe('tooSoon');
    expect(reactionReducer(ts, { type: 'ARM' }).phase).toBe('waiting');
  });

  it('does not change phase when already waiting', () => {
    const waiting = reactionReducer(initialState, { type: 'ARM' });
    expect(reactionReducer(waiting, { type: 'ARM' }).phase).toBe('waiting');
  });
});

describe('READY action', () => {
  it('waiting → ready', () => {
    const waiting = reactionReducer(initialState, { type: 'ARM' });
    expect(reactionReducer(waiting, { type: 'READY' }).phase).toBe('ready');
  });

  it('no-ops from non-waiting phases', () => {
    expect(reactionReducer(initialState, { type: 'READY' }).phase).toBe('idle');
  });
});

describe('REACT action', () => {
  it('records the exact given time and transitions to result', () => {
    const s = reactionReducer(armAndReady(initialState), { type: 'REACT', time: 250 });
    expect(s.phase).toBe('result');
    expect(s.rounds).toEqual([250]);
    expect(s.lastMs).toBe(250);
  });

  it('appends exactly the given time to rounds list', () => {
    let state = initialState;
    const times = [200, 310, 410, 270] as const;
    for (const t of times) {
      state = reactionReducer(armAndReady(state), { type: 'REACT', time: t });
      // stay in result, arm again next iteration
    }
    expect(state.rounds).toEqual([200, 310, 410, 270]);
  });

  it('during waiting → tooSoon (early-click guard in reducer)', () => {
    const waiting = reactionReducer(initialState, { type: 'ARM' });
    const s = reactionReducer(waiting, { type: 'REACT', time: 50 });
    expect(s.phase).toBe('tooSoon');
    expect(s.rounds).toHaveLength(0);
  });

  it('no-ops from irrelevant phases', () => {
    // e.g. idle
    expect(reactionReducer(initialState, { type: 'REACT', time: 100 }).phase).toBe('idle');
  });
});

describe('TOO_SOON action', () => {
  it('waiting → tooSoon without recording a round', () => {
    const waiting = reactionReducer(initialState, { type: 'ARM' });
    const s = reactionReducer(waiting, { type: 'TOO_SOON' });
    expect(s.phase).toBe('tooSoon');
    expect(s.rounds).toHaveLength(0);
  });

  it('does not count as a valid round', () => {
    // One too-soon then one valid round → only 1 round in list
    let state = reactionReducer(reactionReducer(initialState, { type: 'ARM' }), { type: 'TOO_SOON' });
    state = reactionReducer(armAndReady(state), { type: 'REACT', time: 300 });
    expect(state.rounds).toHaveLength(1);
    expect(state.rounds[0]).toBe(300);
  });
});

describe('Five-round completion', () => {
  it('moves to completed after exactly ROUNDS_REQUIRED valid rounds', () => {
    expect(ROUNDS_REQUIRED).toBe(5);

    let state = initialState;
    for (let i = 0; i < ROUNDS_REQUIRED - 1; i++) {
      state = reactionReducer(armAndReady(state), { type: 'REACT', time: 200 + i * 50 });
      expect(state.phase).toBe('result');
    }
    // Fifth round
    state = reactionReducer(armAndReady(state), { type: 'REACT', time: 400 });
    expect(state.phase).toBe('completed');
    expect(state.rounds).toHaveLength(ROUNDS_REQUIRED);
  });

  it('includes all five times in rounds list', () => {
    const times = [100, 200, 300, 400, 500];
    let state = initialState;
    for (const t of times) {
      state = reactionReducer(armAndReady(state), { type: 'REACT', time: t });
    }
    expect(state.rounds).toEqual(times);
  });

  it('too-soon rounds do not count toward the five', () => {
    let state = initialState;
    // 2 too-soon then 5 valid
    for (let i = 0; i < 2; i++) {
      state = reactionReducer(reactionReducer(state, { type: 'ARM' }), { type: 'TOO_SOON' });
    }
    for (let i = 0; i < ROUNDS_REQUIRED; i++) {
      state = reactionReducer(armAndReady(state), { type: 'REACT', time: 250 });
    }
    expect(state.phase).toBe('completed');
    expect(state.rounds).toHaveLength(ROUNDS_REQUIRED);
  });
});

describe('RESTART action', () => {
  it('resets to initial state from any phase', () => {
    const phases = [
      reactionReducer(initialState, { type: 'ARM' }),
      armAndReady(initialState),
      reactionReducer(armAndReady(initialState), { type: 'REACT', time: 300 }),
    ];
    for (const s of phases) {
      expect(reactionReducer(s, { type: 'RESTART' })).toEqual(initialState);
    }
  });

  it('clears rounds and lastMs', () => {
    const after = reactionReducer(armAndReady(initialState), { type: 'REACT', time: 300 });
    const reset = reactionReducer(after, { type: 'RESTART' });
    expect(reset.rounds).toHaveLength(0);
    expect(reset.lastMs).toBeNull();
  });
});

describe('calcAverage', () => {
  it('returns the mean of the given times', () => {
    expect(calcAverage([100, 200, 300, 400, 500])).toBe(300);
  });

  it('works for non-uniform distributions', () => {
    expect(calcAverage([150, 250])).toBe(200);
  });

  it('returns 0 for empty list', () => {
    expect(calcAverage([])).toBe(0);
  });
});

describe('isBetterReactionAvg (from shared lib)', () => {
  it('true when no previous best', () => {
    expect(isBetterReactionAvg(300, null)).toBe(true);
  });

  it('true when new average is lower', () => {
    expect(isBetterReactionAvg(250, 300)).toBe(true);
  });

  it('false when new average is higher', () => {
    expect(isBetterReactionAvg(350, 300)).toBe(false);
  });

  it('false when equal (not a new best, just equal)', () => {
    expect(isBetterReactionAvg(300, 300)).toBe(false);
  });
});
