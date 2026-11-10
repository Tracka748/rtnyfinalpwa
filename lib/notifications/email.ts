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

export async function sendEmail(
  msg: { to: string; subject: string; html: string; text: string },
  config: EmailConfig | null = getEmailConfig()
): Promise<SendResult> {
  if (!config) return { ok: false, code: 'email_not_configured', retryable: false }
  try {
    const resend = new Resend(config.apiKey)
    const { data, error } = await resend.emails.send({
      from: config.from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    })
    if (error) {
      const e = error as { statusCode?: number | null; name?: string | null }
      return { ok: false, ...classifyProviderError(e.statusCode, e.name) }
    }
    return { ok: true, id: typeof data?.id === 'string' ? data.id.slice(0, 128) : null }
  } catch {
    return { ok: false, code: 'network_error', retryable: true }
  }
}
