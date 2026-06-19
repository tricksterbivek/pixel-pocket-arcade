/**
 * DashboardPage integration tests.
 * - Mocks suiteletClient so no real network calls happen.
 * - Asserts: rows render, filter triggers re-fetch, row click navigates.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from '../pages/DashboardPage'
import type { ListData } from '../types/api'

// ---------------------------------------------------------------------------
// Mock suiteletClient
// ---------------------------------------------------------------------------
const mockList = vi.fn()

vi.mock('../lib/suiteletClient', () => ({
  list: (...args: unknown[]) => mockList(...args),
}))

// ---------------------------------------------------------------------------
// Also mock suiteletUrl so the module resolves cleanly in jsdom
// ---------------------------------------------------------------------------
vi.mock('../lib/suiteletUrl', () => ({
  getSuiteletBaseUrl: () => 'https://ns.example.com/suitelet',
  getSuiteletBasename: () => '/',
}))

// ---------------------------------------------------------------------------
// Mock react-router-dom's useNavigate with a stable, hoisted spy while keeping
// MemoryRouter (and everything else) real. Hoisting is required because the
// mock factory runs before the module imports below are evaluated.
// ---------------------------------------------------------------------------
const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateSpy }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeListData(overrides?: Partial<ListData>): ListData {
  return {
    rows: [
      { id: 1, name: 'Acme Corp', email: 'acme@example.com', date: '2026-01-01' },
      { id: 2, name: 'Globex Inc', email: 'globex@example.com', date: '2026-02-01' },
    ],
    total: 2,
    limit: 50,
    offset: 0,
    ...overrides,
  }
}

/** Wrap the page in a MemoryRouter (DashboardPage uses useNavigate). */
function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <DashboardPage />
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DashboardPage', () => {
  beforeEach(() => {
    mockList.mockResolvedValue(makeListData())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('fetches records on mount and renders rows', async () => {
    renderDashboard()

    // Wait for rows to appear
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    expect(screen.getByText('Globex Inc')).toBeInTheDocument()
    expect(mockList).toHaveBeenCalledOnce()
    expect(mockList).toHaveBeenCalledWith({
      type: 'customer',
      limit: 50,
      offset: 0,
      q: undefined,
    })
  })

  it('renders column headers derived from row keys', async () => {
    renderDashboard()

    await waitFor(() => screen.getByText('Acme Corp'))

    // Column headers should be capitalised versions of the row keys
    expect(screen.getByText('Id')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('shows an error banner when the fetch fails', async () => {
    mockList.mockRejectedValueOnce(new Error('Server blew up'))
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server blew up')
    })
  })

  it('re-fetches with q param when the search form is submitted', async () => {
    mockList
      .mockResolvedValueOnce(makeListData())      // initial fetch
      .mockResolvedValueOnce(makeListData({       // filtered fetch
        rows: [{ id: 1, name: 'Acme Corp', email: 'acme@example.com', date: '2026-01-01' }],
        total: 1,
      }))

    const user = userEvent.setup()
    renderDashboard()

    // Wait for initial render
    await waitFor(() => screen.getByText('Acme Corp'))

    // Type in the filter bar and submit
    const input = screen.getByRole('searchbox')
    await user.clear(input)
    await user.type(input, 'acme')
    await user.click(screen.getByRole('button', { name: /submit search/i }))

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(2)
    })

    const secondCall = mockList.mock.calls[1][0] as { q: string; offset: number }
    expect(secondCall.q).toBe('acme')
    expect(secondCall.offset).toBe(0)
  })

  it('navigates to the detail page when a row is clicked', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await waitFor(() => screen.getByText('Acme Corp'))

    const table = screen.getByRole('table')
    const acmeRow = within(table).getByText('Acme Corp').closest('tr')!
    await user.click(acmeRow)

    expect(navigateSpy).toHaveBeenCalledWith('/records/customer/1')
  })

  it('shows empty state when rows array is empty', async () => {
    mockList.mockResolvedValueOnce(makeListData({ rows: [], total: 0 }))
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText(/no customer records found/i)).toBeInTheDocument()
    })
  })

  it('shows pagination summary when there are results', async () => {
    mockList.mockResolvedValueOnce(makeListData({ total: 412, rows: [{ id: 1, name: 'Acme Corp' }] }))
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText(/showing 1–50 of 412/i)).toBeInTheDocument()
    })
  })

  it('disables Prev button on the first page', async () => {
    renderDashboard()
    await waitFor(() => screen.getByText('Acme Corp'))

    const prevBtn = screen.getByRole('button', { name: /previous page/i })
    expect(prevBtn).toBeDisabled()
  })
})
