// BEFORE/AFTER audit of every admin page and admin API route guard.
//
// lib/test-support/admin-guards-before.json is the snapshot taken before the request inbox moved behind the
// staff layout. This test recomputes the table from the source files and requires it to equal the snapshot,
// except for the two intended request pages. A change to any other admin page or route guard fails here.
// To change a guard on purpose, update the fixture in the same commit and explain why.

import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import before from '@/lib/test-support/admin-guards-before.json'

const ROOT = process.cwd()
const posix = (p: string) => p.split(path.sep).join('/')

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}
const read = (p: string) => fs.readFileSync(p, 'utf8')

// Keep in sync with the generator that wrote the fixture: the same tokens, the same order.
function classifyRoute(src: string): { methods: string[]; guard: string } {
  const methods = [...src.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map(m => m[1])
  const tokens: string[] = []
  if (/\brequireAdmin\(/.test(src)) tokens.push('requireAdmin')
  if (/\brequireAdminActor\(/.test(src)) tokens.push('requireAdminActor')
  if (/\brequireCapability\(/.test(src)) {
    const caps = [...new Set([...src.matchAll(/CAPABILITIES\.([A-Z_]+)/g)].map(m => m[1]))].sort()
    tokens.push('requireCapability:' + caps.join(','))
  }
  if (/\brequireUser\(/.test(src)) tokens.push('requireUser')
  if (/\bcheckIsAdmin\(/.test(src)) tokens.push('checkIsAdmin')
  if (/\bcheckAdminAccess\(/.test(src)) tokens.push('checkAdminAccess')
  if (/\.role\s*!==\s*'admin'|\.role\s*===\s*'admin'/.test(src)) tokens.push('inlineRole')
  return { methods, guard: tokens.join('+') || 'NONE' }
}

function currentRoutes() {
  const dir = path.join(ROOT, 'app/api/v1/admin')
  const out: Record<string, { methods: string[]; guard: string }> = {}
  for (const f of walk(dir).filter(f => /route\.ts$/.test(f))) {
    const key = posix(path.relative(dir, f)).replace(/\/?route\.ts$/, '') || '(root)'
    out[key] = classifyRoute(read(f))
  }
  return out
}

const urlOf = (file: string) =>
  '/' + posix(path.relative(path.join(ROOT, 'app'), file))
    .replace(/\/?page\.tsx$/, '')
    .split('/')
    .filter(seg => seg !== '' && !/^\(.*\)$/.test(seg)) // route groups are not part of the URL
    .join('/')

/** The guard of the nearest layout above the page that carries one. */
function layoutGuard(file: string): string {
  const appDir = path.join(ROOT, 'app')
  for (let dir = path.dirname(file); dir.startsWith(appDir); dir = path.dirname(dir)) {
    const layout = path.join(dir, 'layout.tsx')
    if (fs.existsSync(layout)) {
      const src = read(layout)
      if (/\bcheckAdminAccess\(/.test(src)) return 'admin-layout'
      if (/\bgetStaffAccess\(/.test(src)) return 'staff-layout'
    }
  }
  return 'NONE'
}

const allPages = () => walk(path.join(ROOT, 'app')).filter(f => /[\\/]page\.tsx$/.test(f))
const adminPages = () => allPages().filter(f => urlOf(f).startsWith('/admin'))

function currentPages() {
  const out: Record<string, string> = {}
  for (const f of adminPages()) out[urlOf(f)] = layoutGuard(f)
  return out
}

const INTENDED = ['/admin/requests', '/admin/requests/[id]']

describe('admin API routes keep their guards', () => {
  it('the route table equals the BEFORE snapshot (every guard and method set unchanged)', () => {
    expect(currentRoutes()).toEqual(before.routes)
  })

  it('has no unguarded admin route', () => {
    for (const [key, r] of Object.entries(currentRoutes())) expect(r.guard, key).not.toBe('NONE')
  })

  it('the request inbox routes use the expected capabilities', () => {
    const r = currentRoutes()
    for (const k of ['requests', 'requests/[id]', 'requests/[id]/read', 'requests/unread-count']) {
      expect(r[k].guard, k).toBe('requireCapability:EVENTS_REQUESTS_VIEW')
    }
    for (const k of ['requests/[id]/claim', 'requests/[id]/release', 'requests/[id]/status', 'requests/[id]/notes']) {
      expect(r[k].guard, k).toBe('requireCapability:EVENTS_REQUESTS_MANAGE')
    }
    for (const k of ['requests/[id]/reassign', 'requests/assignable-owners']) {
      expect(r[k].guard, k).toBe('requireAdminActor+requireCapability:EVENTS_REQUESTS_MANAGE')
    }
  })
})

describe('admin pages: AFTER equals BEFORE except the two request pages', () => {
  it('has the same set of pages (none added, none lost)', () => {
    expect(Object.keys(currentPages()).sort()).toEqual(Object.keys(before.pages).sort())
  })

  it('every page keeps its guard, and only the two request pages moved to the staff layout', () => {
    const expected = { ...before.pages } as Record<string, string>
    for (const url of INTENDED) {
      expect(expected[url], url).toBe('admin-layout') // they were admin-only before
      expected[url] = 'staff-layout'
    }
    expect(currentPages()).toEqual(expected)
  })

  it('the only pages that are not behind the admin layout are the two request pages', () => {
    const notAdmin = Object.entries(currentPages()).filter(([, g]) => g !== 'admin-layout').map(([u]) => u).sort()
    expect(notAdmin).toEqual([...INTENDED].sort())
  })

  it('no /admin page exists outside app/admin and app/(staff)/admin, and no two pages share a URL', () => {
    const urls = adminPages().map(urlOf)
    expect(new Set(urls).size).toBe(urls.length)
    for (const f of adminPages()) {
      const rel = posix(path.relative(path.join(ROOT, 'app'), f))
      expect(rel.startsWith('admin/') || rel.startsWith('(staff)/admin/'), rel).toBe(true)
    }
  })
})

describe('layout invariants', () => {
  it('app/admin/layout.tsx is still the admin-only guard', () => {
    const src = read(path.join(ROOT, 'app/admin/layout.tsx'))
    expect(src).toMatch(/checkAdminAccess\(\)/)
    expect(src).toMatch(/if \(!isAdmin\)\s*\{\s*redirect\('\/'\)/)
  })

  it('the staff layout checks access, redirects a denied user to /dashboard and sends the signed-out to sign-in', () => {
    const src = read(path.join(ROOT, 'app/(staff)/admin/layout.tsx'))
    expect(src).toMatch(/getStaffAccess\(\)/)
    expect(src).toMatch(/access\.state === 'denied'\)\s*redirect\('\/dashboard'\)/)
    expect(src).toMatch(/access\.state === 'signed_out'\)\s*return <SignInRedirect \/>/)
  })

  it('app/(staff) holds only its layout and the request pages, nothing else', () => {
    const files = walk(path.join(ROOT, 'app/(staff)')).map(f => posix(path.relative(path.join(ROOT, 'app/(staff)'), f))).sort()
    expect(files).toEqual(['admin/layout.tsx', 'admin/requests/[id]/page.tsx', 'admin/requests/page.tsx'])
  })

  it('the request pages are no longer under app/admin', () => {
    expect(fs.existsSync(path.join(ROOT, 'app/admin/requests'))).toBe(false)
  })
})
