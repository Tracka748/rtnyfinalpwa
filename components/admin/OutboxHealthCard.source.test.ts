// vitest here is node-only with no JSX transform, so the card is checked by scanning its source.
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const card = read('components/admin/OutboxHealthCard.tsx')
// Each button's source, from "<button" up to its closing tag.
const buttons = card.split('<button').slice(1).map(s => s.slice(0, s.indexOf('</button>')))

describe('OutboxHealthCard: readability', () => {
  it('is a client component that uses the shared readability tokens', () => {
    expect(card.startsWith("'use client'")).toBe(true)
    expect(card).toContain("import { BODY, CARD_BORDER, CONTROL_BORDER, FOCUS_RING, SECONDARY, TAP } from '@/components/admin/requests/ui'")
    expect(card).toContain('${TAP} ${FOCUS_RING}')
  })

  it('has no text below 14px and every button carries the tap-target and focus-ring classes', () => {
    expect(card).not.toMatch(/\btext-xs\b|text-\[(?:[0-9]|1[0-3])px\]/)
    expect(buttons.length).toBeGreaterThanOrEqual(5)
    for (const b of buttons) expect(b).toMatch(/className=\{(?:BTN|PRIMARY)\}/)
  })

  it('announces results politely', () => {
    expect(card).toMatch(/role="status" aria-live="polite"/)
  })
})

describe('OutboxHealthCard: requeue needs a confirm step', () => {
  it('talks to exactly the two health endpoints', () => {
    expect([...card.matchAll(/fetch\('([^']+)'/g)].map(m => m[1])).toEqual([
      '/api/v1/admin/notifications/health',
      '/api/v1/admin/notifications/requeue',
    ])
  })

  it('only posts from requeue(), which is reachable only from the confirm dialog', () => {
    expect(card.match(/method: 'POST'/g)).toHaveLength(1)
    expect(card.indexOf("method: 'POST'")).toBeGreaterThan(card.indexOf('async function requeue()'))
    expect(card.match(/requeue\(\)/g)).toHaveLength(2) // the definition and the one call
    expect(card.indexOf('void requeue()')).toBeGreaterThan(card.indexOf('role="alertdialog"'))
    expect(card).toMatch(/if \(!confirm\) return/)
  })

  it('shows how many rows it will requeue', () => {
    expect(card).toContain('Requeue ${confirm.ids.length} failed email')
    expect(card).toContain('Math.min(confirm.count, 100)')
  })

  it('puts focus on Cancel (and only Cancel) when the confirm dialog opens', () => {
    const cancel = buttons.find(b => b.trimEnd().endsWith('>Cancel'))
    expect(cancel).toBeDefined()
    expect(cancel).toMatch(/\bautoFocus\b/)
    expect(buttons.filter(b => /\bautoFocus\b/.test(b))).toHaveLength(1)
    // The confirm button comes before Cancel in the DOM but must not hold the initial focus.
    const confirmBtn = buttons.find(b => b.includes('className={PRIMARY}'))
    expect(confirmBtn).toBeDefined()
    expect(confirmBtn).not.toMatch(/\bautoFocus\b/)
  })

  it('has a loading, an error and an empty state', () => {
    expect(card).toContain('Loading delivery health')
    expect(card).toContain('Delivery health is not available right now.')
    expect(card).toContain('No request emails in the last 7 days.')
  })
})

describe('admin dashboard', () => {
  it('renders the card (the page is behind the admin-only layout)', () => {
    const page = read('app/admin/page.tsx')
    expect(page).toContain("import { OutboxHealthCard } from '@/components/admin/OutboxHealthCard'")
    expect(page).toContain('<OutboxHealthCard />')
  })
})
