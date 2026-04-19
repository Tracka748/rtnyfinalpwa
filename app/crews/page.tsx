'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Crew {
  id: string
  name: string
  description: string | null
  is_private: boolean | null
  max_members: number | null
  invite_code: string | null
  created_by: string
  created_at: string | null
  member_count: number
  user_role: string | null
  joined_at: string | null
}

interface CreateForm {
  name: string
  description: string
  is_private: boolean
  max_members: string
}

const DEFAULT_CREATE: CreateForm = {
  name:        '',
  description: '',
  is_private:  false,
  max_members: '',
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-sans text-[10px] tracking-widest text-[#1ac8ed] mb-2">
      {children}
    </label>
  )
}

const inputBase =
  'w-full bg-[#121113] border border-[#2a2829] rounded-xl px-4 py-2.5 text-[#f9fdff] font-sans text-sm ' +
  'placeholder:text-[#7DD8E8]/40 outline-none transition-all duration-200 ' +
  'focus:border-[#59ffa0] focus:ring-2 focus:ring-[#59ffa0]/20'

function InlineError({ message }: { message: string }) {
  return (
    <p className="mt-2 text-red-400 font-sans text-xs">{message}</p>
  )
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4A8 8 0 014 12z" />
    </svg>
  )
}

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null

  const config: Record<string, { label: string; color: string; bg: string; border: string }> = {
    owner:  { label: 'Owner',  color: '#59ffa0', bg: 'rgba(89,255,160,0.08)',  border: 'rgba(89,255,160,0.25)'  },
    admin:  { label: 'Admin',  color: '#1ac8ed', bg: 'rgba(26,200,237,0.08)',  border: 'rgba(26,200,237,0.25)'  },
    member: { label: 'Member', color: '#7DD8E8', bg: 'rgba(125,216,232,0.06)', border: 'rgba(125,216,232,0.18)' },
  }

  const c = config[role] ?? config.member
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-sans font-medium"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}
    >
      {c.label}
    </span>
  )
}

// ─── Copy invite code ─────────────────────────────────────────────────────────

function InviteCodeChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-sans font-medium transition-all duration-150',
        copied
          ? 'border-[#59ffa0]/40 bg-[#59ffa0]/10 text-[#59ffa0]'
          : 'border-[#2a2829] bg-[#121113] text-[#7DD8E8] hover:border-[#1ac8ed]/40 hover:text-[#1ac8ed]'
      )}
    >
      {copied ? (
        <>
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none">
            <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.1" />
            <path d="M3 8H2a1 1 0 01-1-1V2a1 1 0 011-1h5a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.1" />
          </svg>
          {code}
        </>
      )}
    </button>
  )
}

// ─── Crew card ────────────────────────────────────────────────────────────────

interface CrewCardProps {
  crew: Crew
  isLeaving: boolean
  onLeave: () => void
}

function CrewCard({ crew, isLeaving, onLeave }: CrewCardProps) {
  const isOwner = crew.user_role === 'owner' || crew.created_by === crew.id

  return (
    <div className="rounded-2xl border border-[#2a2829] bg-[#1a1819] overflow-hidden transition-all duration-200 hover:border-[#2a2829]/80">
      {/* Top strip: name + badges */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {crew.is_private && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ff6b9d]/10 border border-[#ff6b9d]/25 text-[#ff6b9d] text-[10px] font-sans">
                <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 10 10" fill="none">
                  <rect x="2" y="4.5" width="6" height="5" rx="0.8" stroke="currentColor" strokeWidth="1" />
                  <path d="M3.5 4.5V3a1.5 1.5 0 013 0v1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                </svg>
                Private
              </span>
            )}
            <RoleBadge role={crew.user_role} />
          </div>

          <h3 className="font-header text-lg font-bold text-[#f9fdff] leading-tight truncate">
            {crew.name}
          </h3>

          {crew.description && (
            <p className="text-[#7DD8E8]/70 font-sans text-xs mt-1 line-clamp-2 leading-relaxed">
              {crew.description}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-[#2a2829]" />

      {/* Bottom row: stats + actions */}
      <div className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
        {/* Left: stats */}
        <div className="flex items-center gap-3">
          {/* Member count */}
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[#7DD8E8]/50 shrink-0" viewBox="0 0 14 14" fill="none">
              <circle cx="5" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.1" />
              <path d="M1 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
              <circle cx="10.5" cy="4" r="2" stroke="currentColor" strokeWidth="1.1" />
              <path d="M10.5 8.5c1.7.1 3 1.4 3 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
            </svg>
            <span className="font-sans text-xs text-[#7DD8E8]">
              <span className="text-[#f9fdff] font-medium">{crew.member_count}</span>
              {crew.max_members ? `/${crew.max_members}` : ''} members
            </span>
          </div>

          {/* Invite code */}
          {crew.invite_code && (
            <InviteCodeChip code={crew.invite_code} />
          )}
        </div>

        {/* Right: leave button */}
        <button
          type="button"
          onClick={onLeave}
          disabled={isLeaving || crew.user_role === 'owner'}
          title={crew.user_role === 'owner' ? 'Owners cannot leave — transfer ownership or delete the crew' : 'Leave crew'}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-sans font-medium transition-all duration-150 shrink-0',
            crew.user_role === 'owner'
              ? 'border-[#2a2829] text-[#7DD8E8]/25 cursor-not-allowed'
              : isLeaving
              ? 'border-red-500/20 text-red-400/50 cursor-not-allowed'
              : 'border-[#2a2829] text-[#7DD8E8]/60 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/5'
          )}
        >
          {isLeaving ? (
            <Spinner className="w-3 h-3" />
          ) : (
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none">
              <path d="M8 6H2M5 3.5L2.5 6 5 8.5M7.5 2h2A1.5 1.5 0 0111 3.5v5A1.5 1.5 0 019.5 10h-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {crew.user_role === 'owner' ? 'Owner' : 'Leave'}
        </button>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  return (
    <div className="py-16 text-center rounded-2xl border border-dashed border-[#2a2829]">
      <div className="text-4xl mb-4">🫂</div>
      <p className="font-header text-lg font-bold text-[#f9fdff] mb-1">No crews yet</p>
      <p className="font-sans text-sm text-[#7DD8E8]/60 max-w-xs mx-auto leading-relaxed mb-6">
        Create a private crew for your squad, or join one with an invite code.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onCreate}
          className="px-4 py-2 rounded-xl bg-[#59ffa0] text-[#121113] font-sans font-semibold text-sm hover:bg-[#59ffa0]/90 transition-colors"
        >
          Create Crew
        </button>
        <button
          type="button"
          onClick={onJoin}
          className="px-4 py-2 rounded-xl border border-[#1ac8ed]/30 text-[#1ac8ed] font-sans text-sm hover:bg-[#1ac8ed]/10 transition-colors"
        >
          Join a Crew
        </button>
      </div>
    </div>
  )
}

// ─── Create crew form ─────────────────────────────────────────────────────────

interface CreateCrewFormProps {
  onSuccess: (crew: Crew) => void
  onCancel: () => void
}

function CreateCrewForm({ onSuccess, onCancel }: CreateCrewFormProps) {
  const [form, setForm] = useState<CreateForm>(DEFAULT_CREATE)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof CreateForm>(k: K, v: CreateForm[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Crew name is required.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/v1/crews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        form.name.trim(),
          description: form.description.trim() || null,
          is_private:  form.is_private,
          max_members: form.max_members ? Number(form.max_members) : null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Failed to create crew')
      }
      onSuccess(json.data.crew)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#2a2829] bg-[#1a1819] divide-y divide-[#2a2829]"
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div>
          <p className="font-sans text-[10px] tracking-widest text-[#1ac8ed] mb-0.5">NEW CREW</p>
          <h3 className="font-header text-base font-bold text-[#f9fdff]">Create a Crew</h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#2a2829] text-[#7DD8E8]/50 hover:text-[#f9fdff] hover:border-[#2a2829]/80 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Fields */}
      <div className="px-5 py-4 space-y-4">
        {/* Name */}
        <div>
          <FieldLabel>CREW NAME *</FieldLabel>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. The Friday Crew"
            maxLength={60}
            className={inputBase}
          />
        </div>

        {/* Description */}
        <div>
          <FieldLabel>DESCRIPTION</FieldLabel>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="What's this crew about?"
            rows={2}
            maxLength={200}
            className={cn(inputBase, 'resize-none')}
          />
        </div>

        {/* Private + Max members */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>VISIBILITY</FieldLabel>
            <div className="flex gap-2">
              {[
                { value: false, label: 'Public'  },
                { value: true,  label: 'Private' },
              ].map(opt => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => set('is_private', opt.value)}
                  className={cn(
                    'flex-1 py-2 px-2 rounded-xl border text-xs font-sans font-medium transition-all duration-150',
                    form.is_private === opt.value
                      ? 'border-[#59ffa0] bg-[#59ffa0]/10 text-[#59ffa0]'
                      : 'border-[#2a2829] bg-[#121113] text-[#f9fdff]/60 hover:border-[#59ffa0]/30'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>MAX MEMBERS</FieldLabel>
            <input
              type="number"
              value={form.max_members}
              onChange={e => set('max_members', e.target.value)}
              placeholder="Unlimited"
              min={2}
              max={500}
              className={inputBase}
            />
          </div>
        </div>

        {error && <InlineError message={error} />}
      </div>

      {/* Actions */}
      <div className="px-5 py-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-[#2a2829] text-[#7DD8E8]/70 font-sans text-sm hover:text-[#f9fdff] hover:border-[#2a2829]/80 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-xl font-sans font-semibold text-sm transition-all duration-150',
            submitting
              ? 'bg-[#242324] text-[#7DD8E8]/40 cursor-not-allowed'
              : 'bg-[#59ffa0] text-[#121113] hover:bg-[#59ffa0]/90 active:scale-[0.98]'
          )}
        >
          {submitting && <Spinner className="w-3.5 h-3.5" />}
          {submitting ? 'Creating…' : 'Create Crew'}
        </button>
      </div>
    </form>
  )
}

// ─── Join crew form ───────────────────────────────────────────────────────────

interface JoinCrewFormProps {
  onSuccess: (crew: Crew) => void
  onCancel: () => void
}

function JoinCrewForm({ onSuccess, onCancel }: JoinCrewFormProps) {
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) {
      setError('Invite code is required.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/v1/crews/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code.trim().toUpperCase() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Failed to join crew')
      }
      // mine endpoint enriches with member_count/user_role; join doesn't — fill defaults
      onSuccess({ ...json.data.crew, member_count: 1, user_role: 'member', joined_at: new Date().toISOString() })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#2a2829] bg-[#1a1819] divide-y divide-[#2a2829]"
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div>
          <p className="font-sans text-[10px] tracking-widest text-[#1ac8ed] mb-0.5">JOIN A CREW</p>
          <h3 className="font-header text-base font-bold text-[#f9fdff]">Enter Invite Code</h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#2a2829] text-[#7DD8E8]/50 hover:text-[#f9fdff] hover:border-[#2a2829]/80 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Field */}
      <div className="px-5 py-4">
        <FieldLabel>INVITE CODE</FieldLabel>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. A3F9BC"
          maxLength={12}
          autoFocus
          className={cn(inputBase, 'uppercase tracking-widest font-sans text-center text-base')}
        />
        {error && <InlineError message={error} />}
      </div>

      {/* Actions */}
      <div className="px-5 py-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-[#2a2829] text-[#7DD8E8]/70 font-sans text-sm hover:text-[#f9fdff] hover:border-[#2a2829]/80 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-xl font-sans font-semibold text-sm transition-all duration-150',
            submitting
              ? 'bg-[#242324] text-[#7DD8E8]/40 cursor-not-allowed'
              : 'bg-[#1ac8ed] text-[#121113] hover:bg-[#1ac8ed]/90 active:scale-[0.98]'
          )}
        >
          {submitting && <Spinner className="w-3.5 h-3.5" />}
          {submitting ? 'Joining…' : 'Join Crew'}
        </button>
      </div>
    </form>
  )
}

// ─── Skeleton loading ─────────────────────────────────────────────────────────

function CrewSkeleton() {
  return (
    <div className="rounded-2xl border border-[#2a2829] bg-[#1a1819] overflow-hidden animate-pulse">
      <div className="px-5 pt-4 pb-3">
        <div className="flex gap-2 mb-2">
          <div className="h-4 w-12 rounded-full bg-[#242324]" />
          <div className="h-4 w-14 rounded-full bg-[#242324]" />
        </div>
        <div className="h-5 w-40 rounded-full bg-[#242324] mb-2" />
        <div className="h-3 w-56 rounded-full bg-[#242324]" />
      </div>
      <div className="mx-5 h-px bg-[#2a2829]" />
      <div className="px-5 py-3 flex items-center justify-between">
        <div className="flex gap-3">
          <div className="h-4 w-20 rounded-full bg-[#242324]" />
          <div className="h-6 w-24 rounded-lg bg-[#242324]" />
        </div>
        <div className="h-7 w-16 rounded-lg bg-[#242324]" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ActiveForm = null | 'create' | 'join'

export default function CrewsPage() {
  const [crews, setCrews]             = useState<Crew[]>([])
  const [userId, setUserId]           = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)
  const [fetchError, setFetchError]   = useState<string | null>(null)
  const [activeForm, setActiveForm]   = useState<ActiveForm>(null)
  const [leaving, setLeaving]         = useState<Set<string>>(new Set())

  // ── Load crews + current user in parallel ─────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const [crewsRes, meRes] = await Promise.all([
        fetch('/api/v1/crews/mine'),
        fetch('/api/v1/users/me'),
      ])

      if (crewsRes.status === 401 || meRes.status === 401) {
        window.location.href = '/login'
        return
      }

      const [crewsJson, meJson] = await Promise.all([crewsRes.json(), meRes.json()])

      if (!crewsRes.ok) throw new Error(crewsJson.error ?? 'Failed to load crews')

      setCrews(crewsJson.data?.crews ?? [])
      if (meJson?.data?.user?.id) setUserId(meJson.data.user.id)
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Leave crew ────────────────────────────────────────────────────────────
  async function handleLeave(crewId: string) {
    if (!userId) return
    setLeaving(prev => new Set(prev).add(crewId))
    try {
      const res = await fetch(`/api/v1/crews/${crewId}/members/${userId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Failed to leave crew')
      }
      setCrews(prev => prev.filter(c => c.id !== crewId))
    } catch (err: unknown) {
      // Surface error in-place without disrupting the list
      console.error('Leave crew error:', err)
      alert(err instanceof Error ? err.message : 'Could not leave crew')
    } finally {
      setLeaving(prev => {
        const next = new Set(prev)
        next.delete(crewId)
        return next
      })
    }
  }

  // ── After create/join: optimistically add to list, close form ─────────────
  function handleCreated(crew: Crew) {
    setCrews(prev => [{ ...crew, member_count: 1, user_role: 'owner', joined_at: new Date().toISOString() }, ...prev])
    setActiveForm(null)
  }

  function handleJoined(crew: Crew) {
    // Avoid duplicates if user somehow joins same crew twice
    setCrews(prev =>
      prev.some(c => c.id === crew.id) ? prev : [crew, ...prev]
    )
    setActiveForm(null)
  }

  function openForm(form: ActiveForm) {
    setActiveForm(prev => (prev === form ? null : form))
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#121113]">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#59ffa0] animate-pulse" />
            <span className="font-sans text-[10px] tracking-widest text-[#7DD8E8]">
              MY CREWS
            </span>
          </div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h1 className="font-header text-3xl font-bold text-[#f9fdff]">Crews</h1>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openForm('join')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl border font-sans text-sm font-medium transition-all duration-150',
                  activeForm === 'join'
                    ? 'border-[#1ac8ed]/60 bg-[#1ac8ed]/10 text-[#1ac8ed]'
                    : 'border-[#2a2829] bg-[#1a1819] text-[#7DD8E8] hover:border-[#1ac8ed]/40 hover:text-[#1ac8ed]'
                )}
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 14 14" fill="none">
                  <path d="M5 7h7M9 4l3 3-3 3M6 10.5A5.5 5.5 0 112.5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Join a Crew
              </button>

              <button
                type="button"
                onClick={() => openForm('create')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl font-sans text-sm font-semibold transition-all duration-150',
                  activeForm === 'create'
                    ? 'bg-[#59ffa0]/20 text-[#59ffa0] border border-[#59ffa0]/40'
                    : 'bg-[#59ffa0] text-[#121113] hover:bg-[#59ffa0]/90 active:scale-[0.98]'
                )}
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Create Crew
              </button>
            </div>
          </div>

          {/* Subtitle */}
          <p className="font-sans text-sm text-[#7DD8E8]/60 mt-2">
            Manage your crews and coordinate with your squad.
          </p>
        </div>

        {/* ── Inline forms ─────────────────────────────────────────────────── */}
        {activeForm === 'create' && (
          <div className="mb-6">
            <CreateCrewForm
              onSuccess={handleCreated}
              onCancel={() => setActiveForm(null)}
            />
          </div>
        )}

        {activeForm === 'join' && (
          <div className="mb-6">
            <JoinCrewForm
              onSuccess={handleJoined}
              onCancel={() => setActiveForm(null)}
            />
          </div>
        )}

        {/* ── Divider (only when a form is open) ───────────────────────────── */}
        {activeForm && crews.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#2a2829]" />
            <span className="font-sans text-[10px] tracking-widest text-[#7DD8E8]/40">
              YOUR CREWS
            </span>
            <div className="flex-1 h-px bg-[#2a2829]" />
          </div>
        )}

        {/* ── Content ──────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            <CrewSkeleton />
            <CrewSkeleton />
          </div>
        ) : fetchError ? (
          <div className="py-10 text-center rounded-2xl border border-red-500/15 bg-red-500/5">
            <p className="text-red-400 font-sans text-sm mb-3">{fetchError}</p>
            <button
              type="button"
              onClick={loadAll}
              className="px-4 py-2 rounded-xl border border-[#2a2829] text-[#7DD8E8] font-sans text-sm hover:border-[#59ffa0]/30 hover:text-[#59ffa0] transition-colors"
            >
              Retry
            </button>
          </div>
        ) : crews.length === 0 && !activeForm ? (
          <EmptyState
            onCreate={() => setActiveForm('create')}
            onJoin={() => setActiveForm('join')}
          />
        ) : crews.length === 0 ? null : (
          <div className="space-y-3">
            {/* Crew count badge */}
            {!loading && (
              <div className="flex items-center gap-2 mb-1">
                <span className="font-sans text-[10px] tracking-widest text-[#7DD8E8]/50">
                  {crews.length} CREW{crews.length !== 1 ? 'S' : ''}
                </span>
              </div>
            )}

            {crews.map(crew => (
              <CrewCard
                key={crew.id}
                crew={crew}
                isLeaving={leaving.has(crew.id)}
                onLeave={() => handleLeave(crew.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
