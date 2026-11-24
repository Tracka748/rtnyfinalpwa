// vitest here is node-only with no JSX transform, so the dialog, the cell and the page wiring are checked by scanning source.
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const dialog = read('components/admin/AliasEditDialog.tsx')
const cell = read('components/admin/AliasCell.tsx')
const page = read('app/admin/users/page.tsx')

// The trimmed argument text of every `setError(...)` call, with balanced parentheses.
function setErrorArgs(src: string): string[] {
  const out: string[] = []
  for (const m of src.matchAll(/\bsetError\(/g)) {
    let depth = 1
    let i = (m.index as number) + m[0].length
    const start = i
    while (i < src.length && depth > 0) {
      if (src[i] === '(') depth++
      else if (src[i] === ')') depth--
      i++
    }
    out.push(src.slice(start, i - 1).trim())
  }
  return out
}

describe('AliasEditDialog', () => {
  it('is a labelled modal dialog with the user name in the label', () => {
    expect(dialog.startsWith("'use client'")).toBe(true)
    expect(dialog).toContain('role="dialog"')
    expect(dialog).toContain('aria-modal="true"')
    expect(dialog).toContain('aria-labelledby={titleId}')
    expect(dialog).toContain('Alias for {userName}')
  })

  it('has a visual @ prefix, an autoFocus input, and Enter / Escape handling', () => {
    expect(dialog).toMatch(/aria-hidden="true"[^>]*>@<\/span>/)
    expect(dialog.match(/\bautoFocus\b/g)).toHaveLength(1)
    expect(dialog).toContain("e.key === 'Enter'")
    expect(dialog).toContain("e.key === 'Escape'")
  })

  it('validates on the client before any request, and sends { alias } only', () => {
    expect(dialog).toContain("import { validateAlias } from '@/lib/alias-validation'")
    expect(dialog.indexOf('validateAlias(value)')).toBeLessThan(dialog.indexOf('await fetch('))
    expect(dialog.match(/fetch\(/g)).toHaveLength(1)
    expect(dialog).toContain("method: 'PUT'")
    expect(dialog).toContain('JSON.stringify({ alias: v.alias })')
    expect(dialog).toContain('`/api/v1/admin/users/${userId}/alias`')
  })

  it('shows Saving… and disables the buttons while saving', () => {
    expect(dialog).toContain("'Saving…'")
    expect(dialog.match(/disabled=\{saving\}/g)).toHaveLength(2)
    expect(dialog).toContain('if (saving) return')
  })

  it('only ever shows its own fixed texts or aliasSaveError, never raw error text', () => {
    expect(dialog).toContain('aliasSaveError(')
    expect(dialog).toContain('NETWORK_ERROR')
    expect(dialog).not.toMatch(/setError\([^)]*\.message/)
    expect(dialog).not.toMatch(/toast\.error/)
    // Allowlist of every setError( argument. v.error is allowed because v is the result of the client-side
    // validateAlias, so it is one of that function's own fixed messages, never server text.
    const args = setErrorArgs(dialog)
    expect(args.length).toBeGreaterThanOrEqual(4)
    for (const a of args) expect(a).toMatch(/^(?:null|v\.error|aliasSaveError\([\s\S]*\)|NETWORK_ERROR)$/)
  })

  it('on success calls onSaved, closes and shows the toast', () => {
    expect(dialog).toContain('onSaved(userId, saved)')
    expect(dialog).toContain("toast.success('Alias saved')")
    expect(dialog.indexOf('onSaved(userId, saved)')).toBeLessThan(dialog.indexOf("toast.success('Alias saved')"))
  })

  it('uses the shared readability tokens: 44px taps, focus ring, no text under 14px', () => {
    expect(dialog).toContain("from '@/components/admin/requests/ui'")
    expect(dialog).toMatch(/\$\{TAP\}/)
    expect(dialog).toMatch(/\$\{FOCUS_RING\}/)
    expect(dialog).toContain('touch-manipulation')
    expect(dialog).not.toMatch(/\btext-xs\b|text-\[(?:[0-9]|1[0-3])px\]/)
  })
})

describe('AliasCell', () => {
  it('uses the shared tokens and has no text under 14px', () => {
    expect(cell).toContain("from '@/components/admin/requests/ui'")
    expect(cell).toMatch(/\$\{TAP\}/)
    expect(cell).toMatch(/\$\{FOCUS_RING\}/)
    expect(cell).toContain('touch-manipulation')
    expect(cell).not.toMatch(/\btext-xs\b|text-\[(?:[0-9]|1[0-3])px\]/)
  })

  it('shows the amber No alias badge and gates the button on canEditAlias', () => {
    expect(cell).toContain('bg-amber-500/15 text-amber-400')
    expect(cell).toContain('No alias')
    expect(cell).toContain('canEditAlias(fields)')
    expect(cell).toContain('aria-label={`${alias ? \'Edit\' : \'Add\'} alias for ${name}`}')
  })
})

describe('admin users page wiring', () => {
  it('renders the dialog once, at page level', () => {
    expect(page.match(/<AliasEditDialog/g)).toHaveLength(1)
    expect(page).toContain("import { AliasEditDialog } from '@/components/admin/AliasEditDialog'")
  })

  it('shows the alias under the name on phones and in an Alias column on desktop, in all four tables', () => {
    expect(page.match(/<table /g)).toHaveLength(4)
    expect(page.match(/<AliasCell\b[^>]*\bcompact\b/g)).toHaveLength(4)
    expect(page.match(/<th className=\{`\$\{th\} hidden md:table-cell`\}>Alias<\/th>/g)).toHaveLength(4)
    expect(page.match(/<td className=\{`\$\{td\} hidden md:table-cell`\}>/g)).toHaveLength(4)
    expect(page.match(/<div className="md:hidden">/g)).toHaveLength(4)
  })

  it('refreshes one row after a role change with GET .../alias, silently on failure', () => {
    expect(page).toContain('async function refreshAlias(userId: string)')
    expect(page).toContain('`/api/v1/admin/users/${userId}/alias`')
    expect(page).toContain('parseAliasRefresh(')
    const fn = page.slice(page.indexOf('async function refreshAlias'), page.indexOf('async function handleRevokeRole'))
    expect(fn).not.toContain('toast')
    expect(page).toMatch(/toast\.success\('Role updated'\);\s*void refreshAlias\(userId\);/)
  })

  it('leaves the existing behaviour in place', () => {
    expect(page).toContain("toast.success('Role updated')")
    expect(page).toContain("toast.success('Role revoked')")
    expect(page).toContain('Confirm Action')
    expect(page).toContain('setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: prevRole } : u)))')
  })
})
