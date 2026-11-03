// Recording fake of the supabase-js query builder for route/unit tests. No vitest import.

export interface Recorded {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete'
  payload: unknown
  eq: Record<string, unknown>
  gte: Record<string, unknown>
  in: Record<string, unknown[]>
}
export type FakeResult = { data: unknown; error: unknown }

export function fakeSupabase(opts: {
  respond?: (q: Recorded) => FakeResult
  rpc?: (fn: string, args: Record<string, unknown>) => FakeResult
  user?: (id: string) => FakeResult
}) {
  const calls: Recorded[] = []
  const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = []
  const client = {
    from(table: string) {
      const q: Recorded = { table, op: 'select', payload: undefined, eq: {}, gte: {}, in: {} }
      calls.push(q)
      const b: Record<string, unknown> = {
        select: () => b,
        insert: (p: unknown) => { q.op = 'insert'; q.payload = p; return b },
        update: (p: unknown) => { q.op = 'update'; q.payload = p; return b },
        delete: () => { q.op = 'delete'; return b },
        eq: (c: string, v: unknown) => { q.eq[c] = v; return b },
        gte: (c: string, v: unknown) => { q.gte[c] = v; return b },
        not: () => b,
        in: (c: string, v: unknown[]) => { q.in[c] = v; return b },
        order: () => b,
        range: () => b,
        limit: () => b,
        maybeSingle: () => b,
        single: () => b,
        then: (res: (v: FakeResult) => unknown, rej: (e: unknown) => unknown) =>
          new Promise<FakeResult>(resolve =>
            resolve(opts.respond ? opts.respond(q) : { data: null, error: null })
          ).then(res, rej),
      }
      return b
    },
    rpc(fn: string, args: Record<string, unknown>) {
      rpcCalls.push({ fn, args })
      return Promise.resolve(opts.rpc ? opts.rpc(fn, args) : { data: null, error: null })
    },
    auth: {
      admin: {
        getUserById: (id: string) =>
          Promise.resolve(opts.user ? opts.user(id) : { data: { user: null }, error: null }),
      },
    },
  }
  return { client: client as never, calls, rpcCalls }
}
