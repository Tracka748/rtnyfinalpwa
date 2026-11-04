// Same-origin return path for after sign-in. Stored in sessionStorage by the page that needs the
// user to sign in; read by VerifyForm. Only relative paths are ever accepted.

export const RETURN_TO_KEY = 'rtny:return-to'
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** sessionStorage can throw (private mode, blocked storage) or be missing (server). */
export function safeSessionStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

/** A same-origin relative path ('/x'), never '//host', '/\host', a scheme or control characters. */
export function safeReturnPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 300) return null
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null
  if (/[\u0000-\u001F\u007F-\u009F]/.test(raw)) return null
  try {
    const u = new URL(raw, 'http://rtny.invalid')
    if (u.origin !== 'http://rtny.invalid') return null
    return u.pathname + u.search + u.hash
  } catch {
    return null
  }
}

export function setReturnTo(storage: StorageLike | null, path: string): boolean {
  const safe = safeReturnPath(path)
  if (!safe || !storage) return false
  try {
    storage.setItem(RETURN_TO_KEY, safe)
    return true
  } catch {
    return false
  }
}
