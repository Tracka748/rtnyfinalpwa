import { describe, expect, it } from 'vitest'
import { SAFE_URL_MAX, safeExternalUrl } from '@/lib/safe-url'

describe('safeExternalUrl: accepted', () => {
  it('returns a good https URL unchanged', () => {
    expect(safeExternalUrl('https://cdn.example.com/a/b.png')).toBe('https://cdn.example.com/a/b.png')
    expect(safeExternalUrl('https://example.com/a?x=1&y=2#frag')).toBe('https://example.com/a?x=1&y=2#frag')
  })
  it('accepts http', () => {
    expect(safeExternalUrl('http://example.com/story')).toBe('http://example.com/story')
  })
  it('accepts an uppercase scheme', () => {
    expect(safeExternalUrl('HTTPS://EXAMPLE.com/a.png')).toBe('HTTPS://EXAMPLE.com/a.png')
    expect(safeExternalUrl('Http://example.com')).toBe('Http://example.com')
  })
  it('trims surrounding spaces', () => {
    expect(safeExternalUrl('  https://example.com/a.png  ')).toBe('https://example.com/a.png')
  })
  it('accepts a URL of exactly the maximum length', () => {
    const prefix = 'https://example.com/'
    const url = prefix + 'a'.repeat(SAFE_URL_MAX - prefix.length)
    expect(url).toHaveLength(SAFE_URL_MAX)
    expect(safeExternalUrl(url)).toBe(url)
  })
})

describe('safeExternalUrl: rejected', () => {
  it.each([
    ['javascript:', 'javascript:alert(1)'],
    ['javascript: in odd case', 'JaVaScRiPt:alert(1)'],
    ['data: html', 'data:text/html,<script>alert(1)</script>'],
    ['data: image', 'data:image/png;base64,iVBORw0KGgo='],
    ['vbscript:', 'vbscript:msgbox(1)'],
    ['ftp:', 'ftp://example.com/a.png'],
    ['file:', 'file:///etc/passwd'],
    ['blob:', 'blob:https://example.com/1234'],
    ['mailto:', 'mailto:a@b.com'],
    ['relative path', '/images/a.png'],
    ['relative file', 'a.png'],
    ['protocol-relative', '//cdn.example.com/a.png'],
    ['no scheme', 'example.com/a.png'],
    ['scheme without host', 'https://'],
  ])('%s', (_name, raw) => {
    expect(safeExternalUrl(raw)).toBeNull()
  })

  it('rejects empty and whitespace-only strings', () => {
    expect(safeExternalUrl('')).toBeNull()
    expect(safeExternalUrl('   ')).toBeNull()
  })

  it('rejects control characters anywhere, including ones the URL parser would silently strip', () => {
    expect(safeExternalUrl('https://example.com/a\u0000b')).toBeNull()
    expect(safeExternalUrl('https://example.com/\na')).toBeNull()
    expect(safeExternalUrl('https://example.com/a\tb')).toBeNull()
    expect(safeExternalUrl('java\nscript:alert(1)')).toBeNull()
    expect(safeExternalUrl('\thttps://example.com')).toBeNull()
    expect(safeExternalUrl('https://example.com/a\u007Fb')).toBeNull()
    expect(safeExternalUrl('https://example.com/a\u0085b')).toBeNull()
  })

  it('rejects a URL over the length limit', () => {
    const prefix = 'https://example.com/'
    expect(safeExternalUrl(prefix + 'a'.repeat(SAFE_URL_MAX - prefix.length + 1))).toBeNull()
  })

  it('rejects non-strings', () => {
    for (const v of [null, undefined, 5, true, {}, [], ['https://example.com']]) expect(safeExternalUrl(v)).toBeNull()
  })
})
