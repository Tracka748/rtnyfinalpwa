// app/promoter/apply/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PromoterApplicationPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    business_name: '',
    email: '',
    phone: '',
    social_media: '',
    promoter_type: '',
    toolkit_features: [] as string[],
    expected_volume: '',
    event_description: '',
  });

  const toggleFeature = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      toolkit_features: prev.toolkit_features.includes(feature)
        ? prev.toolkit_features.filter((f) => f !== feature)
        : [...prev.toolkit_features, feature],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Build enriched description from new fields
    const enrichedDescription = [
      formData.event_description,
      formData.promoter_type ? `\nRole: ${formData.promoter_type}` : '',
      formData.toolkit_features.length
        ? `\nToolkit interests: ${formData.toolkit_features.join(', ')}`
        : '',
      formData.expected_volume
        ? `\nExpected volume: ${formData.expected_volume}`
        : '',
    ]
      .join('')
      .trim();

    const payload = {
      business_name: formData.business_name,
      contact_email: formData.email,
      phone: formData.phone,
      website: formData.social_media,
      description: enrichedDescription,
      expected_events_per_month: 1,
    };

    console.log('[Partner Portal] Submitting application:', payload);

    try {
      const res = await fetch('/api/v1/promoter/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log('[Partner Portal] Response:', data);

      if (data.success) {
        window.location.href = '/promoter/apply/success';
      } else {
        if (res.status === 401) {
          setError('You must be logged in to apply. Please sign in first.');
        } else {
          setError(data.error || 'Application failed. Please try again.');
        }
      }
    } catch (err) {
      console.error('[Partner Portal] Network error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const lockIcon = (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd"
      />
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#121113] text-white">
      {/* Hero */}
      <div className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-header font-bold mb-6">
            <span className="text-[#007BFF]">Welcome</span> to the{' '}
            <span className="text-[#59FFA0]">RTNY Partner Portal</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            Join Rochester's premier event ecosystem and unlock powerful tools
            to grow your audience, boost sales, and collaborate with the
            community
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-20">
        {/* ── SECTION 1: Build Your RTNY Toolkit ──────────────────────── */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-header font-bold text-white mb-4">
              <span className="text-[#59FFA0]">🚀</span> Build Your{' '}
              <span className="text-[#007BFF]">RTNY Toolkit</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Access powerful features designed for promoters, venue owners, and
              event organizers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 relative hover:bg-white/[0.07] transition-all hover:border-[#59FFA0]/30 group">
              <div className="absolute top-4 right-4 text-gray-500 group-hover:text-[#59FFA0] transition-colors">
                {lockIcon}
              </div>
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-header font-bold text-white mb-2">
                Event Analytics Dashboard
              </h3>
              <p className="text-gray-400 text-sm">
                Real-time tracking of sales, attendee demographics, and
                performance metrics
              </p>
              <div className="mt-4 text-xs text-[#59FFA0] font-label uppercase tracking-wider">
                Unlocks after approval
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 relative hover:bg-white/[0.07] transition-all hover:border-[#007BFF]/30 group">
              <div className="absolute top-4 right-4 text-gray-500 group-hover:text-[#007BFF] transition-colors">
                {lockIcon}
              </div>
              <div className="text-4xl mb-4">🎫</div>
              <h3 className="text-xl font-header font-bold text-white mb-2">
                Instant QR Ticket Generator
              </h3>
              <p className="text-gray-400 text-sm">
                Fast-entry technology for seamless venue check-ins and crowd
                management
              </p>
              <div className="mt-4 text-xs text-[#007BFF] font-label uppercase tracking-wider">
                Unlocks after approval
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 relative hover:bg-white/[0.07] transition-all hover:border-[#59FFA0]/30 group">
              <div className="absolute top-4 right-4 text-gray-500 group-hover:text-[#59FFA0] transition-colors">
                {lockIcon}
              </div>
              <div className="text-4xl mb-4">🎰</div>
              <h3 className="text-xl font-header font-bold text-white mb-2">
                Sweepstakes Booster
              </h3>
              <p className="text-gray-400 text-sm">
                Run viral contests and giveaways to maximize reach and
                engagement
              </p>
              <div className="mt-4 text-xs text-[#59FFA0] font-label uppercase tracking-wider">
                Unlocks after approval
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 relative hover:bg-white/[0.07] transition-all hover:border-[#007BFF]/30 group">
              <div className="absolute top-4 right-4 text-gray-500 group-hover:text-[#007BFF] transition-colors">
                {lockIcon}
              </div>
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-header font-bold text-white mb-2">
                Revenue Split Tracker
              </h3>
              <p className="text-gray-400 text-sm">
                Automated profit sharing and transparent accounting for
                multi-partner events
              </p>
              <div className="mt-4 text-xs text-[#007BFF] font-label uppercase tracking-wider">
                Unlocks after approval
              </div>
            </div>

            {/* Card 5 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 relative hover:bg-white/[0.07] transition-all hover:border-[#59FFA0]/30 group">
              <div className="absolute top-4 right-4 text-gray-500 group-hover:text-[#59FFA0] transition-colors">
                {lockIcon}
              </div>
              <div className="text-4xl mb-4">📲</div>
              <h3 className="text-xl font-header font-bold text-white mb-2">
                Push Notification Blasts
              </h3>
              <p className="text-gray-400 text-sm">
                Direct-to-phone marketing campaigns to engage your followers
                instantly
              </p>
              <div className="mt-4 text-xs text-[#59FFA0] font-label uppercase tracking-wider">
                Unlocks after approval
              </div>
            </div>

            {/* Card 6 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 relative hover:bg-white/[0.07] transition-all hover:border-[#007BFF]/30 group">
              <div className="absolute top-4 right-4 text-gray-500 group-hover:text-[#007BFF] transition-colors">
                {lockIcon}
              </div>
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-header font-bold text-white mb-2">
                Multi-Promoter Collaboration
              </h3>
              <p className="text-gray-400 text-sm">
                Partner with other promoters to share audiences, risks, and
                profits
              </p>
              <div className="mt-4 text-xs text-[#007BFF] font-label uppercase tracking-wider">
                Unlocks after approval
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: The RTNY Loyalty & Marketing Ecosystem ────────── */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-header font-bold text-white mb-4">
              <span className="text-[#59FFA0]">🔥</span> The{' '}
              <span className="text-[#007BFF]">RTNY</span> Loyalty & Marketing Ecosystem
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              More than just tools — join a community-driven platform where
              success is rewarded
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* The Lit Board */}
            <div className="bg-gradient-to-br from-[#59FFA0]/10 to-[#007BFF]/10 border border-[#59FFA0]/30 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">🔥</div>
                <h3 className="text-2xl font-header font-bold text-white">
                  The Lit Board
                </h3>
              </div>
              <p className="text-gray-300 mb-4">
                Real-time leaderboard showcasing the hottest venues, events, and
                promoters across Rochester. Top performers get featured
                placement and increased visibility.
              </p>
              <div className="flex gap-2 text-sm">
                <span className="px-3 py-1 bg-[#59FFA0]/20 text-[#59FFA0] rounded-full">
                  Live Rankings
                </span>
                <span className="px-3 py-1 bg-[#007BFF]/20 text-[#007BFF] rounded-full">
                  Featured Spots
                </span>
              </div>
            </div>

            {/* Reward Points */}
            <div className="bg-gradient-to-br from-[#007BFF]/10 to-[#59FFA0]/10 border border-[#007BFF]/30 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">⭐</div>
                <h3 className="text-2xl font-header font-bold text-white">
                  Reward Points System
                </h3>
              </div>
              <p className="text-gray-300 mb-4">
                Earn points for every ticket sold. Redeem for sponsored ads,
                lower platform fees, premium features, and exclusive marketplace
                perks.
              </p>
              <div className="flex gap-2 text-sm">
                <span className="px-3 py-1 bg-[#007BFF]/20 text-[#007BFF] rounded-full">
                  Earn & Redeem
                </span>
                <span className="px-3 py-1 bg-[#59FFA0]/20 text-[#59FFA0] rounded-full">
                  Lower Fees
                </span>
              </div>
            </div>

            {/* Achievement Badges */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">🏆</div>
                <h3 className="text-2xl font-header font-bold text-white">
                  Achievement Badges
                </h3>
              </div>
              <p className="text-gray-300 mb-4">
                Unlock visual achievements like "Sell-Out King," "Community
                Pillar," or "Rising Star" that appear on your promoter profile
                and build credibility.
              </p>
              <div className="flex gap-2 text-sm">
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full">
                  Profile Badges
                </span>
                <span className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full">
                  Social Proof
                </span>
              </div>
            </div>

            {/* Multi-Promoter */}
            <div className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/30 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">🤝</div>
                <h3 className="text-2xl font-header font-bold text-white">
                  Multi-Promoter Ecosystem
                </h3>
              </div>
              <p className="text-gray-300 mb-4">
                Collaborate on events with other promoters. Share audiences,
                split risks, combine marketing power, and reach new demographics
                together.
              </p>
              <div className="flex gap-2 text-sm">
                <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full">
                  Co-Promotion
                </span>
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full">
                  Shared Revenue
                </span>
              </div>
            </div>
          </div>

          {/* Stats Banner */}
          <div className="mt-12 bg-white/5 border border-white/10 rounded-xl p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-[#59FFA0] mb-1">
                  10K+
                </div>
                <div className="text-sm text-gray-400">Active Users</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#007BFF] mb-1">
                  500+
                </div>
                <div className="text-sm text-gray-400">Partner Venues</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#59FFA0] mb-1">
                  2K+
                </div>
                <div className="text-sm text-gray-400">Events Hosted</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#007BFF] mb-1">
                  $2M+
                </div>
                <div className="text-sm text-gray-400">Tickets Sold</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: The Intelligent Application ───────────────────── */}
        <section className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-header font-bold text-white mb-4">
              <span className="text-[#59FFA0]">🚀</span>{' '}
              <span className="text-[#007BFF]">Launch</span> Your Partnership
            </h2>
            <p className="text-xl text-gray-400">
              Tell us about your events and we'll unlock your custom toolkit
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-semibold">Application Error</p>
                  <p className="text-sm mt-1">{error}</p>
                  {error.includes('logged in') && (
                    <Link
                      href="/login?redirect=/promoter/apply"
                      className="inline-block mt-3 text-sm text-[#59FFA0] hover:underline"
                    >
                      Click here to sign in →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Business Information */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-8">
              <h3 className="text-xl font-header font-bold text-white mb-6 flex items-center gap-2">
                <span className="text-[#007BFF]">📋</span> Business Information
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-label text-gray-300 mb-2 uppercase tracking-wider">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.business_name}
                    onChange={(e) =>
                      setFormData({ ...formData, business_name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-[#59FFA0] focus:ring-1 focus:ring-[#59FFA0] focus:outline-none transition-colors"
                    placeholder="Your business or brand name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-label text-gray-300 mb-2 uppercase tracking-wider">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-[#59FFA0] focus:ring-1 focus:ring-[#59FFA0] focus:outline-none transition-colors"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-label text-gray-300 mb-2 uppercase tracking-wider">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-[#59FFA0] focus:ring-1 focus:ring-[#59FFA0] focus:outline-none transition-colors"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-label text-gray-300 mb-2 uppercase tracking-wider">
                    Social Media Links
                  </label>
                  <input
                    type="text"
                    value={formData.social_media}
                    onChange={(e) =>
                      setFormData({ ...formData, social_media: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-[#59FFA0] focus:ring-1 focus:ring-[#59FFA0] focus:outline-none transition-colors"
                    placeholder="Instagram, TikTok, Facebook, etc."
                  />
                </div>
              </div>
            </div>

            {/* Event Focus */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-8">
              <h3 className="text-xl font-header font-bold text-white mb-6 flex items-center gap-2">
                <span className="text-[#59FFA0]">🎯</span> Your Event Focus
              </h3>

              <div className="space-y-6">
                {/* I am a... */}
                <div>
                  <label className="block text-sm font-label text-gray-300 mb-2 uppercase tracking-wider">
                    I am a... *
                  </label>
                  <select
                    required
                    value={formData.promoter_type}
                    onChange={(e) =>
                      setFormData({ ...formData, promoter_type: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-[#1a1a1c] border border-white/10 rounded-lg text-white focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF] focus:outline-none transition-colors"
                  >
                    <option value="">Select your role...</option>
                    <option value="nightlife">🎉 Nightlife Promoter</option>
                    <option value="venue">🏢 Venue Owner/GM</option>
                    <option value="athletics">⚽ High School/Collegiate Athletics</option>
                    <option value="theater">🎭 Theater/Arts Organization</option>
                    <option value="nonprofit">❤️ Non-Profit/Community Group</option>
                  </select>
                </div>

                {/* Build Your Toolkit */}
                <div>
                  <label className="block text-sm font-label text-gray-300 mb-3 uppercase tracking-wider">
                    Build Your Toolkit (Select all that apply) *
                  </label>
                  <div className="space-y-3">
                    {[
                      {
                        id: 'digital_ticketing',
                        label: '🎫 Digital Ticketing & QR Codes',
                        desc: 'Instant ticket generation and scanning',
                      },
                      {
                        id: 'marketing',
                        label: '📱 Marketing & Promo Tools',
                        desc: 'Push notifications, sweepstakes, social sharing',
                      },
                      {
                        id: 'reserved_seating',
                        label: '💺 Reserved Seating Management',
                        desc: 'Seat maps, VIP sections, table reservations',
                      },
                      {
                        id: 'revenue_split',
                        label: '💰 Revenue Splitting & Analytics',
                        desc: 'Multi-promoter profit sharing, detailed reports',
                      },
                      {
                        id: 'staffing',
                        label: '👥 On-Site Staffing Coordination',
                        desc: 'Check-in teams, security coordination, volunteer management',
                      },
                    ].map(({ id, label, desc }) => (
                      <label
                        key={id}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/[0.07] transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.toolkit_features.includes(id)}
                          onChange={() => toggleFeature(id)}
                          className="w-5 h-5 rounded border-gray-600 text-[#59FFA0] focus:ring-[#59FFA0] focus:ring-offset-0 bg-white/5 accent-[#59FFA0]"
                        />
                        <div>
                          <div className="text-white font-medium">{label}</div>
                          <div className="text-sm text-gray-400">{desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Expected Volume */}
                <div>
                  <label className="block text-sm font-label text-gray-300 mb-2 uppercase tracking-wider">
                    Expected Monthly Volume *
                  </label>
                  <select
                    required
                    value={formData.expected_volume}
                    onChange={(e) =>
                      setFormData({ ...formData, expected_volume: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-[#1a1a1c] border border-white/10 rounded-lg text-white focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF] focus:outline-none transition-colors"
                  >
                    <option value="">Select expected volume...</option>
                    <option value="0-100">0–100 tickets/month</option>
                    <option value="100-500">100–500 tickets/month</option>
                    <option value="500-1000">500–1,000 tickets/month</option>
                    <option value="1000-5000">1,000–5,000 tickets/month</option>
                    <option value="5000+">5,000+ tickets/month</option>
                  </select>
                </div>

                {/* Tell us about your events */}
                <div>
                  <label className="block text-sm font-label text-gray-300 mb-2 uppercase tracking-wider">
                    Tell Us About Your Events *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.event_description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        event_description: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-[#59FFA0] focus:ring-1 focus:ring-[#59FFA0] focus:outline-none transition-colors resize-none"
                    placeholder="What makes your events special? Are you looking to collaborate with other promoters? Tell us about your vision..."
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    Share your event style, target audience, unique selling
                    points, or collaboration interests
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="text-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-12 py-4 bg-[#59FFA0] text-black text-lg font-bold rounded-xl hover:bg-[#59FFA0]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center gap-3 justify-center">
                    <span>🚀</span>
                    Claim My Toolkit
                  </span>
                )}
              </button>

              <p className="mt-4 text-sm text-gray-400">
                Our team reviews applications within 24–48 hours to ensure the
                best fit for the RTNY ecosystem
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
