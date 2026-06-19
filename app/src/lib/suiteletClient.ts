/**
 * Typed fetch() wrapper for the SuiteReact Suitelet JSON API.
 *
 * - Credentials: 'same-origin' (NetSuite session cookie is automatic)
 * - No Authorization headers — the Suitelet uses the logged-in session
 * - Parses the { ok, data | error } envelope and throws on ok===false
 */

import { getSuiteletBaseUrl } from './suiteletUrl'
import type { ApiResponse, ListData, ListParams, GetData, GetParams, UpdateData, UpdateParams } from '../types/api'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build a URL with query params appended to the Suitelet base. */
function buildUrl(params: Record<string, string | number | undefined>): string {
  const base = getSuiteletBaseUrl()

  // getSuiteletBaseUrl returns either an absolute URL or a path.
  // Resolve against a fallback origin so new URL() never throws.
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const absoluteBase = base.startsWith('http') ? new URL(base) : new URL(base, origin)

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      absoluteBase.searchParams.set(key, String(value))
    }
  }

  return absoluteBase.toString()
}

/** Parse response JSON and unwrap the { ok, data | error } envelope. */
async function parseEnvelope<T>(response: Response): Promise<T> {
  let json: unknown
  try {
    json = await response.json()
  } catch {
    throw new Error(
      `SuiteReact: server returned non-JSON response (status ${response.status})`
    )
  }

  const envelope = json as ApiResponse<T>

  if (!envelope.ok) {
    throw new Error(envelope.error ?? 'Unknown server error')
  }

  return envelope.data
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * GET ?action=list — fetches a paginated list of records.
 */
export async function list(params: ListParams): Promise<ListData> {
  const url = buildUrl({
    action: 'list',
    type: params.type,
    limit: params.limit,
    offset: params.offset,
    ...(params.q ? { q: params.q } : {}),
  })

  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
  } catch (err) {
    throw new Error(`SuiteReact: network error during list — ${String(err)}`)
  }

  return parseEnvelope<ListData>(response)
}

/**
 * GET ?action=get — fetches a single record by type + id.
 */
export async function get(params: GetParams): Promise<GetData> {
  const url = buildUrl({
    action: 'get',
    type: params.type,
    id: String(params.id),
  })

  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
  } catch (err) {
    throw new Error(`SuiteReact: network error during get — ${String(err)}`)
  }

  return parseEnvelope<GetData>(response)
}

/**
 * POST — mutates a record.
 */
export async function update(params: UpdateParams): Promise<UpdateData> {
  const url = getSuiteletBaseUrl()

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(params),
    })
  } catch (err) {
    throw new Error(`SuiteReact: network error during update — ${String(err)}`)
  }

  return parseEnvelope<UpdateData>(response)
}
