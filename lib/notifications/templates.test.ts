import { describe, expect, it } from 'vitest'
import {
  CUSTOMER_STATUS_COPY,
  buildCustomerConfirmationEmail,
  buildCustomerStatusEmail,
  buildStaffAssignedEmail,
  buildStaffNewRequestEmail,
  escapeHtml,
  isCustomerStatus,
  parseBaseUrl,
  requestTypeLabel,
} from '@/lib/notifications/templates'

const ID = '11111111-1111-1111-1111-111111111111'

describe('escapeHtml', () => {
  it('escapes & < > " and apostrophes', () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;')
  })
})

describe('parseBaseUrl', () => {
  it('accepts an https origin and normalizes away the trailing slash', () => {
    expect(parseBaseUrl('https://app.example.com')).toBe('https://app.example.com')
    expect(parseBaseUrl('https://app.example.com/')).toBe('https://app.example.com')
    expect(parseBaseUrl('  https://app.example.com/  ')).toBe('https://app.example.com')
    expect(parseBaseUrl('https://app.example.com:8443')).toBe('https://app.example.com:8443')
    expect(parseBaseUrl('HTTPS://APP.EXAMPLE.COM')).toBe('https://app.example.com')
  })

  it.each([
    ['http scheme', 'http://app.example.com'],
    ['localhost over http', 'http://localhost:3000'],
    ['a path', 'https://app.example.com/admin'],
    ['a query', 'https://app.example.com?test=1'],
    ['an empty query', 'https://app.example.com/?'],
    ['credentials', 'https://user:pass@app.example.com'],
    ['a username only', 'https://user@app.example.com'],
    ['a fragment', 'https://app.example.com/#section'],
    ['an empty fragment', 'https://app.example.com/#'],
    ['a doubled slash path', 'https://app.example.com//'],
    ['javascript:', 'javascript:alert(1)'],
    ['a schemeless host', 'app.example.com'],
    ['a hostile value', 'https://app.example.com/"><img src=x>'],
    ['an embedded space', 'https://app example.com'],
    ['empty', ''],
    ['whitespace only', '   '],
  ])('rejects %s', (_name, value) => {
    expect(parseBaseUrl(value)).toBeNull()
  })

  it('rejects null and undefined', () => {
    expect(parseBaseUrl(null)).toBeNull()
    expect(parseBaseUrl(undefined)).toBeNull()
  })
})

describe('buildStaffAssignedEmail', () => {
  const email = buildStaffAssignedEmail({ requestId: ID, appUrl: 'https://app.example.com' })

  it('has the fixed subject and a link built from the given origin', () => {
    expect(email.subject).toBe('A request was assigned to you')
    expect(email.text).toContain(`https://app.example.com/admin/requests/${ID}`)
    expect(email.html).toContain(`href="https://app.example.com/admin/requests/${ID}"`)
  })

  it('is link-only: no reason, note, customer or type text', () => {
    const body = `${email.subject}${email.html}${email.text}`
    expect(body).not.toMatch(/reason|note:|@|Package|Plan My Event/i)
  })

  it('rejects a request id that is not a uuid', () => {
    expect(() => buildStaffAssignedEmail({ requestId: 'x"><script>', appUrl: 'https://app.example.com' })).toThrow()
  })
})

describe('buildCustomerStatusEmail', () => {
  const EXPECTED = {
    date_confirmed: 'Your event date has been confirmed. Our team will be in touch with next steps.',
    deposit_requested: 'Your event request has moved to the deposit stage. Please look out for further instructions from our team.',
    declined: "Unfortunately, we're unable to move forward with your event request at this time. Thank you for considering RocTicketNy.",
    cancelled: 'Your event request has been cancelled. If you believe this was done in error, please contact our team at hello@rocticketny.com.',
  } as const

  it('has exactly the four customer statuses', () => {
    expect(Object.keys(CUSTOMER_STATUS_COPY).sort()).toEqual(Object.keys(EXPECTED).sort())
    expect(isCustomerStatus('pending')).toBe(false)
    expect(isCustomerStatus('in_progress')).toBe(false)
    expect(isCustomerStatus('constructor')).toBe(false)
  })

  it.each(Object.entries(EXPECTED))('%s uses the exact copy in the text and HTML parts, with no link', (status, copy) => {
    const email = buildCustomerStatusEmail({ status: status as keyof typeof EXPECTED })
    expect(email.subject).toBe('An update on your event request')
    expect(email.text).toBe(copy)
    expect(email.html).toContain(escapeHtml(copy))
    expect(email.html).not.toMatch(/href|https?:\/\//i)
    expect(email.text).not.toMatch(/https?:\/\//i)
  })

  it('makes no response-time promise and rejects an unknown status', () => {
    for (const copy of Object.values(EXPECTED)) expect(copy).not.toMatch(/\b(within|hours?|days?|24|48)\b/i)
    expect(() => buildCustomerStatusEmail({ status: 'pending' as never })).toThrow()
  })
})

describe('requestTypeLabel', () => {
  it('derives fixed labels from source and kind only', () => {
    expect(requestTypeLabel('plan_my_event', null)).toBe('Plan My Event request')
    expect(requestTypeLabel('theme_package', 'reserve')).toBe('Package reservation request')
    expect(requestTypeLabel('theme_package', 'custom_quote')).toBe('Package custom quote request')
    expect(requestTypeLabel('theme_package', null)).toBe('Package request')
    expect(requestTypeLabel('<b>x</b>', 'whatever')).toBe('Request')
  })
})

describe('buildStaffNewRequestEmail', () => {
  const mail = buildStaffNewRequestEmail({ requestId: ID, source: 'theme_package', kind: 'reserve', appUrl: 'https://app.example.com' })

  it('has a fixed subject and a link to the admin request page', () => {
    expect(mail.subject).toBe('New request: Package reservation request')
    expect(mail.html).toContain(`href="https://app.example.com/admin/requests/${ID}"`)
    expect(mail.text).toContain(`https://app.example.com/admin/requests/${ID}`)
  })

  it('says it carries no customer information and contains none', () => {
    expect(mail.html).toContain('does not include customer information')
    expect(mail.html + mail.text).not.toMatch(/@|notes|phone/i)
  })

  it('rejects a non-uuid request id', () => {
    expect(() => buildStaffNewRequestEmail({ requestId: '"><script>', source: null, kind: null, appUrl: 'https://a.com' })).toThrow()
  })

  it('escapes the link it embeds', () => {
    const m = buildStaffNewRequestEmail({ requestId: ID, source: null, kind: null, appUrl: 'https://a.com/?a=1&b=2' })
    expect(m.html).toContain('a=1&amp;b=2')
    expect(m.html).not.toContain('a=1&b=2')
  })
})

describe('buildCustomerConfirmationEmail', () => {
  const mail = buildCustomerConfirmationEmail({ source: 'plan_my_event', kind: null })
  it('confirms receipt with no link, no time promise and no contact details', () => {
    expect(mail.subject).toBe('We received your request')
    expect(mail.html).toContain('Plan My Event request')
    expect(mail.html + mail.text).not.toMatch(/https?:|@|within|hours|days|minutes/i)
  })
})
