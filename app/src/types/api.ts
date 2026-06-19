/**
 * Shared TypeScript types for the SuiteReact JSON API contract.
 * Matches ARCHITECTURE.md §5 exactly.
 */

/** Standard envelope returned by every JSON response from the Suitelet. */
export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// ---------------------------------------------------------------------------
// list action
// ---------------------------------------------------------------------------

/** Query params for GET ?action=list */
export interface ListParams {
  type: string
  limit: number
  offset: number
  q?: string
}

/** A single row in a list result. Additional fields are allowed. */
export interface ListRow {
  id: number
  [key: string]: unknown
}

/** Response payload for action=list */
export interface ListData {
  rows: ListRow[]
  total: number
  limit: number
  offset: number
}

// ---------------------------------------------------------------------------
// get action
// ---------------------------------------------------------------------------

/** Query params for GET ?action=get */
export interface GetParams {
  type: string
  id: number | string
}

/** Response payload for action=get */
export interface GetData {
  id: number
  fields: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// update action (POST)
// ---------------------------------------------------------------------------

/** POST body for action=update */
export interface UpdateParams {
  action: 'update'
  type: string
  id: number | string
  values: Record<string, unknown>
}

/** Response payload for action=update */
export interface UpdateData {
  id: number
}
