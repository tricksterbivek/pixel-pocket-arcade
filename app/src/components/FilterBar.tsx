import { useState, type FormEvent } from 'react'

interface FilterBarProps {
  /** Called when the user submits a search query. Receives the trimmed string. */
  onSearch: (query: string) => void
  /** Initial value for the search input. */
  defaultValue?: string
  /** Placeholder text for the search input. */
  placeholder?: string
  /** Whether a fetch is currently in progress — disables the button. */
  loading?: boolean
}

/**
 * Labeled search bar.
 * Accessible: explicit <label> + htmlFor, button type="submit" inside a form.
 */
export function FilterBar({
  onSearch,
  defaultValue = '',
  placeholder = 'Search records…',
  loading = false,
}: FilterBarProps) {
  const [query, setQuery] = useState(defaultValue)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onSearch(query.trim())
  }

  function handleClear() {
    setQuery('')
    onSearch('')
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label
          htmlFor="filter-bar-input"
          className="text-xs font-medium text-gray-600"
        >
          Search
        </label>
        <input
          id="filter-bar-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        aria-label="Submit search"
        className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Searching…' : 'Search'}
      </button>

      {query && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
        >
          Clear
        </button>
      )}
    </form>
  )
}
