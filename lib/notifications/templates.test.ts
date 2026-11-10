import { describe, expect, it } from 'vitest'
import {
  buildCustomerConfirmationEmail,
  buildStaffNewRequestEmail,
  escapeHtml,
  normalizeAppUrl,
  requestTypeLabel,
} from '@/lib/notifications/templates'

const ID = '11111111-1111-1111-1111-111111111111'

describe('escapeHtml', () => {
  it('escapes & < > " and apostrophes', () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;')
  })
})

describe('normalizeAppUrl', () => {
  it('accepts http(s) urls and strips trailing slashes', () => {
    expect(normalizeAppUrl('https://app.example.com/')).toBe('https://app.example.com')
    expect(normalizeAppUrl(' http://localhost:3000// ')).toBe('http://localhost:3000')
  })
  it('rejects empty, schemeless and hostile values', () => {
    for (const bad of [undefined, null, '', 'app.example.com', 'javascript:alert(1)', 'https://x.com/"><img src=x>', 'https://x.com/a b', "https://x.com/'"]) {
      expect(normalizeAppUrl(bad as never)).toBeNull()
    }
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
