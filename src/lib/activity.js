const ACTIVITY_KEY = 'workhub_activity'
const MAX_ENTRIES  = 50

/**
 * Write a new activity entry to localStorage.
 * @param {{ icon: string, title: string, description: string, status?: string }} entry
 */
export function logActivity(entry) {
  try {
    const existing = getActivity()
    const next = [
      {
        id:        Date.now(),
        icon:      entry.icon      || 'contact',
        title:     entry.title     || 'Action',
        description: entry.description || '',
        status:    entry.status    || 'success',
        timestamp: new Date().toISOString(),
      },
      ...existing,
    ].slice(0, MAX_ENTRIES)  // cap at 50 entries
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next))
  } catch { /* storage unavailable — silently skip */ }
}

/**
 * Read all stored activity entries, newest first.
 * @returns {Array}
 */
export function getActivity() {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

/**
 * Clear all activity entries.
 */
export function clearActivity() {
  try {
    localStorage.removeItem(ACTIVITY_KEY)
  } catch { /* ignore */ }
}

/**
 * Format an ISO timestamp into a human-friendly relative string.
 */
export function relativeTime(iso) {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const s = Math.floor(diff / 1000)
    if (s < 60)          return 'just now'
    const m = Math.floor(s / 60)
    if (m < 60)          return `${m} min ago`
    const h = Math.floor(m / 60)
    if (h < 24)          return `${h} hr ago`
    const d = Math.floor(h / 24)
    return `${d} day${d !== 1 ? 's' : ''} ago`
  } catch {
    return ''
  }
}
