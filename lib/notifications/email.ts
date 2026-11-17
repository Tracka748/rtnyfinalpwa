// Shared Resend sender for NEW notification emails only. The three existing inline Resend uses are
// intentionally untouched. Returns a provider id or a short fixed error code: raw provider error
// text is never returned, stored or logged.

import { Resend } from 'resend'

export interface EmailConfig { apiKey: string; from: string }

/** Same skip guard as the existing emails: no key or no from address means "not configured". */
export function getEmailConfig(env: NodeJS.ProcessEnv = process.env): EmailConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim()
  const fromEmail = env.RESEND_FROM_EMAIL?.trim()
  if (!apiKey || !fromEmail) return null
  return { apiKey, from: `RTNY <${fromEmail}>` }
}

export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; code: string; retryable: boolean }

/** Maps a provider HTTP status (null = no response) to a fixed code. Codes match ^[a-z0-9_]{1,48}$. */
export function classifyProviderError(
  status: number | null | undefined,
  name?: string | null
): { code: string; retryable: boolean } {
  if (status == null) return { code: 'network_error', retryable: true }
  if (status === 429) return { code: 'provider_rate_limited', retryable: true }
  if (status === 408 || status >= 500) return { code: 'provider_unavailable', retryable: true }
  if (status === 401 || status === 403) return { code: 'provider_auth', retryable: true } // fixable by config
  if (name === 'invalid_to_address') return { code: 'invalid_recipient', retryable: false }
  return { code: 'provider_rejected', retryable: false }
}

/** A provider call that has not answered by then is abandoned and retried later (provider_timeout). */
export const SEND_TIMEOUT_MS = 10_000

const TIMED_OUT = Symbol('timed_out')

export async function sendEmail(
  msg: { to: string; subject: string; html: string; text: string },
  config: EmailConfig | null = getEmailConfig(),
  opts: { timeoutMs?: number } = {}
): Promise<SendResult> {
  if (!config) return { ok: false, code: 'email_not_configured', retryable: false }
  const timeoutMs = opts.timeoutMs ?? SEND_TIMEOUT_MS
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const resend = new Resend(config.apiKey)
    const send = resend.emails.send({
      from: config.from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    })
    const timeout = new Promise<typeof TIMED_OUT>(resolve => { timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs) })
    const res = await Promise.race([send, timeout])
    if (res === TIMED_OUT) {
      // Swallow a late rejection from the abandoned call so it never becomes an unhandled rejection.
      send.catch(() => undefined)
      return { ok: false, code: 'provider_timeout', retryable: true }
    }
    const { data, error } = res
    if (error) {
      const e = error as { statusCode?: number | null; name?: string | null }
      return { ok: false, ...classifyProviderError(e.statusCode, e.name) }
    }
    return { ok: true, id: typeof data?.id === 'string' ? data.id.slice(0, 128) : null }
  } catch {
    return { ok: false, code: 'network_error', retryable: true }
  } finally {
    if (timer) clearTimeout(timer)
  }
}
