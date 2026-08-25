'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

interface Modules {
  about: boolean;
  upcoming_events: boolean;
  gallery: boolean;
  rewards_offers: boolean;
  plan_your_event: boolean;
  activity_feed: boolean;
  experiences: boolean;
}

const MODULE_ROWS: { key: keyof Modules; label: string }[] = [
  { key: 'about',           label: 'About' },
  { key: 'upcoming_events', label: 'Upcoming Events' },
  { key: 'gallery',         label: 'Gallery' },
  { key: 'rewards_offers',  label: 'Rewards & Offers' },
  { key: 'plan_your_event', label: 'Plan Your Event' },
  { key: 'activity_feed',   label: 'Activity Feed' },
  { key: 'experiences',     label: 'Experiences' },
];

const DEFAULT_MODULES: Modules = {
  about: true,
  upcoming_events: true,
  gallery: false,
  rewards_offers: false,
  plan_your_event: false,
  activity_feed: false,
  experiences: false,
};

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${
        value ? 'bg-[#59FFA0]' : 'bg-white/20'
      }`}
    >
      <span
        className={`absolute top-[3px] w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
          value ? 'translate-x-5' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

export default function PartnerEditPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [noPartner, setNoPartner] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Read-only info
  const [partnerType, setPartnerType] = useState('');
  const [verified, setVerified] = useState(false);
  const [supporterCount, setSupporterCount] = useState(0);

  // Editable fields
  const [displayName, setDisplayName] = useState('');
  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [category, setCategory] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [modules, setModules] = useState<Modules>({ ...DEFAULT_MODULES });
  const [requiresPhotoVerifiedTags, setRequiresPhotoVerifiedTags] = useState(false);
  const [themes, setThemes] = useState<{ id: string; name: string }[]>([]);
  const [taggedThemeIds, setTaggedThemeIds] = useState<Set<string>>(new Set());
  const [themeUpdating, setThemeUpdating] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: partner, error } = await supabase
        .from('partners')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (error || !partner) {
        setNoPartner(true);
        setLoading(false);
        return;
      }

      setPartnerId(partner.id);
      setPartnerType(partner.partner_type ?? '');
      setVerified(partner.verified ?? false);
      setSupporterCount(partner.supporter_count ?? 0);
      setDisplayName(partner.display_name ?? '');
      setTagline(partner.tagline ?? '');
      setBio(partner.bio ?? '');
      setCategory(partner.category ?? '');
      setContactEmail(partner.contact_email ?? '');
      setContactPhone(partner.contact_phone ?? '');
      setWebsiteUrl(partner.website_url ?? '');
      setLogoUrl(partner.logo_url ?? '');
      setCoverImageUrl(partner.cover_image_url ?? '');
      setModules({ ...DEFAULT_MODULES, ...((partner.visible_modules as Partial<Modules>) ?? {}) });
      setRequiresPhotoVerifiedTags(partner.requires_photo_verified_tags ?? false);

      const [themesRes, tagsRes] = await Promise.all([
        fetch('/api/v1/themes').then(r => r.json()),
        fetch(`/api/v1/partners/${partner.id}/theme-tags`).then(r => r.json()),
      ]);
      setThemes(themesRes.data || []);
      setTaggedThemeIds(new Set((tagsRes.data || []).map((t: { theme_id: string }) => t.theme_id)));

      setLoading(false);
    }

    load();
  }, [router]);

  function toggleModule(key: keyof Modules) {
    setModules(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function toggleTheme(themeId: string, isTagged: boolean) {
    if (!partnerId) return;
    setThemeUpdating(themeId);
    try {
      if (isTagged) {
        await fetch(`/api/v1/partners/${partnerId}/theme-tags?theme_id=${themeId}`, { method: 'DELETE' });
        setTaggedThemeIds(prev => {
          const next = new Set(prev);
          next.delete(themeId);
          return next;
        });
      } else {
        const res = await fetch(`/api/v1/partners/${partnerId}/theme-tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme_id: themeId }),
        });
        const data = await res.json();
        if (data.success) {
          setTaggedThemeIds(prev => new Set(prev).add(themeId));
        } else {
          setToast({ type: 'error', message: data.error ?? 'Failed to update theme tag' });
        }
      }
    } catch {
      setToast({ type: 'error', message: 'Unexpected error updating theme tag.' });
    } finally {
      setThemeUpdating(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partnerId) return;
    setSubmitting(true);
    setToast(null);

    try {
      const res = await fetch(`/api/v1/partners/${partnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          tagline: tagline || null,
          bio: bio || null,
          category: category || null,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          website_url: websiteUrl || null,
          logo_url: logoUrl || null,
          cover_image_url: coverImageUrl || null,
          visible_modules: modules,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setToast({ type: 'success', message: 'Changes saved!' });
      } else {
        setToast({ type: 'error', message: data.error ?? 'Failed to save changes' });
      }
    } catch {
      setToast({ type: 'error', message: 'Unexpected error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121113] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#59FFA0]/30 border-t-[#59FFA0] animate-spin" />
      </div>
    );
  }

  if (noPartner) {
    return (
      <div className="min-h-screen bg-[#121113] flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-white text-lg font-header">You don&apos;t have a partner profile yet.</p>
          <p className="text-[#A0A0A0] text-sm">Contact RTNY admin to get set up.</p>
          <a href="/dashboard" className="text-[#59FFA0] text-sm hover:underline block mt-4">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121113] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <a href="/dashboard" className="text-[#7DD8E8] hover:text-white transition-colors text-sm">
            ← Dashboard
          </a>
          <h1 className="text-2xl font-header font-bold text-white">My Partner Profile</h1>
          {partnerId && (
            <a
              href={`/partners/${partnerId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-sm text-[#1AC8ED] hover:underline"
            >
              View Public Page →
            </a>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={[
              'p-4 rounded-xl border text-sm font-medium',
              toast.type === 'success'
                ? 'bg-[#59FFA0]/10 border-[#59FFA0]/30 text-[#59FFA0]'
                : 'bg-red-500/10 border-red-500/30 text-red-400',
            ].join(' ')}
          >
            {toast.message}
          </div>
        )}

        {/* Read-only info */}
        <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-6 flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-[10px] text-[#7DD8E8] uppercase tracking-wider font-label mb-1">Partner Type</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#59FFA0]/10 text-[#59FFA0] border border-[#59FFA0]/20 font-label uppercase tracking-wider">
              {partnerType}
            </span>
          </div>
          <div>
            <p className="text-[10px] text-[#7DD8E8] uppercase tracking-wider font-label mb-1">Verification</p>
            {verified ? (
              <p className="text-xs text-[#59FFA0] font-medium">✓ Verified</p>
            ) : (
              <p className="text-xs text-white/40">Pending Verification</p>
            )}
          </div>
          <div>
            <p className="text-[10px] text-[#7DD8E8] uppercase tracking-wider font-label mb-1">Supporters</p>
            <p className="text-sm font-bold text-white">{supporterCount}</p>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-header font-bold text-white">Profile Details</h2>

            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Display Name *
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                placeholder="Short catchy description"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Live Music, Restaurant, DJ"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Contact Phone
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Website URL
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Logo URL
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
                Cover Image URL
              </label>
              <input
                type="url"
                value={coverImageUrl}
                onChange={e => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
              />
            </div>
          </div>

          {/* Visible Modules */}
          <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-header font-bold text-white">Profile Sections</h2>
              <p className="text-sm text-[#7DD8E8] mt-1">
                Choose which sections appear on your public profile
              </p>
            </div>
            <div className="space-y-2">
              {MODULE_ROWS.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3"
                >
                  <span className="text-sm text-white">{label}</span>
                  <Toggle value={modules[key]} onChange={() => toggleModule(key)} />
                </div>
              ))}
            </div>
          </div>

          {/* Themes */}
          <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-header font-bold text-white">Themes</h2>
              <p className="text-sm text-[#7DD8E8] mt-1">
                Tag the themes your venue/service fits — helps promoters find you for themed events
              </p>
            </div>
            {requiresPhotoVerifiedTags ? (
              <p className="text-sm text-white/40">
                Theme tagging for this partner type requires photo verification — coming soon.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {themes.map((theme) => {
                  const isTagged = taggedThemeIds.has(theme.id);
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      disabled={themeUpdating === theme.id}
                      onClick={() => toggleTheme(theme.id, isTagged)}
                      className={[
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all disabled:opacity-50',
                        isTagged
                          ? 'bg-[#59FFA0]/20 border-[#59FFA0] text-[#59FFA0]'
                          : 'border-white/20 text-[#7DD8E8] hover:border-white/40',
                      ].join(' ')}
                    >
                      {theme.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !displayName}
            className="w-full py-3 bg-[#59FFA0] text-[#121113] font-header font-bold rounded-xl hover:bg-[#59FFA0]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
