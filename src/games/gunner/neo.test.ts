import { afterEach, describe, expect, it } from 'vitest';
import { OFFLINE_NEOS, loadNeos } from './neo';

afterEach(() => localStorage.clear());

function ok(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

const NASA_PAGE = {
  near_earth_objects: [
    {
      name: '433 Eros (A898 PA)',
      estimated_diameter: { meters: { estimated_diameter_max: 16840 } },
      is_potentially_hazardous_asteroid: false,
    },
    {
      name: '99942 Apophis',
      estimated_diameter: { meters: { estimated_diameter_max: 375 } },
      is_potentially_hazardous_asteroid: true,
    },
    { name: 'broken, no diameter' }, // unusable, dropped
    {
      name: 'X',
      estimated_diameter: { meters: { estimated_diameter_max: 100 } },
      is_potentially_hazardous_asteroid: false,
    },
    {
      name: 'Y',
      estimated_diameter: { meters: { estimated_diameter_max: 200 } },
      is_potentially_hazardous_asteroid: false,
    },
  ],
};

describe('loadNeos', () => {
  it('maps a NASA page and reports the nasa source', async () => {
    const fetchImpl = (async () => ok(NASA_PAGE)) as unknown as typeof fetch;
    const { neos, source } = await loadNeos(undefined, 1000, fetchImpl);
    expect(source).toBe('nasa');
    expect(neos.find((n) => n.name.startsWith('433 Eros'))?.hazardous).toBe(false);
    expect(neos.find((n) => n.name === '99942 Apophis')?.hazardous).toBe(true);
    expect(neos.some((n) => n.name.startsWith('broken'))).toBe(false);
  });

  it('falls back to the offline set when the request fails', async () => {
    const fetchImpl = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const { neos, source } = await loadNeos(undefined, 1000, fetchImpl);
    expect(source).toBe('offline');
    expect(neos).toEqual(OFFLINE_NEOS);
  });

  it('serves a fresh cache without fetching again', async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return ok(NASA_PAGE);
    }) as unknown as typeof fetch;
    await loadNeos(undefined, 1000, fetchImpl); // populates the cache
    const second = await loadNeos(undefined, 2000, fetchImpl); // within the TTL
    expect(calls).toBe(1);
    expect(second.source).toBe('cache');
  });
});
