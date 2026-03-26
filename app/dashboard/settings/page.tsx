'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ─── Option maps ────────────────────────────────────────────────────────────

const NEIGHBORHOOD_OPTIONS = [
  { value: 'park_ave', label: 'Park Ave' },
  { value: 'east_end', label: 'East End' },
  { value: 'monroe_ave', label: 'Monroe Ave' },
  { value: 'southwest', label: 'Southwest' },
  { value: 'urban', label: 'Urban' },
  { value: 'suburban', label: 'Suburban' },
  { value: 'other', label: 'Other' },
]

const AGE_RANGE_OPTIONS = [
  { value: '18-20', label: '18–20' },
  { value: '21-25', label: '21–25' },
  { value: '26-30', label: '26–30' },
  { value: '31-35', label: '31–35' },
  { value: '36-45', label: '36–45' },
  { value: '46+', label: '46+' },
]

const GENDER_OPTIONS = [
  { value: 'man', label: 'Man' },
  { value: 'woman', label: 'Woman' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

const RELATIONSHIP_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'taken', label: 'Taken' },
  { value: 'its_complicated', label: "It's complicated" },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

const VIBE_OPTIONS = [
  { value: 'hip_hop', label: 'Hip-Hop' },
  { value: 'reggae_dancehall', label: 'Reggae / Dancehall' },
  { value: 'spanish_vibes', label: 'Spanish Vibes' },
  { value: 'lgbtq', label: 'LGBTQ+' },
  { value: 'music_junkie', label: 'Music Junkie' },
  { value: 'r_and_b', label: 'R&B' },
  { value: 'latin', label: 'Latin' },
  { value: 'afrobeats', label: 'Afrobeats' },
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfileForm {
  first_name: string
  last_name: string
  phone: string
  neighborhood: string
  age_range: string
  gender: string
  relationship_status: string
  is_parent: boolean
  vibe_tags: string[]
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-[family-name:var(--font-rokkitt)] text-lg font-bold text-[#F9FDFF] mb-4">
      {children}
    </h2>
  )
}

function FieldLabel({ children, optional = false }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block font-[family-name:var(--font-rubik)] text-sm text-[#A0A0A0] mb-1.5">
      {children}
      {optional && (
        <span className="ml-2 text-xs text-[#555]">Optional</span>
      )}
    </label>
  )
}

const inputClass =
  'w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2.5 font-[family-name:var(--font-rubik)] text-sm text-[#F9FDFF] outline-none transition-colors focus:border-[#59FFA0] placeholder:text-[#555]'

const selectClass =
  'w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2.5 font-[family-name:var(--font-rubik)] text-sm text-[#F9FDFF] outline-none transition-colors focus:border-[#59FFA0] appearance-none cursor-pointer'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const [form, setForm] = useState<ProfileForm>({
    first_name: '',
    last_name: '',
    phone: '',
    neighborhood: '',
    age_range: '',
    gender: '',
    relationship_status: '',
    is_parent: false,
    vibe_tags: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Fetch existing profile on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/v1/users/profile')
        if (res.status === 401) {
          router.push('/login')
          return
        }
        const json = await res.json()
        if (json.success && json.data) {
          const d = json.data
          setForm({
            first_name: d.first_name ?? '',
            last_name: d.last_name ?? '',
            phone: d.phone ?? '',
            neighborhood: d.neighborhood ?? '',
            age_range: d.age_range ?? '',
            gender: d.gender ?? '',
            relationship_status: d.relationship_status ?? '',
            is_parent: d.is_parent ?? false,
            vibe_tags: d.vibe_tags ?? [],
          })
        }
      } catch (err) {
        console.error('Failed to load profile', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [router])

  function setField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleVibe(value: string) {
    setForm((prev) => ({
      ...prev,
      vibe_tags: prev.vibe_tags.includes(value)
        ? prev.vibe_tags.filter((v) => v !== value)
        : [...prev.vibe_tags, value],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSavedMsg('')
    setErrorMsg('')

    // Send nulls for empty fields so DB doesn't store empty strings
    const payload = {
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      phone: form.phone || null,
      neighborhood: form.neighborhood || null,
      age_range: form.age_range || null,
      gender: form.gender || null,
      relationship_status: form.relationship_status || null,
      is_parent: form.is_parent,
      vibe_tags: form.vibe_tags,
    }

    try {
      const res = await fetch('/api/v1/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        setSavedMsg('Profile saved!')
        setTimeout(() => setSavedMsg(''), 3000)
      } else {
        setErrorMsg(json.error ?? 'Something went wrong.')
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121113] flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-[#59FFA0] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#121113] pb-16">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] bg-[#0A0A0A] sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-4 py-5 flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-[#A0A0A0] hover:text-[#F9FDFF] transition-colors"
            aria-label="Go back"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-[family-name:var(--font-rokkitt)] text-2xl font-bold text-[#F9FDFF]">
            Profile Settings
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-8">
        {/* Privacy note */}
        <div className="mb-8 rounded-lg border border-[#59FFA0]/20 bg-[#59FFA0]/5 px-4 py-3">
          <p className="font-[family-name:var(--font-rubik)] text-sm text-[#A0A0A0]">
            This info is never shared publicly. It helps us surface events you'll actually enjoy.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── Basic Info ── */}
          <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <SectionHeader>Basic Info</SectionHeader>
            <div className="space-y-4">
              <div>
                <FieldLabel>Display Name <span className="ml-2 text-xs text-[#555]">Optional</span></FieldLabel>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setField('first_name', e.target.value)}
                  placeholder="How you want to be known"
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Phone <span className="ml-2 text-xs text-[#555]">Optional</span></FieldLabel>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* ── Demographics ── */}
          <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <SectionHeader>About You</SectionHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <div>
                <FieldLabel optional>Neighborhood</FieldLabel>
                <div className="relative">
                  <select
                    value={form.neighborhood}
                    onChange={(e) => setField('neighborhood', e.target.value)}
                    className={selectClass}
                    aria-label="Neighborhood"
                  >
                    <option value="">Select…</option>
                    {NEIGHBORHOOD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronIcon />
                </div>
              </div>

              <div>
                <FieldLabel optional>Age Range</FieldLabel>
                <div className="relative">
                  <select
                    value={form.age_range}
                    onChange={(e) => setField('age_range', e.target.value)}
                    className={selectClass}
                    aria-label="Age range"
                  >
                    <option value="">Select…</option>
                    {AGE_RANGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronIcon />
                </div>
              </div>

              <div>
                <FieldLabel optional>Gender</FieldLabel>
                <div className="relative">
                  <select
                    value={form.gender}
                    onChange={(e) => setField('gender', e.target.value)}
                    className={selectClass}
                    aria-label="Gender"
                  >
                    <option value="">Select…</option>
                    {GENDER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronIcon />
                </div>
              </div>

              <div>
                <FieldLabel optional>Relationship Status</FieldLabel>
                <div className="relative">
                  <select
                    value={form.relationship_status}
                    onChange={(e) => setField('relationship_status', e.target.value)}
                    className={selectClass}
                    aria-label="Relationship status"
                  >
                    <option value="">Select…</option>
                    {RELATIONSHIP_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronIcon />
                </div>
              </div>

            </div>

            {/* is_parent toggle */}
            <div className="mt-5 flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#121113] px-4 py-3">
              <div>
                <p className="font-[family-name:var(--font-rubik)] text-sm text-[#F9FDFF]">
                  I'm a parent
                </p>
                <p className="font-[family-name:var(--font-rubik)] text-xs text-[#555] mt-0.5">
                  Optional
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.is_parent ? 'true' : 'false'}
                aria-label="I'm a parent"
                onClick={() => setField('is_parent', !form.is_parent)}
                className={[
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                  'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59FFA0]',
                  form.is_parent ? 'bg-[#59FFA0]' : 'bg-[#2A2A2A]',
                ].join(' ')}
              >
                <span
                  className={[
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg',
                    'transform transition-transform duration-200',
                    form.is_parent ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')}
                />
              </button>
            </div>
          </section>

          {/* ── Vibe Tags ── */}
          <section className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <SectionHeader>Your Vibe</SectionHeader>
            <p className="font-[family-name:var(--font-rubik)] text-xs text-[#555] mb-4">
              Optional &mdash; select all that fit
            </p>
            <div className="flex flex-wrap gap-2">
              {VIBE_OPTIONS.map((vibe) => {
                const selected = form.vibe_tags.includes(vibe.value)
                return (
                  <button
                    key={vibe.value}
                    type="button"
                    onClick={() => toggleVibe(vibe.value)}
                    className={[
                      'rounded-full border px-4 py-1.5 font-[family-name:var(--font-rubik)] text-sm',
                      'transition-all duration-150 select-none',
                      selected
                        ? 'border-[#59FFA0] bg-[#59FFA0] text-[#121113] font-medium'
                        : 'border-[#2A2A2A] bg-[#121113] text-[#A0A0A0] hover:border-[#59FFA0]/50 hover:text-[#F9FDFF]',
                    ].join(' ')}
                  >
                    {vibe.label}
                  </button>
                )
              })}
            </div>
          </section>

          {/* ── Save ── */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-[#59FFA0] px-6 py-3 font-[family-name:var(--font-rubik)] text-sm font-semibold text-[#121113] transition-all hover:bg-[#4DE08A] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>

          {savedMsg && (
            <p className="font-[family-name:var(--font-rubik)] text-sm text-[#59FFA0] text-center">
              {savedMsg}
            </p>
          )}
          {errorMsg && (
            <p className="font-[family-name:var(--font-rubik)] text-sm text-red-400 text-center">
              {errorMsg}
            </p>
          )}

        </form>
      </div>
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
