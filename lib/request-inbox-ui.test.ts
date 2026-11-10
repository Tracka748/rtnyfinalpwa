import { describe, expect, it } from 'vitest'
import { INBOX_STATUSES } from './request-inbox-api'
import {
  badgeText, buildApiQuery, buildInboxQuery, contactCard, hasNextPage, itemPriceText,
  listState, parseInboxParams, statusLabel,
} from './request-inbox-ui'

const parse = (s: string) => parseInboxParams(new URLSearchParams(s))

describe('statusLabel', () => {
  it('shows pending as New', () => {
    expect(statusLabel('pending')).toBe('New')
  })
  it('labels every lifecycle status and falls back for unknown values', () => {
    expect(INBOX_STATUSES.map(statusLabel)).toEqual([
      'New', 'In progress', 'Date confirmed', 'Deposit requested',
      'Deposit received', 'Completed', 'Declined', 'Cancelled',
    ])
    expect(statusLabel('in_review')).toBe('Unknown')
    expect(statusLabel(null)).toBe('Unknown')
  })
})

describe('parseInboxParams', () => {
  it('defaults', () => {
    expect(parse('')).toEqual({ scope: 'all', status: null, page: 1 })
  })
  it('reads valid values', () => {
    expect(parse('scope=mine&status=pending&page=3')).toEqual({ scope: 'mine', status: 'pending', page: 3 })
    expect(parse('scope=unassigned&status=deposit_received')).toEqual({ scope: 'unassigned', status: 'deposit_received', page: 1 })
  })
  it('falls back for invalid values', () => {
    expect(parse('scope=everyone&status=booked')).toEqual({ scope: 'all', status: null, page: 1 })
    for (const page of ['0', '-1', 'abc', '1.5', '4002', '']) expect(parse(`page=${page}`).page).toBe(1)
    expect(parse('page=4001').page).toBe(4001)
  })
})

describe('buildInboxQuery / buildApiQuery', () => {
  it('omits defaults', () => {
    expect(buildInboxQuery({ scope: 'all', status: null, page: 1 })).toBe('')
    expect(buildInboxQuery({ scope: 'mine', status: null, page: 1 })).toBe('?scope=mine')
    expect(buildInboxQuery({ scope: 'all', status: 'pending', page: 2 })).toBe('?status=pending&page=2')
  })
  it('round-trips through parse', () => {
    const v = { scope: 'unassigned' as const, status: 'completed' as const, page: 7 }
    expect(parse(buildInboxQuery(v).slice(1))).toEqual(v)
  })
  it('builds the API query with limit 25 and a page offset', () => {
    expect(buildApiQuery({ scope: 'all', status: null, page: 1 })).toBe('scope=all&limit=25&offset=0')
    expect(buildApiQuery({ scope: 'mine', status: 'pending', page: 3 })).toBe('scope=mine&status=pending&limit=25&offset=50')
  })
})

describe('listState / hasNextPage', () => {
  it('distinguishes rows, empty and past the end', () => {
    expect(listState(5, 1)).toBe('rows')
    expect(listState(5, 4)).toBe('rows')
    expect(listState(0, 1)).toBe('empty')
    expect(listState(0, 2)).toBe('past_end')
  })
  it('has a next page only while more rows remain', () => {
    expect(hasNextPage(1, 25)).toBe(false)
    expect(hasNextPage(1, 26)).toBe(true)
    expect(hasNextPage(2, 50)).toBe(false)
    expect(hasNextPage(1, 0)).toBe(false)
  })
})

describe('badgeText', () => {
  it('shows nothing for no, zero or bad counts', () => {
    for (const v of [null, undefined, 0, -3, NaN, Infinity]) expect(badgeText(v as number | null)).toBeNull()
  })
  it('shows the number up to 9 and 9+ above', () => {
    expect(badgeText(1)).toBe('1')
    expect(badgeText(9)).toBe('9')
    expect(badgeText(10)).toBe('9+')
    expect(badgeText(250)).toBe('9+')
  })
})

describe('contactCard', () => {
  it('is redacted when the server sent no contact', () => {
    for (const v of [null, undefined, 'x', 5, []]) expect(contactCard(v)).toEqual({ state: 'redacted' })
  })
  it('renders every present field for a verified contact, with no email note', () => {
    expect(contactCard({ name: 'Pat Lee', phone: '555-0100', email: 'p@x.com', email_verified: true, guest: false, notes: 'Line 1\nLine 2' })).toEqual({
      state: 'visible',
      rows: [
        { label: 'Name', value: 'Pat Lee' },
        { label: 'Phone', value: '555-0100' },
        { label: 'Email', value: 'p@x.com' },
        { label: 'Notes', value: 'Line 1\nLine 2' },
      ],
    })
  })
  it('marks guest and unverified emails', () => {
    const email = (c: object) => (contactCard(c) as { rows: Array<{ label: string; note?: string }> }).rows.find(r => r.label === 'Email')
    expect(email({ email: 'a@x.com', email_verified: false, guest: true })?.note).toBe('Guest, not verified')
    expect(email({ email: 'a@x.com', email_verified: false, guest: false })?.note).toBe('Not verified')
  })
  it('omits missing and blank fields, and keeps markup as plain text', () => {
    expect(contactCard({ name: '  ', phone: null, email: null, notes: '<b>hi</b>' })).toEqual({
      state: 'visible', rows: [{ label: 'Notes', value: '<b>hi</b>' }],
    })
    expect(contactCard({})).toEqual({ state: 'visible', rows: [] })
  })
})

// Real values from theme_package_build_snapshot (migration 20261104100008):
// price_status 'priced' | 'free' | 'quote'; price_treatment 'listed' | 'free' | 'quote'.
describe('itemPriceText', () => {
  it('priced (treatment listed) shows the line total', () => {
    expect(itemPriceText({ price_status: 'priced', line_total: 80 })).toBe('$80')
    expect(itemPriceText({ price_status: 'priced', line_total: 12.5 })).toBe('$12.50')
  })
  it('free (treatment free) shows Included', () => {
    expect(itemPriceText({ price_status: 'free', line_total: 0 })).toBe('Included')
  })
  it('quote (treatment quote) shows Price on request', () => {
    expect(itemPriceText({ price_status: 'quote', line_total: null })).toBe('Price on request')
  })
  it('status decides: a listed-treatment line without a total stays Price on request', () => {
    expect(itemPriceText({ price_status: 'quote', line_total: null, ...{ price_treatment: 'listed' } })).toBe('Price on request')
  })
  it('a priced line without a numeric total shows Price on request', () => {
    expect(itemPriceText({ price_status: 'priced', line_total: null })).toBe('Price on request')
    expect(itemPriceText({ price_status: 'priced', line_total: '80' })).toBe('Price on request')
  })
  it('an unknown, missing or null status falls back to Price on request', () => {
    expect(itemPriceText({ price_status: 'weird', line_total: 80 })).toBe('Price on request')
    expect(itemPriceText({ price_status: null })).toBe('Price on request')
    expect(itemPriceText({})).toBe('Price on request')
  })
})
