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

describe('migration 20261117100020 (unclaimed reminders)', () => {
  const sql = read('supabase/migrations/20261117100020_unclaimed_reminders.sql')
  const code = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')

  it('defines only the enqueue function, with the fixed cutoff default; no cron job and no Vault', () => {
    expect(code.match(/create or replace function/g)).toHaveLength(1)
    expect(code).toContain("create or replace function public.request_enqueue_unclaimed_reminders(\n  p_created_after timestamptz default '2026-11-10 13:26:43+00')")
    expect(code).not.toMatch(/cron\.schedule|vault\./)
    expect(code).toContain("security definer set search_path = ''")
  })

  it('is service_role only', () => {
    expect(code).toContain('revoke all on function public.request_enqueue_unclaimed_reminders(timestamptz) from public, anon, authenticated;')
    expect(code).toContain('grant execute on function public.request_enqueue_unclaimed_reminders(timestamptz) to service_role;')
  })

  it('targets eligible admins, open unowned requests past 24 hours, one row per period', () => {
    expect(code).toContain('from public.request_eligible_coordinators() e')
    expect(code).toContain('where e.is_admin')
    expect(code).toContain("r.status not in ('completed','declined','cancelled')")
    expect(code).toContain("r.unowned_since <= now() - interval '24 hours'")
    expect(code).toContain('r.created_at >= p_created_after')
    expect(code).toContain("'reminder_24h:' || ((extract(epoch from d.unowned_since) * 1000000)::bigint)::text")
    expect(code).toContain('on conflict on constraint request_notifications_dedupe do nothing')
  })
})

describe('outbox reads unowned_since for the reminder check', () => {
  it('selects it with the request', () => {
    expect(read('lib/notifications/outbox.ts')).toContain(".select('id, request_source, request_kind, status, user_id, coordinator_id, unowned_since')")
  })
})

describe('migration 20261117100021 (health and requeue)', () => {
  const sql = read('supabase/migrations/20261117100021_outbox_health_and_requeue.sql')
  const code = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
  const SIGS = ['request_notifications_health()', 'request_notifications_requeue(uuid, uuid[])', 'request_notifications_requeue_app_url(uuid)']
  const body = (name: string, next: string | null) => {
    const start = code.indexOf(`create or replace function public.${name}`)
    return code.slice(start, next ? code.indexOf(`create or replace function public.${next}`) : undefined)
  }
  const health = body('request_notifications_health()', 'request_notifications_requeue(')
  const requeue = body('request_notifications_requeue(', 'request_notifications_requeue_app_url(')
  const appUrl = body('request_notifications_requeue_app_url(', null)

  it('defines exactly three functions, all security definer with an empty search_path', () => {
    expect(code.match(/create or replace function/g)).toHaveLength(3)
    expect(code.match(/security definer set search_path = ''/g)).toHaveLength(3)
  })

  it('every function is service_role only', () => {
    for (const sig of SIGS) {
      expect(code).toContain(`revoke all on function public.${sig} from public, anon, authenticated;`)
      expect(code).toContain(`grant execute on function public.${sig} to service_role;`)
    }
  })

  it('creates no cron job and uses no Vault', () => {
    expect(code).not.toMatch(/cron\.schedule|cron\.unschedule|vault\./)
  })

  it('reads cron history only inside a block that handles missing access', () => {
    expect(health).toContain('from cron.job_run_details d')
    expect(health.indexOf('exception when insufficient_privilege or undefined_table or invalid_schema_name then'))
      .toBeGreaterThan(health.indexOf('from cron.job_run_details d'))
    expect(health).toContain("'cron_readable', v_cron")
  })

  it('health returns counts, ages, codes and ids only: it never reads people or request content', () => {
    expect(health).not.toMatch(/auth\.users|public\.profiles|contact_|notes|event_type|recipient_user_id/)
  })

  it('both requeues re-check the admin actor, only touch rows on open requests, and never change identity', () => {
    expect(code.match(/not public\.tp_is_admin\(p_actor\)/g)).toHaveLength(2)
    for (const fn of [requeue, appUrl]) {
      expect(fn).toContain("r.status not in ('completed','declined','cancelled')")
      expect(fn).toContain('email_attempts = 0')
      expect(fn).toContain('email_locked_until = null')
      expect(fn).not.toMatch(/dedupe_key\s*=|recipient_user_id\s*=|request_id\s*=|kind\s*=|created_at\s*=/)
    }
  })

  it('the id requeue is one conditional update on failed rows, capped at 100', () => {
    expect(requeue).toContain("and n.email_status = 'failed'")
    expect(requeue).toContain('v_req > 100')
    expect(requeue).toContain("errcode = '22023'")
  })

  it('the app_url requeue targets the retry code the outbox writes, locks rows with skip locked, and caps at 100', () => {
    expect(appUrl).toContain("n.email_last_error = 'app_url_not_configured'")
    expect(appUrl).toContain("n.email_status in ('failed','pending')")
    expect(appUrl).toContain('for update of n skip locked')
    expect(appUrl).toContain('limit 100')
  })

  it('the audit table holds counts only and is locked down', () => {
    expect(code).toContain('alter table public.request_notification_admin_actions enable row level security;')
    expect(code).toContain('revoke all on table public.request_notification_admin_actions from anon, authenticated;')
    expect(code).toContain('grant select on table public.request_notification_admin_actions to service_role;')
    const table = code.slice(code.indexOf('create table public.request_notification_admin_actions'), code.indexOf('alter table public.request_notification_admin_actions'))
    expect(table).not.toMatch(/\b(email|name|notes|ids|recipient\w*|details)\b\s+(text|uuid|jsonb)/)
    expect(table).toMatch(/\bactor_id\s+uuid references public\.profiles\(id\) on delete set null/)
  })
})

describe('notification admin routes', () => {
  for (const file of ['app/api/v1/admin/notifications/health/route.ts', 'app/api/v1/admin/notifications/requeue/route.ts']) {
    const src = read(file)
    it(`${file}: admin check first, service client, fixed errors`, () => {
      expect(src.indexOf('requireAdmin(request)')).toBeGreaterThan(-1)
      expect(src.indexOf('requireAdmin(request)')).toBeLessThan(src.indexOf('createSupabaseAdmin()'))
      expect(src).toContain("export const dynamic = 'force-dynamic'")
      // No database error text can reach a response or a log.
      expect(src).not.toMatch(/\.message|details:|hint:/)
    })
  }
})
