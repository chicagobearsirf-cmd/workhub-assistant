const SESSION_KEY = 'workhub_session'

/** Shape-validates a parsed session object. */
function isValid(parsed) {
  return !!(parsed?.locationId && parsed?.businessName)
}

/**
 * Returns { locationId, businessName } if a valid session exists, else null.
 * Checks localStorage first (permanent), then sessionStorage (tab fallback).
 * No expiry — sessions live until explicit logout.
 */
export function getSession() {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(SESSION_KEY)
      if (!raw) continue
      const parsed = JSON.parse(raw)
      if (isValid(parsed)) return parsed
    } catch {
      // corrupt entry — skip
    }
  }
  return null
}

/**
 * Persists the session to BOTH localStorage (survives close) and
 * sessionStorage (tab-scoped fallback). No timestamp or expiry written.
 * @param {{ locationId: string, businessName: string }} data
 */
export function setSession(data) {
  const raw = JSON.stringify(data)
  localStorage.setItem(SESSION_KEY, raw)
  sessionStorage.setItem(SESSION_KEY, raw)
}

/**
 * Clears the session from both stores (logout).
 */
export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}
