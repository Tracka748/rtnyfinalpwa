// app/promoter/apply/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PromoterApplicationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    business_name: '',
    contact_email: '',
    phone: '',
    website: '',
    instagram_handle: '',
    description: '',
    expected_events_per_month: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log('[Promoter Form] Submitting application:', formData);

    try {
      const res = await fetch('/api/v1/promoter/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      console.log('[Promoter Form] Response status:', res.status);

      const data = await res.json();
      console.log('[Promoter Form] Response data:', data);

      if (data.success) {
        window.location.href = '/promoter/apply/success';
      } else {
        // Handle specific error cases
        if (res.status === 401) {
          setError('You must be logged in to apply. Please sign in first.');
        } else {
          setError(data.error || 'Application failed. Please try again.');
        }
      }
    } catch (err) {
      console.error('[Promoter Form] Network error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Become a <span className="text-accent">Promoter</span>
          </h1>
          <p className="text-xl text-secondary">
            List your events on RTNY and reach thousands of Rochester locals
          </p>
        </div>

        {/* Benefits */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Promoter Benefits</h2>
          <div className="space-y-3">
            {[
              '🎯 Self-service event creation',
              '📊 Real-time sales analytics',
              '🎫 Integrated ticketing system',
              '📱 Mobile-optimized event pages',
              '💰 15% discount on all tickets',
              '⭐ Priority placement for featured events',
            ].map((benefit, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl">{benefit.split(' ')[0]}</span>
                <span>{benefit.split(' ').slice(1).join(' ')}</span>
              </div>
            ))}
          </div>
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
                    className="inline-block mt-3 text-sm text-accent hover:underline"
                  >
                    Click here to sign in →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
            <h2 className="text-2xl font-bold">Application Details</h2>

            {/* Business Name */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Business/Organization Name *
              </label>
              <input
                type="text"
                required
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="ROC Events Co."
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Contact Email *
              </label>
              <input
                type="email"
                required
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="promoter@example.com"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(585) 555-0123"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://yoursite.com"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Instagram */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Instagram Handle
              </label>
              <div className="flex items-center gap-2">
                <span className="text-secondary">@</span>
                <input
                  type="text"
                  value={formData.instagram_handle}
                  onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                  placeholder="rocevents"
                  className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Tell us about your events *
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What types of events do you organize? What makes them special?"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors resize-none"
              />
            </div>

            {/* Expected Events */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Expected Events Per Month *
              </label>
              <select
                required
                value={formData.expected_events_per_month}
                onChange={(e) => setFormData({ ...formData, expected_events_per_month: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
              >
                <option value={1}>1-2 events</option>
                <option value={3}>3-5 events</option>
                <option value={6}>6-10 events</option>
                <option value={11}>10+ events</option>
              </select>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-8 py-4 bg-accent text-background rounded-full font-bold text-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Submitting...</span>
              </>
            ) : (
              'Submit Application'
            )}
          </button>

          <p className="text-sm text-secondary text-center">
            We'll review your application within 24-48 hours and send you an email.
          </p>
        </form>
      </div>
    </div>
  );
}
