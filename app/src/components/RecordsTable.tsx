import type { ListRow } from '../types/api'
import type { KeyboardEvent } from 'react'

interface RecordsTableProps {
  rows: ListRow[]
  /** Called when a row is clicked or activated via keyboard. */
  onRowClick: (row: ListRow) => void
  /** Columns to display. Defaults to all keys found in the first row. */
  columns?: string[]
}

/** Derive a display label from a camelCase / snake_case field key. */
function labelFromKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Accessible, keyboard-navigable records table.
 *
 * Rows are focusable (tabIndex=0) and respond to Enter/Space for activation,
 * so keyboard users can navigate the full table without a mouse.
 * The table is wrapped in a horizontally scrollable container for small screens.
 */
export function RecordsTable({ rows, onRowClick, columns }: RecordsTableProps) {
  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-500" role="status">
        No records found.
      </p>
    )
  }

  // Derive column list from first row if not provided
  const cols = columns ?? Object.keys(rows[0])

  function handleKeyDown(e: KeyboardEvent<HTMLTableRowElement>, row: ListRow) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onRowClick(row)
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 text-left">
            {cols.map((col) => (
              <th
                key={col}
                scope="col"
                className="border-b border-gray-200 px-4 py-3 font-semibold text-gray-700 first:pl-5 last:pr-5"
              >
                {labelFromKey(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.id ?? idx}
              tabIndex={0}
              role="button"
              aria-label={`Open record ${String(row.id)}`}
              onClick={() => onRowClick(row)}
              onKeyDown={(e) => handleKeyDown(e, row)}
              className="cursor-pointer border-b border-gray-100 bg-white transition-colors last:border-0 hover:bg-accent-50 focus-visible:bg-accent-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-500"
            >
              {cols.map((col) => (
                <td
                  key={col}
                  className="px-4 py-3 text-gray-700 first:pl-5 last:pr-5"
                >
                  {row[col] !== undefined && row[col] !== null
                    ? String(row[col])
                    : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
