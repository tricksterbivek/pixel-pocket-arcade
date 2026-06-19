import { describe, expect, it } from 'vitest';
import {
  START_LIVES,
  createGunnerState,
  scoreOf,
  shoot,
  startGunner,
  step,
  type GunnerState,
  type Rock,
} from './gunnerLogic';
import type { NeoTemplate } from './neo';

// Deterministic LCG so spawning is reproducible in tests.
function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const TEMPLATES: NeoTemplate[] = [
  { name: 'Alpha', diameterM: 400, hazardous: false },
  { name: 'Beta', diameterM: 1200, hazardous: true },
];

const playing = (over: Partial<GunnerState> = {}): GunnerState => ({
  ...createGunnerState(TEMPLATES),
  phase: 'playing',
  spawnAcc: 0,
  ...over,
});

const rock = (over: Partial<Rock> = {}): Rock => ({
  id: 1,
  x: 0,
  y: 0,
  z: 20,
  r: 2,
  vz: 10,
  name: 'A',
  hazardous: false,
  ...over,
});

describe('createGunnerState', () => {
  it('starts idle with full lives, no score, and no rocks', () => {
    const s = createGunnerState(TEMPLATES);
    expect(s.phase).toBe('idle');
    expect(s.lives).toBe(START_LIVES);
    expect(s.score).toBe(0);
    expect(s.rocks).toEqual([]);
  });

  it('never runs with an empty template list', () => {
    expect(createGunnerState([]).templates.length).toBeGreaterThan(0);
  });
});

describe('startGunner', () => {
  it('moves idle to playing, and is a no-op otherwise', () => {
    expect(startGunner(createGunnerState(TEMPLATES)).phase).toBe('playing');
    const over = playing({ phase: 'over' });
    expect(startGunner(over)).toBe(over);
  });
});

describe('step', () => {
  it('returns the same state when not playing', () => {
    const idle = createGunnerState(TEMPLATES);
    expect(step(idle, 0.016, () => 0.5)).toBe(idle);
  });

  it('moves rocks toward the camera', () => {
    const n = step(playing({ rocks: [rock({ z: 50 })] }), 0.1, () => 0.5);
    expect(n.rocks.find((r) => r.id === 1)!.z).toBeLessThan(50);
  });

  it('spawns rocks over time, tagged from the template round-robin', () => {
    let s = playing();
    const rng = seededRng(7);
    const names = new Set<string>();
    for (let i = 0; i < 80; i++) {
      s = step(s, 0.1, rng);
      if (s.phase === 'over') s = { ...s, phase: 'playing', lives: START_LIVES };
      for (const r of s.rocks) names.add(r.name);
    }
    expect(names.has('Alpha')).toBe(true);
    expect(names.has('Beta')).toBe(true);
  });

  it('costs a life and resets the combo when a rock reaches the station', () => {
    const s = playing({ combo: 5, lives: 3, rocks: [rock({ z: 1 })] });
    const n = step(s, 0.05, () => 0.5);
    expect(n.lives).toBe(2);
    expect(n.combo).toBe(0);
    expect(n.rocks.find((r) => r.id === 1)).toBeUndefined();
  });

  it('ends the game when the last life is lost', () => {
    const s = playing({ lives: 1, rocks: [rock({ z: 1 })] });
    expect(step(s, 0.05, () => 0.5).phase).toBe('over');
  });
});

describe('shoot', () => {
  it('destroys a rock dead ahead and scores', () => {
    const res = shoot(playing({ rocks: [rock()] }), { x: 0, y: 0, z: 1 });
    expect(res.hitId).toBe(1);
    expect(res.gained).toBeGreaterThan(0);
    expect(res.state.rocks).toHaveLength(0);
    expect(res.state.combo).toBe(1);
  });

  it('misses when the ray points away, resetting the combo', () => {
    const res = shoot(playing({ rocks: [rock()], combo: 3 }), { x: 0, y: 1, z: 0 });
    expect(res.hitId).toBeNull();
    expect(res.state.combo).toBe(0);
    expect(res.state.rocks).toHaveLength(1);
  });

  it('hits the nearest rock when several line up', () => {
    const s = playing({ rocks: [rock({ id: 3, z: 40 }), rock({ id: 2, z: 10 })] });
    expect(shoot(s, { x: 0, y: 0, z: 1 }).hitId).toBe(2);
  });

  it('ignores rocks behind the camera', () => {
    expect(shoot(playing({ rocks: [rock({ z: -20 })] }), { x: 0, y: 0, z: 1 }).hitId).toBeNull();
  });

  it('respects the collision radius', () => {
    // Rock radius 2 (+0.6 pad) at z=20: a ray ~4 units off-center misses.
    const off = Math.sqrt(20 * 20 + 4 * 4);
    const miss = shoot(playing({ rocks: [rock()] }), { x: 4 / off, y: 0, z: 20 / off });
    expect(miss.hitId).toBeNull();
  });

  it('rewards hazardous rocks and a built-up combo more', () => {
    const plain = shoot(playing({ rocks: [rock()] }), { x: 0, y: 0, z: 1 }).gained;
    const haz = shoot(playing({ rocks: [rock({ hazardous: true })] }), { x: 0, y: 0, z: 1 }).gained;
    const combod = shoot(playing({ rocks: [rock()], combo: 8 }), { x: 0, y: 0, z: 1 }).gained;
    expect(haz).toBeGreaterThan(plain);
    expect(combod).toBeGreaterThan(plain);
  });

  it('does not fire when not playing', () => {
    expect(shoot(createGunnerState(TEMPLATES), { x: 0, y: 0, z: 1 }).hitId).toBeNull();
  });
});

describe('scoreOf', () => {
  it('reflects the running score after a hit', () => {
    const after = shoot(playing({ rocks: [rock()] }), { x: 0, y: 0, z: 1 }).state;
    expect(scoreOf(after)).toBeGreaterThan(0);
  });
});
