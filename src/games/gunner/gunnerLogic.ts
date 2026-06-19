/**
 * Pure deterministic logic for Star Gunner, a first-person asteroid shooter.
 * No React, no three.js, no timers. The camera sits at the origin looking down
 * +z (forward); rocks spawn far ahead and travel toward it. Firing is a
 * ray-sphere test in this space. Randomness and the asteroid roster are
 * injected so the rules are fully unit testable. The renderer calls step() on
 * a fixed timestep and maps each rock's (x, y, z) into the 3D scene.
 */

import type { NeoTemplate } from './neo';

export type GunnerPhase = 'idle' | 'playing' | 'over';

export const START_LIVES = 3;
export const SPAWN_Z = 90; // distance ahead where rocks appear

const KILL_Z = 3; // a rock at or under this z has reached the station
const BASE_SPEED = 16; // world units per second
const SPEED_RAMP = 0.25; // extra speed per second elapsed
const MAX_SPEED = 42;
const BASE_SPAWN = 1.15; // seconds between spawns at the start
const MIN_SPAWN = 0.45;
const SPAWN_RAMP = 0.012; // spawn interval shaved per second elapsed
const SPREAD_X = 12; // half-width of the spawn field
const SPREAD_Y = 7; // half-height of the spawn field
const HIT_PAD = 0.6; // aim assist added to a rock radius for hit tests
const MAX_SPAWNS_PER_STEP = 8; // backstop against a runaway accumulator

export interface Rock {
  id: number;
  x: number;
  y: number;
  z: number;
  /** Collision radius (world units), derived from the NEO diameter. */
  r: number;
  vz: number;
  name: string;
  hazardous: boolean;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface GunnerState {
  phase: GunnerPhase;
  rocks: Rock[];
  score: number;
  lives: number;
  combo: number;
  elapsed: number;
  nextId: number;
  spawnAcc: number;
  templateIdx: number;
  templates: NeoTemplate[];
}

export function createGunnerState(templates: NeoTemplate[]): GunnerState {
  return {
    phase: 'idle',
    rocks: [],
    score: 0,
    lives: START_LIVES,
    combo: 0,
    elapsed: 0,
    nextId: 1,
    spawnAcc: BASE_SPAWN, // first rock arrives almost immediately
    templateIdx: 0,
    // Never run with an empty roster, even if the data layer somehow yields none.
    templates:
      templates.length > 0 ? templates : [{ name: 'Asteroid', diameterM: 400, hazardous: false }],
  };
}

export function startGunner(state: GunnerState): GunnerState {
  return state.phase === 'idle' ? { ...state, phase: 'playing' } : state;
}

function speedFor(elapsed: number): number {
  return Math.min(MAX_SPEED, BASE_SPEED + elapsed * SPEED_RAMP);
}

function spawnInterval(elapsed: number): number {
  return Math.max(MIN_SPAWN, BASE_SPAWN - elapsed * SPAWN_RAMP);
}

/** Map a NEO diameter (m) to a playable collision radius (world units). */
function radiusFor(diameterM: number): number {
  // Log scale so a 16 km rock reads as big without dwarfing a 300 m one.
  const r = 0.9 + Math.log10(Math.max(50, diameterM)) * 0.7;
  return Math.max(1.1, Math.min(3.4, r));
}

function makeRock(id: number, t: NeoTemplate, elapsed: number, rng: () => number): Rock {
  const x = (rng() * 2 - 1) * SPREAD_X;
  const y = (rng() * 2 - 1) * SPREAD_Y;
  const jitter = 0.85 + rng() * 0.4;
  return {
    id,
    x,
    y,
    z: SPAWN_Z,
    r: radiusFor(t.diameterM),
    vz: speedFor(elapsed) * jitter,
    name: t.name,
    hazardous: t.hazardous,
  };
}

/** The displayed score is the running point total. */
export function scoreOf(state: GunnerState): number {
  return state.score;
}

/** Advance the world by dt seconds. Returns the same reference when not playing. */
export function step(state: GunnerState, dt: number, rng: () => number = Math.random): GunnerState {
  if (state.phase !== 'playing') return state;

  const elapsed = state.elapsed + dt;

  // Move rocks toward the camera.
  const rocks = state.rocks.map((rk) => ({ ...rk, z: rk.z - rk.vz * dt }));

  // Spawn on a shrinking interval.
  let nextId = state.nextId;
  let templateIdx = state.templateIdx;
  let spawnAcc = state.spawnAcc + dt;
  let spawned = 0;
  while (spawnAcc >= spawnInterval(elapsed) && spawned < MAX_SPAWNS_PER_STEP) {
    spawnAcc -= spawnInterval(elapsed);
    const t = state.templates[templateIdx % state.templates.length];
    rocks.push(makeRock(nextId, t, elapsed, rng));
    nextId += 1;
    templateIdx += 1;
    spawned += 1;
  }

  // Rocks that reach the station leak: lose a life and reset the combo.
  let lives = state.lives;
  let combo = state.combo;
  const survivors: Rock[] = [];
  for (const rk of rocks) {
    if (rk.z <= KILL_Z) {
      lives -= 1;
      combo = 0;
    } else {
      survivors.push(rk);
    }
  }

  return {
    ...state,
    phase: lives <= 0 ? 'over' : 'playing',
    rocks: survivors,
    elapsed,
    lives: Math.max(0, lives),
    combo,
    nextId,
    templateIdx,
    spawnAcc,
  };
}

function comboMultiplier(combo: number): number {
  // 1x, then +1x every 4 consecutive hits, capped at 5x.
  return Math.min(5, 1 + Math.floor(combo / 4));
}

export interface ShotResult {
  state: GunnerState;
  /** Id of the rock destroyed, or null on a miss. */
  hitId: number | null;
  /** Points awarded for this shot. */
  gained: number;
}

/**
 * Fire a ray from the origin in unit direction `dir`. Destroys the nearest
 * rock the ray passes within (radius + aim assist) of, awards points scaled by
 * hazard and the current combo, and returns the updated state. A miss resets
 * the combo. `dir` is expected to be normalized.
 */
export function shoot(state: GunnerState, dir: Vec3): ShotResult {
  if (state.phase !== 'playing') return { state, hitId: null, gained: 0 };

  let best: Rock | null = null;
  let bestT = Infinity;
  for (const rk of state.rocks) {
    const t = rk.x * dir.x + rk.y * dir.y + rk.z * dir.z; // distance along the ray
    if (t <= 0) continue; // behind the camera
    const centerSq = rk.x * rk.x + rk.y * rk.y + rk.z * rk.z;
    const perpSq = centerSq - t * t; // squared distance from the ray to the center
    const reach = rk.r + HIT_PAD;
    if (perpSq <= reach * reach && t < bestT) {
      best = rk;
      bestT = t;
    }
  }

  if (!best) return { state: { ...state, combo: 0 }, hitId: null, gained: 0 };

  const combo = state.combo + 1;
  const gained = (best.hazardous ? 25 : 10) * comboMultiplier(combo);
  const hitId = best.id;
  return {
    state: {
      ...state,
      rocks: state.rocks.filter((rk) => rk.id !== hitId),
      combo,
      score: state.score + gained,
    },
    hitId,
    gained,
  };
}
