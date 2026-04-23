'use client';

import { useState, useEffect, useRef } from 'react';

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  instagram_handle: string | null;
  bio: string | null;
  role: string | null;
  member_since: string | null;
  promoter_status: string | null;
  promoter_id: string | null;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onDone }: { message: string; type: 'success' | 'error'; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className={[
        'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
        'animate-in slide-in-from-bottom-4 fade-in duration-200',
        type === 'success'
          ? 'bg-[#59FFA0] text-black'
          : 'bg-red-500/90 text-white',
      ].join(' ')}
    >
      <span>{type === 'success' ? '✓' : '✕'}</span>
      {message}
    </div>
  );
}

// ── Status badges ─────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string | null }) {
  const map: Record<string, { label: string; className: string }> = {
    admin:    { label: 'Admin',    className: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    promoter: { label: 'Promoter', className: 'bg-[#59FFA0]/15 text-[#59FFA0] border-[#59FFA0]/30' },
    user:     { label: 'Member',   className: 'bg-white/10 text-white/70 border-white/20' },
  };
  const cfg = map[role ?? ''] ?? map['user'];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function PromoterStatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; className: string }> = {
    active:   { label: 'Active',   className: 'bg-[#59FFA0]/15 text-[#59FFA0] border-[#59FFA0]/30' },
    inactive: { label: 'Inactive', className: 'bg-white/10 text-white/50 border-white/20' },
    suspended:{ label: 'Suspended',className: 'bg-red-500/20 text-red-300 border-red-500/30' },
    pending:  { label: 'Pending',  className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  };
  if (!status) return null;
  const cfg = map[status] ?? { label: status, className: 'bg-white/10 text-white/50 border-white/20' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-white/5 rounded-lg animate-pulse ${className ?? ''}`} />;
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <Skeleton className="h-4 w-32 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-28 ml-auto mt-2" />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
        <Skeleton className="h-4 w-32 mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PromoterProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetch('/api/v1/promoter/profile')
      .then(r => r.json())
      .then(json => {
        if (json.success) setProfile(json.data);
      })
      .catch(() => {/* leave null */})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current) return;
    setSaving(true);

    const fd = new FormData(formRef.current);
    const body = {
      first_name: fd.get('first_name') as string || null,
      last_name:  fd.get('last_name')  as string || null,
      phone:      fd.get('phone')      as string || null,
      display_name:     fd.get('display_name')     as string || null,
      instagram_handle: fd.get('instagram_handle') as string || null,
      bio:        fd.get('bio')        as string || null,
    };

    try {
      const res = await fetch('/api/v1/promoter/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setProfile(prev => prev ? { ...prev, ...body } : prev);
        setToast({ message: 'Profile saved!', type: 'success' });
      } else {
        setToast({ message: json.error || 'Failed to save', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error — please try again', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const labelClass = 'block text-xs font-medium text-[#7DD8E8] mb-1.5';
  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 ' +
    'focus:outline-none focus:border-[#59FFA0]/50 focus:bg-white/[0.08] transition-colors';
  const readonlyClass =
    'w-full bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2.5 text-sm text-white/50 cursor-not-allowed';

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-header font-bold text-white">My Profile</h1>
          <p className="text-[#7DD8E8] mt-1">Manage your public promoter details and account info</p>
        </div>

        {loading ? (
          <FormSkeleton />
        ) : (
          <>
            {/* ── EDIT FORM ──────────────────────────────────────────────── */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-5">
                Profile Details
              </h2>

              <form ref={formRef} onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div>
                    <label htmlFor="first_name" className={labelClass}>First Name</label>
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      defaultValue={profile?.first_name ?? ''}
                      placeholder="Jane"
                      className={inputClass}
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label htmlFor="last_name" className={labelClass}>Last Name</label>
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      defaultValue={profile?.last_name ?? ''}
                      placeholder="Smith"
                      className={inputClass}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className={labelClass}>Phone</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      defaultValue={profile?.phone ?? ''}
                      placeholder="+1 (555) 000-0000"
                      className={inputClass}
                    />
                  </div>

                  {/* Display Name */}
                  <div>
                    <label htmlFor="display_name" className={labelClass}>Display Name</label>
                    <input
                      id="display_name"
                      name="display_name"
                      type="text"
                      defaultValue={profile?.display_name ?? ''}
                      placeholder="Your public name"
                      className={inputClass}
                    />
                  </div>

                  {/* Instagram Handle */}
                  <div className="sm:col-span-2">
                    <label htmlFor="instagram_handle" className={labelClass}>Instagram Handle</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-white/10 bg-white/5 text-[#7DD8E8] text-sm">
                        @
                      </span>
                      <input
                        id="instagram_handle"
                        name="instagram_handle"
                        type="text"
                        defaultValue={profile?.instagram_handle?.replace(/^@/, '') ?? ''}
                        placeholder="yourhandle"
                        className={`${inputClass} rounded-l-none`}
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="sm:col-span-2">
                    <label htmlFor="bio" className={labelClass}>Bio</label>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={4}
                      defaultValue={profile?.bio ?? ''}
                      placeholder="Tell attendees about yourself and the events you throw…"
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#59FFA0] text-black font-semibold text-sm rounded-xl hover:bg-[#59FFA0]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Saving…
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* ── ACCOUNT INFO ───────────────────────────────────────────── */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-5">
                Account Info
              </h2>

              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={profile?.email ?? ''}
                    readOnly
                    tabIndex={-1}
                    className={readonlyClass}
                  />
                </div>

                {/* Role + Promoter Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className={labelClass}>Role</p>
                    <div className="flex items-center h-10">
                      <RoleBadge role={profile?.role ?? null} />
                    </div>
                  </div>

                  {profile?.promoter_status && (
                    <div>
                      <p className={labelClass}>Promoter Status</p>
                      <div className="flex items-center h-10">
                        <PromoterStatusBadge status={profile.promoter_status} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Member Since */}
                <div className="pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#7DD8E8]/70">Member since</span>
                    <span className="text-sm text-white/60">{fmtDate(profile?.member_since ?? null)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
