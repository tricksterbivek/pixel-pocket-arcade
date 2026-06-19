/**
 * Pure deterministic logic for Mini Drive, a three-lane car dodge.
 * No React, no timers, no three.js. Randomness is injected for tests.
 * The renderer calls step() on a fixed timestep and maps lane and z to 3D.
 */

export type DrivePhase = 'idle' | 'playing' | 'over';

export const LANES = 3;
const CENTER_LANE = Math.floor(LANES / 2);

const BASE_SPEED = 13; // world units per second
const MAX_SPEED = 34;
const SPEED_RAMP = 0.02; // speed gained per meter travelled
const SPAWN_Z = 56; // distance ahead where obstacles appear
const SPAWN_INTERVAL = 8.5; // meters between spawn waves
const REMOVE_Z = -4; // obstacles past the player are dropped
const CAR_HALF = 1.7; // collision half-length around the player at z = 0

export interface Obstacle {
  id: number;
  lane: number;
  z: number;
}

export interface DriveState {
  phase: DrivePhase;
  lane: number;
  obstacles: Obstacle[];
  distance: number;
  nextId: number;
  spawnAcc: number;
}

export function createDriveState(): DriveState {
  return { phase: 'idle', lane: CENTER_LANE, obstacles: [], distance: 0, nextId: 1, spawnAcc: 0 };
}

export function startDrive(state: DriveState): DriveState {
  return state.phase === 'idle' ? { ...state, phase: 'playing' } : state;
}

export function steer(state: DriveState, dir: -1 | 1): DriveState {
  if (state.phase !== 'playing') return state;
  const lane = Math.min(LANES - 1, Math.max(0, state.lane + dir));
  return lane === state.lane ? state : { ...state, lane };
}

/** Speed ramps with distance up to a cap. */
export function speedForDistance(distance: number): number {
  return Math.min(MAX_SPEED, BASE_SPEED + distance * SPEED_RAMP);
}

/** The displayed score is the whole-meter distance. */
export function scoreOf(state: DriveState): number {
  return Math.floor(state.distance);
}

/** Pick lanes for one spawn wave, always leaving at least one lane free. */
function spawnWave(nextId: number, rng: () => number): { obstacles: Obstacle[]; nextId: number } {
  const lanes: number[] = [];
  if (rng() < 0.55) {
    // Two obstacles: block every lane except one randomly chosen free lane.
    const free = Math.floor(rng() * LANES);
    for (let l = 0; l < LANES; l++) if (l !== free) lanes.push(l);
  } else {
    lanes.push(Math.floor(rng() * LANES));
  }
  let id = nextId;
  const obstacles = lanes.map((lane) => ({ id: id++, lane, z: SPAWN_Z }));
  return { obstacles, nextId: id };
}

/** Advance the world by dt seconds. Returns the same reference when not playing. */
export function step(state: DriveState, dt: number, rng: () => number = Math.random): DriveState {
  if (state.phase !== 'playing') return state;

  const speed = speedForDistance(state.distance);
  const dz = speed * dt;

  let obstacles = state.obstacles
    .map((o) => ({ ...o, z: o.z - dz }))
    .filter((o) => o.z > REMOVE_Z);

  let nextId = state.nextId;
  let spawnAcc = state.spawnAcc + dz;
  while (spawnAcc >= SPAWN_INTERVAL) {
    spawnAcc -= SPAWN_INTERVAL;
    const wave = spawnWave(nextId, rng);
    obstacles = obstacles.concat(wave.obstacles);
    nextId = wave.nextId;
  }

  const hit = obstacles.some(
    (o) => o.lane === state.lane && o.z <= CAR_HALF && o.z >= -CAR_HALF,
  );

  return {
    ...state,
    obstacles,
    distance: state.distance + dz,
    nextId,
    spawnAcc,
    phase: hit ? 'over' : 'playing',
  };
}
