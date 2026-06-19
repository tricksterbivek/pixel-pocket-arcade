import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { get } from '../lib/suiteletClient'
import type { GetData } from '../types/api'
import { ErrorBanner } from '../components/ErrorBanner'

function labelFromKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function RecordDetailPage() {
  const { type, id } = useParams<{ type: string; id: string }>()

  const [record, setRecord] = useState<GetData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!type || !id) return

    setLoading(true)
    setError(null)

    get({ type, id })
      .then((data) => setRecord(data))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err))
      )
      .finally(() => setLoading(false))
  }, [type, id])

  const backPath = '/'

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to={backPath}
        className="inline-flex items-center gap-1 text-sm text-accent-600 hover:text-accent-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
        aria-label="Back to dashboard"
      >
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
            clipRule="evenodd"
          />
        </svg>
        Back to Dashboard
      </Link>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold capitalize text-gray-900">
          {type ?? 'Record'} #{id}
        </h1>
      </div>

      {/* Error */}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Loading */}
      {loading && (
        <div
          role="status"
          aria-label="Loading record"
          className="space-y-3"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-5 w-32 animate-pulse rounded bg-gray-100" />
              <div className="h-5 flex-1 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      )}

      {/* Record fields */}
      {!loading && record && (
        <section aria-label="Record details">
          <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-sm">
            {/* Always show the internal ID first */}
            <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:gap-8">
              <dt className="w-40 shrink-0 text-sm font-medium text-gray-500">
                Internal ID
              </dt>
              <dd className="text-sm text-gray-900">{record.id}</dd>
            </div>

            {Object.entries(record.fields).map(([key, value]) => (
              <div
                key={key}
                className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:gap-8"
              >
                <dt className="w-40 shrink-0 text-sm font-medium text-gray-500">
                  {labelFromKey(key)}
                </dt>
                <dd className="break-all text-sm text-gray-900">
                  {value !== null && value !== undefined
                    ? String(value)
                    : <span className="text-gray-400">—</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Empty fields fallback */}
      {!loading && record && Object.keys(record.fields).length === 0 && (
        <p className="text-sm text-gray-500">No fields returned for this record.</p>
      )}
    </div>
  )
}
