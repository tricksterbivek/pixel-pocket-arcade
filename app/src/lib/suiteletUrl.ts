/**
 * Resolves the Suitelet base URL and React Router basename at runtime.
 *
 * In production the SPA is served *from* the Suitelet URL, so the base URL
 * is simply the current page URL (pathname + the script/deploy query params).
 * React Router's basename needs just the pathname portion.
 *
 * In local dev (`npm run dev`) there is no real Suitelet; we fall back to
 * either VITE_SUITELET_URL (set in .env) or a placeholder string so the app
 * still boots and components can be exercised with mocked data.
 */

function isSuiteletUrl(url: URL): boolean {
  return (
    url.searchParams.has('script') && url.searchParams.has('deploy')
  )
}

/**
 * Returns the full Suitelet base URL string (pathname + script/deploy params).
 * This is the URL that fetch() targets for all ?action=... calls.
 */
export function getSuiteletBaseUrl(): string {
  if (typeof window === 'undefined') {
    // SSR / test environment fallback
    return '/suitelet'
  }

  const current = new URL(window.location.href)

  // Running inside NetSuite — the current URL IS the Suitelet URL
  if (isSuiteletUrl(current)) {
    const base = new URL(current.href)
    // Strip any action / data params; keep only script + deploy
    const keepParams = ['script', 'deploy']
    ;[...base.searchParams.keys()].forEach((key) => {
      if (!keepParams.includes(key)) base.searchParams.delete(key)
    })
    return base.toString()
  }

  // Local dev: honour env override
  const envUrl = import.meta.env.VITE_SUITELET_URL as string | undefined
  if (envUrl) return envUrl

  // Ultimate fallback (dev mock server or stub)
  return `${current.origin}/suitelet`
}

/**
 * Returns the React Router `basename` (the pathname portion of the Suitelet URL).
 * BrowserRouter uses this so that `/` maps to the Suitelet's own path, not `/`.
 */
export function getSuiteletBasename(): string {
  if (typeof window === 'undefined') return '/'

  const current = new URL(window.location.href)

  if (isSuiteletUrl(current)) {
    // e.g. "/app/site/hosting/scriptlet.nl"
    return current.pathname
  }

  // Local dev — basename is just "/"
  return '/'
}
