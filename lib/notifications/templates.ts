// Pure builders for notification emails. No I/O. Inputs are limited to fixed vocabulary
// (request source/kind), the request id and the app URL, so no customer contact details and no
// customer free text (notes, event_type) can reach a body. Every interpolated value is escaped.

export interface EmailContent { subject: string; html: string; text: string }

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Strict base URL for links in emails. Valid only when it parses, is https, has a host, carries no
 * credentials, has an empty or "/" path, and has no query or fragment. The URL parser drops an empty
 * "?" or "#", so a raw "?" or "#" is rejected too. The result is the parsed origin (no trailing slash).
 */
export function parseBaseUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim()
  if (!v || v.includes('?') || v.includes('#')) return null
  let u: URL
  try { u = new URL(v) } catch { return null }
  if (u.protocol !== 'https:' || !u.hostname) return null
  if (u.username || u.password) return null
  if (u.pathname !== '' && u.pathname !== '/') return null
  if (u.search || u.hash) return null
  return u.origin
}

/** Exact customer wording per status. Fixed text only: no links, no reasons, no staff notes. */
export const CUSTOMER_STATUS_COPY = {
  date_confirmed: 'Your event date has been confirmed. Our team will be in touch with next steps.',
  deposit_requested: 'Your event request has moved to the deposit stage. Please look out for further instructions from our team.',
  declined: "Unfortunately, we're unable to move forward with your event request at this time. Thank you for considering RocTicketNy.",
  cancelled: 'Your event request has been cancelled. If you believe this was done in error, please contact our team at hello@rocticketny.com.',
} as const
export type CustomerStatus = keyof typeof CUSTOMER_STATUS_COPY
export const isCustomerStatus = (v: unknown): v is CustomerStatus =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(CUSTOMER_STATUS_COPY, v)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Fixed labels derived from request_source and request_kind only. */
export function requestTypeLabel(source: string | null, kind: string | null): string {
  if (source === 'plan_my_event') return 'Plan My Event request'
  if (source === 'theme_package') {
    if (kind === 'reserve') return 'Package reservation request'
    if (kind === 'custom_quote') return 'Package custom quote request'
    return 'Package request'
  }
  return 'Request'
}

function layout(heading: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;background:#f4f4f4;">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;">
<div style="background:#121113;color:#59FFA0;padding:24px 30px;"><h1 style="margin:0;font-size:22px;">${escapeHtml(heading)}</h1></div>
<div style="padding:24px 30px;color:#121113;font-size:15px;line-height:1.5;">${bodyHtml}</div>
<div style="background:#f4f4f4;padding:16px;text-align:center;font-size:12px;color:#666;">RTNY</div>
</div></body></html>`
}

export function buildStaffNewRequestEmail(o: {
  requestId: string
  source: string | null
  kind: string | null
  appUrl: string
}): EmailContent {
  if (!UUID.test(o.requestId)) throw new Error('invalid_request_id')
  const label = requestTypeLabel(o.source, o.kind)
  const link = `${o.appUrl}/admin/requests/${o.requestId}`
  const subject = `New request: ${label}`
  return {
    subject,
    html: layout(
      subject,
      `<p>A new <strong>${escapeHtml(label)}</strong> was submitted.</p>
<p><a href="${escapeHtml(link)}" style="color:#1AC8ED;">Open the request</a></p>
<p style="color:#666;font-size:13px;">Sign in with a staff account to view the details. This email does not include customer information.</p>`
    ),
    text: `A new ${label} was submitted.\n\nOpen the request: ${link}\n\nSign in with a staff account to view the details. This email does not include customer information.`,
  }
}

/** appUrl must already be a parseBaseUrl result. Link-only: no reason, note or customer details. */
export function buildStaffAssignedEmail(o: { requestId: string; appUrl: string }): EmailContent {
  if (!UUID.test(o.requestId)) throw new Error('invalid_request_id')
  const link = `${o.appUrl}/admin/requests/${o.requestId}`
  const subject = 'A request was assigned to you'
  return {
    subject,
    html: layout(
      subject,
      `<p>A request has been assigned to you.</p>
<p><a href="${escapeHtml(link)}" style="color:#1AC8ED;">Open the request</a></p>
<p style="color:#666;font-size:13px;">Sign in with a staff account to view the details. This email does not include customer information.</p>`
    ),
    text: `A request has been assigned to you.\n\nOpen the request: ${link}\n\nSign in with a staff account to view the details. This email does not include customer information.`,
  }
}

/** Exact copy for the status, no links. */
export function buildCustomerStatusEmail(o: { status: CustomerStatus }): EmailContent {
  if (!isCustomerStatus(o.status)) throw new Error('invalid_status')
  const copy = CUSTOMER_STATUS_COPY[o.status]
  const subject = 'An update on your event request'
  return { subject, html: layout(subject, `<p>${escapeHtml(copy)}</p>`), text: copy }
}

export function buildCustomerConfirmationEmail(o: { source: string | null; kind: string | null }): EmailContent {
  const label = requestTypeLabel(o.source, o.kind)
  const subject = 'We received your request'
  return {
    subject,
    html: layout(
      subject,
      `<p>Thank you. We have received your request and our team will review it.</p>
<p>Request type: <strong>${escapeHtml(label)}</strong></p>`
    ),
    text: `Thank you. We have received your request and our team will review it.\n\nRequest type: ${label}`,
  }
}
