// Only plain web URLs are ever rendered as a link or an image source.

const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F-\u009F]/
export const SAFE_URL_MAX = 2000

/**
 * Returns the URL (trimmed) only when it parses as an absolute http: or https: URL, is at most 2000
 * characters and has no control characters. Everything else (javascript:, data:, relative paths,
 * empty values, other schemes) returns null.
 */
export function safeExternalUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  if (CONTROL_CHARS_RE.test(raw)) return null
  const s = raw.trim()
  if (s === '' || s.length > SAFE_URL_MAX) return null
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:' ? s : null
  } catch {
    return null
  }
}
