/**
 * Star Gunner targets are real near-Earth objects. We pull a page of them
 * live from NASA's public NeoWs API (the shared, keyless DEMO_KEY), cache the
 * result briefly in localStorage to respect the rate limit, and fall back to a
 * small built-in set so the game always works offline. NASA data is public
 * domain. API: https://api.nasa.gov (NeoWs).
 */

export interface NeoTemplate {
  /** Designation, e.g. "433 Eros (A898 PA)". */
  name: string;
  /** Estimated maximum diameter in meters. */
  diameterM: number;
  /** NASA potentially-hazardous-asteroid flag. */
  hazardous: boolean;
}

export type NeoSource = 'nasa' | 'cache' | 'offline';

// Built-in fallback: real, well-known near-Earth objects with approximate
// diameters. Used only when NASA is unreachable, so the game is never empty.
// ponytail: approximate facts are fine for a fallback; live data refines them.
export const OFFLINE_NEOS: readonly NeoTemplate[] = [
  { name: '99942 Apophis', diameterM: 370, hazardous: true },
  { name: '101955 Bennu', diameterM: 490, hazardous: true },
  { name: '433 Eros', diameterM: 16840, hazardous: false },
  { name: '25143 Itokawa', diameterM: 330, hazardous: false },
  { name: '162173 Ryugu', diameterM: 900, hazardous: false },
  { name: '1862 Apollo', diameterM: 1500, hazardous: true },
  { name: '4179 Toutatis', diameterM: 2800, hazardous: true },
  { name: '3122 Florence', diameterM: 4900, hazardous: true },
  { name: '4769 Castalia', diameterM: 1400, hazardous: false },
  { name: '4660 Nereus', diameterM: 330, hazardous: true },
  { name: '65803 Didymos', diameterM: 780, hazardous: true },
  { name: '3200 Phaethon', diameterM: 5100, hazardous: true },
  { name: '1620 Geographos', diameterM: 2500, hazardous: true },
  { name: '1566 Icarus', diameterM: 1400, hazardous: true },
  { name: '2062 Aten', diameterM: 900, hazardous: false },
  { name: '4015 Wilson-Harrington', diameterM: 4000, hazardous: false },
];

const ENDPOINT = 'https://api.nasa.gov/neo/rest/v1/neo/browse?page=0&size=20&api_key=DEMO_KEY';
const CACHE_KEY = 'pixel-pocket-arcade-neo';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MIN_USABLE = 4; // need a few distinct targets for variety

interface CacheDoc {
  at: number;
  neos: NeoTemplate[];
}

function readCache(now: number): NeoTemplate[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const doc = JSON.parse(raw) as CacheDoc;
    if (!doc || !Array.isArray(doc.neos) || doc.neos.length < MIN_USABLE) return null;
    if (now - doc.at > CACHE_TTL_MS) return null;
    return doc.neos;
  } catch {
    return null;
  }
}

function writeCache(neos: NeoTemplate[], now: number): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: now, neos } satisfies CacheDoc));
  } catch {
    // Best effort; the game still runs from the in-memory list.
  }
}

/** Map one raw NeoWs object to our template, or null if it is unusable. */
function toTemplate(raw: unknown): NeoTemplate | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  const est = o.estimated_diameter as { meters?: { estimated_diameter_max?: unknown } } | undefined;
  const dia = est?.meters?.estimated_diameter_max;
  const diameterM = typeof dia === 'number' && Number.isFinite(dia) && dia > 0 ? dia : 0;
  if (!name || diameterM === 0) return null;
  return { name: name.slice(0, 60), diameterM, hazardous: o.is_potentially_hazardous_asteroid === true };
}

/**
 * Resolve the asteroid roster. Tries a fresh localStorage cache, then the NASA
 * API, and finally the built-in set. Never throws: the worst case is the
 * offline list. `now` and `fetchImpl` are injectable for tests.
 */
export async function loadNeos(
  signal?: AbortSignal,
  now: number = Date.now(),
  fetchImpl: typeof fetch = fetch,
): Promise<{ neos: NeoTemplate[]; source: NeoSource }> {
  const cached = readCache(now);
  if (cached) return { neos: cached, source: 'cache' };

  try {
    const res = await fetchImpl(ENDPOINT, { signal });
    if (!res.ok) throw new Error(`NeoWs ${res.status}`);
    const data = (await res.json()) as { near_earth_objects?: unknown };
    const list = Array.isArray(data.near_earth_objects) ? data.near_earth_objects : [];
    const neos = list.map(toTemplate).filter((n): n is NeoTemplate => n !== null);
    if (neos.length >= MIN_USABLE) {
      writeCache(neos, now);
      return { neos, source: 'nasa' };
    }
  } catch {
    // Fall through to the offline set.
  }
  return { neos: [...OFFLINE_NEOS], source: 'offline' };
}
