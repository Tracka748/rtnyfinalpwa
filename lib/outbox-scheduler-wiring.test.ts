// Source scans for the 1C-a scheduler wiring: Vercel Cron, the middleware exclusion, the route's
// logging rules and the migration's shape (no cron jobs, no Vault values, owner-only kick).
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

describe('vercel.json', () => {
  it('has one daily cron on the outbox route (Hobby allows at most daily)', () => {
    const cfg = JSON.parse(read('vercel.json'))
    expect(cfg.crons).toEqual([{ path: '/api/v1/internal/outbox/run', schedule: '0 14 * * *' }])
  })
})

describe('middleware', () => {
  it('skips the internal routes (no session refresh on scheduler calls), keeping the webhook exclusion', () => {
    const mw = read('middleware.ts')
    expect(mw).toContain('api/v1/stripe/webhook|api/v1/internal|')
  })
})

describe('outbox run route', () => {
  const route = read('app/api/v1/internal/outbox/run/route.ts')

  it('never reads the body and never logs the secret, the header or a request value', () => {
    expect(route).not.toMatch(/request\.(json|text|formData|arrayBuffer|body)\b/)
    for (const call of route.match(/console\.\w+\([^)]*\)/g) ?? []) {
      expect(call).not.toMatch(/secret|header|authorization|request|bearer/i)
    }
  })

  it('checks the secret before running and uses the budgeted worker', () => {
    const handle = route.slice(route.indexOf('async function handle'))
    expect(handle.indexOf('cronSecretConfigured(secret)')).toBeLessThan(handle.indexOf('runOutboxWithBudget()'))
    expect(handle.indexOf('checkBearer(')).toBeLessThan(handle.indexOf('runOutboxWithBudget()'))
  })
})

describe('migration 20261117100019', () => {
  const sql = read('supabase/migrations/20261117100019_outbox_scheduler.sql')
  const code = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')

  it('creates only the two functions; no cron job and no Vault value', () => {
    expect(code).toMatch(/create or replace function public\.request_notifications_recover_stuck\(\)/)
    expect(code).toMatch(/create or replace function public\.outbox_kick\(\)/)
    expect(code).not.toMatch(/cron\.schedule|vault\.create_secret|vault\.update_secret/)
  })

  it('both functions are security definer with an empty search_path', () => {
    expect(code.match(/security definer set search_path = ''/g)).toHaveLength(2)
  })

  it('recovery is service_role only; the kick is owner only', () => {
    expect(code).toContain('revoke all on function public.request_notifications_recover_stuck() from public, anon, authenticated;')
    expect(code).toContain('grant execute on function public.request_notifications_recover_stuck() to service_role;')
    expect(code).toContain('revoke all on function public.outbox_kick() from public, anon, authenticated, service_role;')
    expect(code).not.toMatch(/grant execute on function public\.outbox_kick/)
  })

  it('the kick reads all settings from Vault, requires https and a 32-character secret, and the bypass is optional', () => {
    for (const name of ['app_base_url', 'cron_secret', 'vercel_bypass_secret']) {
      expect(code).toContain(`from vault.decrypted_secrets where name = '${name}'`)
    }
    expect(code).toContain("v_base !~* '^https://")
    expect(code).toContain('< 32')
    expect(code).toMatch(/if nullif\(btrim\(coalesce\(v_bypass, ''\)\), ''\) is not null then/)
    expect(code).toContain("'/api/v1/internal/outbox/run'")
  })
})
