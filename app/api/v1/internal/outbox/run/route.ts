import { NextRequest, NextResponse } from 'next/server'
import { checkBearer, cronSecretConfigured } from '@/lib/internal-auth'
import { runOutboxWithBudget } from '@/lib/notifications/outbox'

// Scheduled outbox run. Called every minute by Supabase pg_cron (pg_net POST) and once a day by
// Vercel Cron (GET) as a backstop. Both send "Authorization: Bearer <CRON_SECRET>".
// Fails closed without CRON_SECRET. Returns counts only. Never logs the secret, the Authorization
// header or the request body (the body is never read).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const NO_STORE = { 'Cache-Control': 'no-store' }
const reply = (status: number, body: unknown) => NextResponse.json(body, { status, headers: NO_STORE })

async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!cronSecretConfigured(secret)) return reply(503, { success: false, error: 'Not configured' })
  if (!checkBearer(request.headers.get('authorization'), secret)) {
    return reply(401, { success: false, error: 'Unauthorized' })
  }
  try {
    const s = await runOutboxWithBudget()
    return reply(200, {
      success: true,
      data: {
        claimed: s.claimed, sent: s.sent, retried: s.retried, failed: s.failed,
        skipped: s.skipped, batches: s.batches, deferred: s.deferred,
      },
    })
  } catch {
    console.error('[outbox-run] run failed')
    return reply(500, { success: false, error: 'Outbox run failed' })
  }
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
