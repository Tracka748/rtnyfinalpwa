// Shared-secret check for internal routes called by schedulers (Supabase pg_cron via pg_net, and
// Vercel Cron, which sends "Authorization: Bearer <CRON_SECRET>"). Fails closed: no secret, or a
// secret shorter than 32 characters, means nothing is accepted. Never logs or returns the secret.

import { createHash, timingSafeEqual } from 'node:crypto'

export const MIN_SECRET_LENGTH = 32

export function cronSecretConfigured(secret: string | null | undefined): secret is string {
  return typeof secret === 'string' && secret.trim().length >= MIN_SECRET_LENGTH
}

const digest = (v: string) => createHash('sha256').update(v, 'utf8').digest()

/**
 * True only for exactly "Bearer <secret>". Both sides are hashed first, so the comparison takes the
 * same time whatever the length or content of the supplied token.
 */
export function checkBearer(header: string | null | undefined, secret: string | null | undefined): boolean {
  if (!cronSecretConfigured(secret)) return false
  if (typeof header !== 'string') return false
  const m = /^Bearer ([^\s]+)$/.exec(header)
  if (!m) return false
  return timingSafeEqual(digest(m[1]), digest(secret.trim()))
}
