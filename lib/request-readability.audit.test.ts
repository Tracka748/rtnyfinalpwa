// Readability guard for the request inbox pages and the staff shell. See docs/READABILITY_CHECKLIST.md.
// It scans source text, so it needs no React test setup. It only covers these files, not the whole site.

import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const walk = (dir: string, out: string[] = []): string[] => {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    e.isDirectory() ? walk(p, out) : out.push(p)
  }
  return out
}
const rel = (p: string) => path.relative(ROOT, p).split(path.sep).join('/')

// ui.ts defines the shared classes, so it is the one place those literals may appear.
const FILES = [
  ...walk(path.join(ROOT, 'app/(staff)/admin/requests')),
  ...walk(path.join(ROOT, 'components/admin/requests')),
  ...walk(path.join(ROOT, 'components/staff')),
].filter(f => /\.tsx$/.test(f))

const read = (f: string) => fs.readFileSync(f, 'utf8')

describe('request pages and staff shell: readability rules', () => {
  it('scans the files it should', () => {
    expect(FILES.map(rel).sort()).toEqual([
      'app/(staff)/admin/requests/[id]/page.tsx',
      'app/(staff)/admin/requests/page.tsx',
      'components/admin/requests/ConfirmActionSheet.tsx',
      'components/admin/requests/RequestActionBar.tsx',
      'components/admin/requests/RequestNoteBox.tsx',
      'components/admin/requests/RequestTimeline.tsx',
      'components/staff/SignInRedirect.tsx',
      'components/staff/StaffShell.tsx',
    ])
  })

  it('has no text under 14px (no text-xs, and no pixel size under 14)', () => {
    for (const f of FILES) {
      const src = read(f)
      expect(src, `${rel(f)}: text-xs is 12px`).not.toMatch(/\btext-xs\b/)
      for (const m of src.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
        expect(Number(m[1]), `${rel(f)}: text-[${m[1]}px]`).toBeGreaterThanOrEqual(14)
      }
    }
  })

  it('never truncates text without a way to read it', () => {
    for (const f of FILES) expect(read(f), rel(f)).not.toMatch(/\btruncate\b|\btext-ellipsis\b|\bline-clamp-/)
  })

  it('takes border colors from the shared constants, not literal white/10, /15 or /20', () => {
    for (const f of FILES) expect(read(f), rel(f)).not.toMatch(/\bborder(?:-[lrtb])?-white\/(?:10|15|20)\b/)
  })

  it('does not use the low-contrast --input token as a control border', () => {
    for (const f of FILES) expect(read(f), rel(f)).not.toMatch(/\bborder-input\b/)
  })

  it('never renders raw HTML', () => {
    for (const f of FILES) expect(read(f), rel(f)).not.toMatch(/dangerouslySetInnerHTML/)
  })
})

describe('shared classes (components/admin/requests/ui.ts)', () => {
  const ui = read(path.join(ROOT, 'components/admin/requests/ui.ts'))
  it('control borders are at least white/35 (3:1) and cards stay decorative', () => {
    expect(ui).toMatch(/CONTROL_BORDER = 'border-white\/40'/)
    expect(ui).toMatch(/CARD_BORDER = 'border-white\/10'/)
  })
  it('defines a visible focus ring, a 44px tap target and body text of at least 16px', () => {
    expect(ui).toMatch(/FOCUS_RING =\s*'[^']*focus-visible:ring-2[^']*focus-visible:ring-\[#59FFA0\]/)
    expect(ui).toMatch(/TAP = 'min-h-\[44px\]'/)
    expect(ui).toMatch(/BODY = 'text-base leading-6'/)
    expect(ui).toMatch(/SECONDARY = 'text-sm leading-5'/)
  })
})

describe('AdminShell (shared) keeps its readability fixes', () => {
  const shell = read(path.join(ROOT, 'components/admin/AdminShell.tsx'))
  it('has 44px nav items and hamburger, a 12px pill, a wrapping email and no mobile h2', () => {
    expect((shell.match(/min-h-\[44px\]/g) ?? []).length).toBeGreaterThanOrEqual(5)
    expect(shell).not.toMatch(/text-\[10px\]/)
    expect(shell).not.toMatch(/truncate/)
    expect(shell).not.toMatch(/<h2\b/)
  })
})
