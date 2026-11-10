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

/** http(s) URL without whitespace or quote/angle characters, trailing slashes removed; else null. */
export function normalizeAppUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim().replace(/\/+$/, '')
  return /^https?:\/\/[^\s"'<>\\]+$/i.test(v) ? v : null
}

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
