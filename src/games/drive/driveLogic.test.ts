import { describe, expect, it } from 'vitest';
import {
  LANES,
  createDriveState,
  scoreOf,
  speedForDistance,
  startDrive,
  steer,
  step,
  type DriveState,
} from './driveLogic';

// Deterministic LCG so spawning is reproducible in tests.
function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const playing = (over: Partial<DriveState> = {}): DriveState => ({
  ...createDriveState(),
  phase: 'playing',
  ...over,
});

describe('createDriveState', () => {
  it('starts idle in the center lane with no obstacles', () => {
    const s = createDriveState();
    expect(s.phase).toBe('idle');
    expect(s.lane).toBe(Math.floor(LANES / 2));
    expect(s.obstacles).toEqual([]);
    expect(s.distance).toBe(0);
  });
});

describe('startDrive', () => {
  it('moves idle to playing, and is a no-op otherwise', () => {
    expect(startDrive(createDriveState()).phase).toBe('playing');
    const over = playing({ phase: 'over' });
    expect(startDrive(over)).toBe(over);
  });
});

describe('steer', () => {
  it('changes lane within bounds while playing', () => {
    expect(steer(playing({ lane: 1 }), -1).lane).toBe(0);
    expect(steer(playing({ lane: 1 }), 1).lane).toBe(2);
  });
  it('clamps at the edges', () => {
    expect(steer(playing({ lane: 0 }), -1).lane).toBe(0);
    expect(steer(playing({ lane: LANES - 1 }), 1).lane).toBe(LANES - 1);
  });
  it('ignores steering when not playing', () => {
    const idle = createDriveState();
    expect(steer(idle, 1)).toBe(idle);
  });
});

describe('speedForDistance', () => {
  it('is non-decreasing and capped', () => {
    expect(speedForDistance(0)).toBeLessThan(speedForDistance(500));
    expect(speedForDistance(500)).toBeGreaterThanOrEqual(speedForDistance(0));
    expect(speedForDistance(1e6)).toBe(speedForDistance(1e6 + 1000));
  });
});

describe('step', () => {
  it('returns the same state when not playing', () => {
    const idle = createDriveState();
    expect(step(idle, 0.016, () => 0.5)).toBe(idle);
  });

  it('accumulates distance and exposes a whole-meter score', () => {
    const n = step(playing(), 1, () => 0.99);
    expect(n.distance).toBeGreaterThan(0);
    expect(scoreOf(n)).toBe(Math.floor(n.distance));
  });

  it('moves obstacles toward the player', () => {
    const s = playing({ obstacles: [{ id: 1, lane: 0, z: 50 }] });
    const n = step(s, 0.1, () => 0.99);
    expect(n.obstacles.find((o) => o.id === 1)!.z).toBeLessThan(50);
  });

  it('drops obstacles once they pass behind the player', () => {
    const s = playing({ lane: 0, obstacles: [{ id: 1, lane: 2, z: -3.9 }] });
    const n = step(s, 0.2, () => 0.99);
    expect(n.obstacles.find((o) => o.id === 1)).toBeUndefined();
  });

  it('ends the game on collision in the player lane', () => {
    const s = playing({ lane: 1, obstacles: [{ id: 1, lane: 1, z: 0.5 }] });
    expect(step(s, 0.016, () => 0.99).phase).toBe('over');
  });

  it('does not collide with an obstacle in a different lane', () => {
    const s = playing({ lane: 1, obstacles: [{ id: 1, lane: 0, z: 0 }] });
    expect(step(s, 0.016, () => 0.99).phase).toBe('playing');
  });

  it('spawns waves that always leave at least one lane free', () => {
    let s = playing();
    const rng = seededRng(42);
    let sawObstacles = false;
    for (let i = 0; i < 3000; i++) {
      s = step(s, 0.05, rng);
      // Keep spawning so the invariant is exercised across the whole run; the
      // test player never dodges, so otherwise it would crash almost at once.
      if (s.phase === 'over') s = { ...s, phase: 'playing' };
      if (s.obstacles.length > 0) sawObstacles = true;
      for (const o of s.obstacles) {
        const sameRow = s.obstacles.filter((x) => Math.abs(x.z - o.z) < 0.6);
        expect(new Set(sameRow.map((x) => x.lane)).size).toBeLessThan(LANES);
      }
    }
    expect(sawObstacles).toBe(true);
  });
});
