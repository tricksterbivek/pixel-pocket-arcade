/**
 * Unit tests for suiteletClient — URL building and envelope parsing.
 * fetch() is replaced with a vi.fn() mock; no real network calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock suiteletUrl so getSuiteletBaseUrl returns a stable test value.
// We do this BEFORE importing the client so the module picks up the mock.
// ---------------------------------------------------------------------------
vi.mock('../lib/suiteletUrl', () => ({
  getSuiteletBaseUrl: () => 'https://ns.example.com/app/site/hosting/scriptlet.nl?script=1&deploy=1',
  getSuiteletBasename: () => '/app/site/hosting/scriptlet.nl',
}))

import { list, get, update } from '../lib/suiteletClient'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchJson(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('suiteletClient.list', () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchSpy = mockFetchJson({
      ok: true,
      data: { rows: [{ id: 1, name: 'Acme' }], total: 1, limit: 50, offset: 0 },
    })
    globalThis.fetch = fetchSpy
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls fetch with action=list and correct query params', async () => {
    await list({ type: 'customer', limit: 50, offset: 0 })

    expect(fetchSpy).toHaveBeenCalledOnce()
    const calledUrl: string = fetchSpy.mock.calls[0][0]
    const url = new URL(calledUrl)
    expect(url.searchParams.get('action')).toBe('list')
    expect(url.searchParams.get('type')).toBe('customer')
    expect(url.searchParams.get('limit')).toBe('50')
    expect(url.searchParams.get('offset')).toBe('0')
  })

  it('includes q param when provided', async () => {
    await list({ type: 'customer', limit: 50, offset: 0, q: 'acme' })

    const calledUrl: string = fetchSpy.mock.calls[0][0]
    const url = new URL(calledUrl)
    expect(url.searchParams.get('q')).toBe('acme')
  })

  it('omits q param when empty string', async () => {
    await list({ type: 'customer', limit: 50, offset: 0, q: '' })

    const calledUrl: string = fetchSpy.mock.calls[0][0]
    const url = new URL(calledUrl)
    expect(url.searchParams.has('q')).toBe(false)
  })

  it('returns the unwrapped data on ok:true', async () => {
    const result = await list({ type: 'customer', limit: 50, offset: 0 })
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].name).toBe('Acme')
    expect(result.total).toBe(1)
  })

  it('throws the server error message on ok:false', async () => {
    globalThis.fetch = mockFetchJson({ ok: false, error: 'Record type not allowed' })

    await expect(
      list({ type: 'bad', limit: 50, offset: 0 })
    ).rejects.toThrow('Record type not allowed')
  })

  it('throws a descriptive error on non-JSON response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    } as unknown as Response)

    await expect(
      list({ type: 'customer', limit: 50, offset: 0 })
    ).rejects.toThrow('non-JSON')
  })

  it('throws a descriptive error on network failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(
      list({ type: 'customer', limit: 50, offset: 0 })
    ).rejects.toThrow('network error')
  })

  it('uses credentials: same-origin', async () => {
    await list({ type: 'customer', limit: 50, offset: 0 })
    const calledOptions = fetchSpy.mock.calls[0][1] as RequestInit
    expect(calledOptions.credentials).toBe('same-origin')
  })
})

describe('suiteletClient.get', () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchSpy = mockFetchJson({
      ok: true,
      data: { id: 123, fields: { name: 'Acme Corp', email: 'a@acme.com' } },
    })
    globalThis.fetch = fetchSpy
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls fetch with action=get and id param', async () => {
    await get({ type: 'customer', id: 123 })

    const calledUrl: string = fetchSpy.mock.calls[0][0]
    const url = new URL(calledUrl)
    expect(url.searchParams.get('action')).toBe('get')
    expect(url.searchParams.get('type')).toBe('customer')
    expect(url.searchParams.get('id')).toBe('123')
  })

  it('returns unwrapped data', async () => {
    const result = await get({ type: 'customer', id: 123 })
    expect(result.id).toBe(123)
    expect(result.fields.name).toBe('Acme Corp')
  })

  it('throws on ok:false', async () => {
    globalThis.fetch = mockFetchJson({ ok: false, error: 'Not found' })
    await expect(get({ type: 'customer', id: 999 })).rejects.toThrow('Not found')
  })
})

describe('suiteletClient.update', () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchSpy = mockFetchJson({ ok: true, data: { id: 123 } })
    globalThis.fetch = fetchSpy
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('POSTs JSON body with action=update', async () => {
    await update({ action: 'update', type: 'customer', id: 123, values: { comments: 'VIP' } })

    const calledOptions = fetchSpy.mock.calls[0][1] as RequestInit
    expect(calledOptions.method).toBe('POST')
    const body = JSON.parse(calledOptions.body as string) as Record<string, unknown>
    expect(body.action).toBe('update')
    expect(body.id).toBe(123)
    expect((body.values as Record<string, unknown>).comments).toBe('VIP')
  })

  it('returns unwrapped data with id', async () => {
    const result = await update({ action: 'update', type: 'customer', id: 123, values: {} })
    expect(result.id).toBe(123)
  })
})
