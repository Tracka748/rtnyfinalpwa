// vitest here is node-only with no JSX transform, so the form and the list page are checked by scanning source.
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const form = read('components/admin/NewPackageForm.tsx')
const page = read('app/admin/packages/page.tsx')
const shell = read('components/admin/AdminShell.tsx')

const fetched = (src: string) => [...src.matchAll(/fetch\(\s*([`'][^,)]*[`'])/g)].map(m => m[1])

describe('NewPackageForm', () => {
  it('warns that the key is permanent and shows the page address', () => {
    expect(form).toContain('KEY_WARNING')
    expect(form).toContain('Page address: /packages/')
    expect(read('lib/admin-package-ui.ts')).toContain('can never be reused')
  })

  it('validates with the server validator before posting, and posts only to the create route', () => {
    expect(form).toContain("import { validateCreatePackage } from '@/lib/package-validation'")
    expect(form.indexOf('validateCreatePackage(body)')).toBeLessThan(form.indexOf("await fetch('/api/v1/admin/packages'"))
    expect(fetched(form)).toEqual(["'/api/v1/themes'", "'/api/v1/admin/packages'"])
    expect(form.match(/method: 'POST'/g)).toHaveLength(1)
  })

  it('shows only fixed text or createPackageError, never raw error text', () => {
    expect(form).toContain('createPackageError(')
    expect(form).not.toMatch(/setError\([^)]*\.message/)
    expect(form).not.toMatch(/setError\(\s*(json|body|data)\b/)
  })

  it('uses the shared tokens, 16px fields, and no text under 14px', () => {
    expect(form).toContain("from '@/components/admin/requests/ui'")
    expect(form).toMatch(/\$\{TAP\}/)
    expect(form).toMatch(/\$\{FOCUS_RING\}/)
    expect(form).toContain('touch-manipulation')
    expect(form).not.toMatch(/\btext-xs\b|text-\[(?:[0-9]|1[0-3])px\]/)
  })
})

describe('admin packages page', () => {
  it('reads the list and starts drafts only through the existing routes', () => {
    expect(fetched(page)).toEqual(['`/api/v1/admin/packages?${qs}`', '`/api/v1/admin/packages/${p.id}/versions`'])
    expect(page.match(/method: 'POST'/g)).toHaveLength(1)
    expect(page).not.toMatch(/method: '(PUT|PATCH|DELETE)'/)
  })

  it('explains that a new draft does not change the live page, and offers the archived filter', () => {
    expect(page).toContain('EDIT_EXPLAINER')
    expect(read('lib/admin-package-ui.ts')).toContain('does not change the live page')
    expect(read('lib/admin-package-ui.ts')).toContain('keep the snapshot they were made with')
    expect(page).toContain('Show archived packages')
  })

  it('has loading, error, empty states and a start-draft button gated by canStartDraft', () => {
    expect(page).toContain('Loading packages')
    expect(page).toContain('Something went wrong loading packages.')
    expect(page).toContain('No packages yet.')
    expect(page).toContain('canStartDraft(p)')
  })

  it('uses the shared tokens, no text under 14px, and wraps long text instead of scrolling sideways', () => {
    expect(page).toMatch(/\$\{TAP\}/)
    expect(page).toMatch(/\$\{FOCUS_RING\}/)
    expect(page).not.toMatch(/\btext-xs\b|text-\[(?:[0-9]|1[0-3])px\]/)
    expect(page).not.toMatch(/<table\b|overflow-x-auto|whitespace-nowrap/)
    expect(page).toContain('break-all') // the key
  })

  it('does not use toasts (no Toaster is mounted)', () => {
    expect(page).not.toContain('sonner')
    expect(form).not.toContain('sonner')
  })
})

describe('sidebar', () => {
  it('links to /admin/packages and titles the page', () => {
    expect(shell).toContain("{ href: '/admin/packages', icon: '🎁', label: 'Packages' }")
    expect(shell).toContain("'/admin/packages': 'Packages'")
  })
})
