import type { ReactNode } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { DashboardPage } from './pages/DashboardPage'
import { RecordDetailPage } from './pages/RecordDetailPage'

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const { pathname } = useLocation()
  const isActive = pathname === to

  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={[
        'rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
        isActive
          ? 'bg-white/20 text-white'
          : 'text-white/80 hover:bg-white/10 hover:text-white',
      ].join(' ')}
    >
      {children}
    </Link>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-accent-800 bg-accent-700 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo / brand */}
          <Link
            to="/"
            className="flex items-center gap-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="SuiteReact home"
          >
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M7 8h10M7 12h7M7 16h9" strokeLinecap="round" />
            </svg>
            <span className="text-base font-semibold tracking-tight">SuiteReact</span>
          </Link>

          {/* Navigation */}
          <nav aria-label="Main navigation" className="flex gap-1">
            <NavLink to="/">Dashboard</NavLink>
          </nav>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8"
      >
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/records/:type/:id" element={<RecordDetailPage />} />
          {/* Fallback */}
          <Route
            path="*"
            element={
              <div className="py-16 text-center">
                <h2 className="text-xl font-semibold text-gray-700">Page not found</h2>
                <Link
                  to="/"
                  className="mt-4 inline-block text-sm text-accent-600 underline hover:text-accent-700"
                >
                  Return to Dashboard
                </Link>
              </div>
            }
          />
        </Routes>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
        SuiteReact — NetSuite React SPA Starter
      </footer>
    </div>
  )
}
