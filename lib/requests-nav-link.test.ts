// The Requests link's decisions are pure functions in lib/staff-nav.ts; the component only draws them.
// (This repo's tests run in node with no JSX transform, so the component is checked by scanning its source.)
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  REQUESTS_NAV_VARIANTS, isRequestsPath, requestsBadge, requestsLinkClassName, requestsLinkShowsIcon,
  shouldRenderRequestsLink,
} from '@/lib/staff-nav'

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

describe('the link never renders unless the answer is exactly true', () => {
  it('false, missing or malformed answers draw nothing', () => {
    for (const v of [false, null, undefined, 'true', 1, 0, {}, [], NaN]) {
      expect(shouldRenderRequestsLink(v), JSON.stringify(v)).toBe(false)
    }
    expect(shouldRenderRequestsLink(true)).toBe(true)
  })

  it('the gate component checks it first, and the menus never mount the link directly', () => {
    const comp = read('components/staff/RequestsNavLink.tsx')
    const gate = comp.slice(comp.indexOf('export function StaffRequestsLink'))
    expect(gate).toMatch(/if \(!shouldRenderRequestsLink\(canView\)\) return null\s*\n\s*return <RequestsNavLink/)
    for (const file of ['components/custom/layout/app-nav.tsx', 'components/custom/layout/sidebar.tsx']) {
      expect(read(file), file).not.toMatch(/<RequestsNavLink/)
    }
  })

  it('the unread hook is called only inside the link, so customers make no extra calls', () => {
    const comp = read('components/staff/RequestsNavLink.tsx')
    const gateStart = comp.indexOf('export function StaffRequestsLink')
    expect(comp.slice(0, gateStart)).toContain('useInboxUnread()')
    expect(comp.slice(gateStart)).not.toContain('useInboxUnread')
    for (const file of ['components/custom/layout/app-nav.tsx', 'components/custom/layout/sidebar.tsx']) {
      expect(read(file), file).not.toMatch(/useInboxUnread/)
    }
  })
})

describe('markup rules, every variant including the desktop top bar', () => {
  it('16px text, a 44px tap target and a visible focus ring', () => {
    for (const v of REQUESTS_NAV_VARIANTS) {
      for (const active of [true, false]) {
        const cls = requestsLinkClassName(v, active)
        expect(cls, v).toContain('min-h-[44px]')
        expect(cls, v).toContain('text-base')
        expect(cls, v).toContain('leading-6')
        expect(cls, v).toContain('focus-visible:ring-2')
        expect(cls, v).not.toMatch(/\btext-xs\b|\btext-sm\b|truncate/)
      }
    }
  })

  it('active on the inbox pages only', () => {
    expect(requestsLinkClassName('topbar', true)).toContain('text-[#59FFA0]')
    expect(requestsLinkClassName('topbar', false)).toContain('text-[#F9FDFF]')
    expect(isRequestsPath('/admin/requests')).toBe(true)
    expect(isRequestsPath('/admin/requests/abc')).toBe(true)
    for (const p of ['/events', '/admin', '/admin/users', '', null, undefined]) expect(isRequestsPath(p as string)).toBe(false)
  })

  it('the top bar has no icon; the sidebar and mobile menu keep it', () => {
    expect(requestsLinkShowsIcon('topbar')).toBe(false)
    expect(requestsLinkShowsIcon('sidebar')).toBe(true)
    expect(requestsLinkShowsIcon('menu')).toBe(true)
  })

  it('the badge is "N new", "9+ new" above nine, with a text label and 14px text', () => {
    for (const v of REQUESTS_NAV_VARIANTS) {
      expect(requestsBadge(3, v)?.text).toBe('3 new')
      expect(requestsBadge(9, v)?.text).toBe('9 new')
      expect(requestsBadge(12, v)?.text).toBe('9+ new')
      expect(requestsBadge(3, v)?.ariaLabel).toBe('3 unread requests')
      expect(requestsBadge(3, v)?.className).toContain('text-sm')
      expect(requestsBadge(3, v)?.className).not.toContain('text-xs')
    }
    expect(requestsBadge(3, 'topbar')?.className.startsWith('ml-auto')).toBe(false)
    expect(requestsBadge(3, 'sidebar')?.className.startsWith('ml-auto')).toBe(true)
  })

  it('no badge for zero, negative, null or junk', () => {
    for (const c of [0, -2, null, undefined, NaN, Infinity]) expect(requestsBadge(c as number, 'menu'), String(c)).toBeNull()
  })
})

describe('how the menus use it', () => {
  const nav = read('components/custom/layout/app-nav.tsx')
  const side = read('components/custom/layout/sidebar.tsx')

  it('app-nav draws the desktop and the mobile link through the gate, from one shared answer', () => {
    expect(nav).toMatch(/<StaffRequestsLink canView=\{showRequests\} variant="topbar" \/>/)
    expect(nav).toMatch(/<StaffRequestsLink canView=\{showRequests\} variant="menu"/)
    expect(nav.match(/useCanViewRequests\(/g)).toHaveLength(1)
  })

  it('the desktop link comes first in the right-hand cluster, so a late arrival cannot move the others', () => {
    const cluster = nav.indexOf('hidden items-center gap-6 md:flex')
    const topbar = nav.indexOf('variant="topbar"')
    const home = nav.indexOf('{/* Home Link */}')
    expect(cluster).toBeGreaterThan(-1)
    expect(topbar).toBeGreaterThan(cluster)
    expect(topbar).toBeLessThan(home)
  })

  it('the sidebar uses the gate and keeps its Admin link logic exactly as it was', () => {
    expect(side).toMatch(/<StaffRequestsLink canView=\{showRequests\} variant="sidebar"/)
    expect(side).toContain('const isAdmin = profile?.role === "admin"')
    expect(side).toMatch(/\{isAdmin && \(\s*<NavItem href="\/admin" emoji="🛡️" label="Admin"/)
  })
})
