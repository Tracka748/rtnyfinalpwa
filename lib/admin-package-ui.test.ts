import { describe, expect, it } from 'vitest'
import {
  canStartDraft, createPackageError, liveLabel, openLabel, parsePackagePage, parseThemes, startDraftError,
  type PackageRow,
} from './admin-package-ui'

const row = (over: Partial<PackageRow> = {}): PackageRow => ({
  id: 'p1', key: 'zz_demo', occasion: 'Birthday', status: 'active', theme_name: null,
  live_version: { id: 'v1', version_number: 1, title: 'Demo' }, open_version: null, version_count: 1, ...over,
})

describe('canStartDraft', () => {
  it('only for an active, live package with no open draft', () => {
    expect(canStartDraft(row())).toBe(true)
    expect(canStartDraft(row({ open_version: { id: 'v2', status: 'draft', revision: 1, title: 'x' } }))).toBe(false)
    expect(canStartDraft(row({ live_version: null }))).toBe(false)
    expect(canStartDraft(row({ status: 'archived' }))).toBe(false)
  })
})

describe('labels', () => {
  it('names open states and live versions in words', () => {
    expect(openLabel('draft')).toBe('Draft')
    expect(openLabel('in_review')).toBe('In review')
    expect(openLabel('needs_changes')).toBe('Changes requested')
    expect(openLabel('weird')).toBe('Open')
    expect(liveLabel(row())).toBe('version 1, Demo')
    expect(liveLabel(row({ live_version: null }))).toBe('Not live yet')
  })
})

describe('parsePackagePage', () => {
  const body = (packages: unknown[], extra: Record<string, unknown> = {}) => ({
    success: true, data: { packages, has_more: false, next_offset: null, ...extra },
  })
  const raw = {
    id: 'p1', key: 'k', occasion: 'o', status: 'active', theme_id: 't', theme_name: 'Birthday',
    live_version: { id: 'v1', version_number: 2, title: 'T' },
    open_version: { id: 'v2', status: 'draft', revision: 3, title: 'D' }, version_count: 2,
  }

  it('reads the fields the list route returns', () => {
    const page = parsePackagePage(body([raw]))
    expect(page?.nextOffset).toBeNull()
    expect(page?.rows[0]).toEqual({
      id: 'p1', key: 'k', occasion: 'o', status: 'active', theme_name: 'Birthday',
      live_version: { id: 'v1', version_number: 2, title: 'T' },
      open_version: { id: 'v2', status: 'draft', revision: 3, title: 'D' }, version_count: 2,
    })
  })

  it('handles missing live and open versions and a next page', () => {
    const page = parsePackagePage(body([{ ...raw, live_version: null, open_version: null, theme_name: null }], { has_more: true, next_offset: 200 }))
    expect(page?.nextOffset).toBe(200)
    expect(page?.rows[0].live_version).toBeNull()
    expect(page?.rows[0].open_version).toBeNull()
    expect(page?.rows[0].theme_name).toBeNull()
  })

  it('rejects other shapes', () => {
    expect(parsePackagePage(null)).toBeNull()
    expect(parsePackagePage({ success: false })).toBeNull()
    expect(parsePackagePage(body([{ ...raw, status: 'weird' }]))).toBeNull()
    expect(parsePackagePage(body([{ key: 'k' }]))).toBeNull()
  })
})

describe('parseThemes', () => {
  it('keeps id and name only and rejects other shapes', () => {
    expect(parseThemes({ success: true, data: [{ id: 'a', name: 'Birthday', extra: 1 }, { id: 5 }] })).toEqual([{ id: 'a', name: 'Birthday' }])
    expect(parseThemes({ success: false })).toBeNull()
    expect(parseThemes(null)).toBeNull()
  })
})

describe('error messages', () => {
  it('create: 409 says keys are never reused, 400 shows the route message, others are fixed', () => {
    expect(createPackageError(409, { error: 'A record with these values already exists' })).toContain('can never be reused')
    expect(createPackageError(400, { error: 'Theme does not exist or is inactive' })).toBe('Theme does not exist or is inactive')
    expect(createPackageError(400, { error: 'x'.repeat(201) })).toBe('Something went wrong. Try again.')
    expect(createPackageError(500, { error: 'PGSECRET' })).not.toContain('PGSECRET')
    expect(createPackageError(403, null)).toContain('permission')
  })

  it('start draft: 409 and 404 have fixed messages, 500 never shows server text', () => {
    expect(startDraftError(409, null)).toBe('This package already has an open draft.')
    expect(startDraftError(404, null)).toBe('Package not found.')
    expect(startDraftError(400, { error: 'package has no live version or is not active' })).toBe('package has no live version or is not active')
    expect(startDraftError(500, { error: 'PGSECRET' })).not.toContain('PGSECRET')
  })
})
