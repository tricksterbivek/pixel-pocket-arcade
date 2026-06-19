import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { list } from '../lib/suiteletClient'
import type { ListData, ListRow } from '../types/api'
import { RecordsTable } from '../components/RecordsTable'
import { FilterBar } from '../components/FilterBar'
import { ErrorBanner } from '../components/ErrorBanner'

const RECORD_TYPE = 'customer'
const PAGE_SIZE = 50

export function DashboardPage() {
  const navigate = useNavigate()

  const [data, setData] = useState<ListData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)

  const fetchRecords = useCallback(
    async (q: string, pageOffset: number) => {
      setLoading(true)
      setError(null)
      try {
        const result = await list({
          type: RECORD_TYPE,
          limit: PAGE_SIZE,
          offset: pageOffset,
          q: q || undefined,
        })
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Initial fetch on mount — use the literal initial values so there is no
  // stale-closure ambiguity (fetchRecords is stable via useCallback([])).
  useEffect(() => {
    void fetchRecords('', 0)
  }, [fetchRecords])

  function handleSearch(q: string) {
    setQuery(q)
    setOffset(0)
    void fetchRecords(q, 0)
  }

  function handlePrev() {
    const newOffset = Math.max(0, offset - PAGE_SIZE)
    setOffset(newOffset)
    void fetchRecords(query, newOffset)
  }

  function handleNext() {
    const newOffset = offset + PAGE_SIZE
    setOffset(newOffset)
    void fetchRecords(query, newOffset)
  }

  function handleRowClick(row: ListRow) {
    navigate(`/records/${RECORD_TYPE}/${row.id}`)
  }

  const total = data?.total ?? 0
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasPrev = offset > 0
  const hasNext = offset + PAGE_SIZE < total

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
        <p className="mt-1 text-sm text-gray-500">
          Browse and search customer records.
        </p>
      </div>

      {/* Error */}
      {error && (
        <ErrorBanner
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Filter bar */}
      <FilterBar
        onSearch={handleSearch}
        placeholder="Search by name, email…"
        loading={loading}
      />

      {/* Loading skeleton */}
      {loading && (
        <div
          role="status"
          aria-label="Loading records"
          className="space-y-2"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-md bg-gray-100"
            />
          ))}
        </div>
      )}

      {/* Table */}
      {!loading && data && (
        <>
          <RecordsTable rows={data.rows} onRowClick={handleRowClick} />

          {/* Pagination */}
          <nav
            aria-label="Pagination"
            className="flex items-center justify-between border-t border-gray-200 pt-4 text-sm text-gray-600"
          >
            <p>
              {total > 0
                ? `Showing ${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total}`
                : 'No results'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={!hasPrev}
                aria-label="Previous page"
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="flex items-center px-2" aria-current="page">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={handleNext}
                disabled={!hasNext}
                aria-label="Next page"
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </nav>
        </>
      )}

      {/* Empty state (after a successful fetch with zero results) */}
      {!loading && data && data.rows.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-16 text-center">
          <p className="text-gray-500">No customer records found.</p>
          {query && (
            <button
              type="button"
              onClick={() => handleSearch('')}
              className="mt-3 text-sm text-accent-600 underline hover:text-accent-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  )
}
