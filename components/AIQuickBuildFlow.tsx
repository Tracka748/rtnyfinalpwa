'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EventFlyerPreview } from '@/components/EventFlyerPreview';

type Category = 'nightlife' | 'sports' | 'arts' | 'family' | 'movies' | 'dining';

const STYLE_MAP: Record<string, string> = {
  nightlife: 'urbanNeon',
  sports: 'sportsPremium',
  arts: 'theaterElegant',
  family: 'familyFun',
  movies: 'theaterElegant',
  dining: 'luxuryGold',
};

const CATEGORY_OPTIONS: { value: Category; icon: string; label: string }[] = [
  { value: 'nightlife', icon: '🎉', label: 'Nightlife' },
  { value: 'sports', icon: '⚽', label: 'Sports' },
  { value: 'arts', icon: '🎨', label: 'Arts' },
  { value: 'family', icon: '👨‍👩‍👧‍👦', label: 'Family' },
  { value: 'movies', icon: '🎬', label: 'Movies' },
  { value: 'dining', icon: '🍽️', label: 'Dining' },
];

interface GeneratedContent {
  titles: string[];
  description: string;
  highlights: string[];
  pricing: {
    early_bird: number;
    general: number;
    vip: number;
  };
  addons: { name: string; description: string; price: number }[];
  marketing: {
    instagram: string;
    email_subject: string;
  };
}

type Step = 'input' | 'generating' | 'preview';

export function AIQuickBuildFlow({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('input');
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(0);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [backgroundGenerating, setBackgroundGenerating] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    eventName: '',
    venue: '',
    date: '',
    time: '',
    category: 'nightlife' as Category,
    vibe: '',
    expectedAttendance: '100-200',
  });

  async function handleGenerate() {
    if (!formData.eventName || !formData.venue) return;
    setStep('generating');
    setError('');

    try {
      const contentRes = await fetch('/api/v1/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const contentData = await contentRes.json();

      if (!contentData.success) {
        throw new Error(contentData.error || 'Content generation failed');
      }
      setGeneratedContent(contentData.data);

      // Generate background in parallel (non-blocking for preview)
      setBackgroundGenerating(true);
      fetch('/api/v1/ai/generate-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: STYLE_MAP[formData.category] || 'urbanNeon',
        }),
      })
        .then((r) => r.json())
        .then((bg) => {
          if (bg.success) setBackgroundUrl(bg.data.imageUrl);
        })
        .catch(console.error)
        .finally(() => setBackgroundGenerating(false));

      setStep('preview');
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Generation failed. Please try again.');
      setStep('input');
    }
  }

  async function regenerateBackground() {
    setBackgroundGenerating(true);
    try {
      const res = await fetch('/api/v1/ai/generate-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: STYLE_MAP[formData.category] || 'urbanNeon',
        }),
      });
      const data = await res.json();
      if (data.success) setBackgroundUrl(data.data.imageUrl);
    } catch (err) {
      console.error('Background regen error:', err);
    } finally {
      setBackgroundGenerating(false);
    }
  }

  async function handleSaveDraft() {
    if (!generatedContent) return;
    setSaving(true);

    try {
      const eventDate =
        formData.date && formData.time
          ? `${formData.date}T${formData.time}:00`
          : formData.date
          ? `${formData.date}T20:00:00`
          : null;

      const eventData = {
        name: generatedContent.titles[selectedTitleIndex] || formData.eventName,
        category: formData.category,
        event_date: eventDate,
        description: generatedContent.description,
        venue_name: formData.venue,
        total_tickets: 200,
        ticket_prices: {
          early_bird: generatedContent.pricing.early_bird,
          general_admission: generatedContent.pricing.general,
          vip: generatedContent.pricing.vip,
        },
        flyer_image_url: backgroundUrl || null,
      };

      const res = await fetch('/api/v1/promoter/events/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/promoter/events/create?draft=${data.data.id}`);
      } else {
        throw new Error(data.error || 'Failed to save draft');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save draft. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // STEP: INPUT
  if (step === 'input') {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-[#7DD8E8] hover:text-white transition-colors mb-8"
          >
            ← Back to options
          </button>

          <h1 className="text-3xl font-bold mb-2">AI Quick Build</h1>
          <p className="text-[#7DD8E8] mb-8">
            Tell us about your event and AI will create a complete package in seconds.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Event Name */}
            <div>
              <label className="block text-sm font-semibold mb-2">Event Name *</label>
              <input
                type="text"
                value={formData.eventName}
                onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                placeholder="e.g., Summer Rooftop Party"
                className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Venue */}
            <div>
              <label className="block text-sm font-semibold mb-2">Venue *</label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                placeholder="e.g., The Underground Lounge, Rochester NY"
                className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Time</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold mb-3">Category *</label>
              <div className="grid grid-cols-3 gap-3">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.value })}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      formData.category === cat.value
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <div className="text-2xl mb-1">{cat.icon}</div>
                    <div className="text-xs font-semibold">{cat.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Vibe (optional) */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Vibe / Atmosphere{' '}
                <span className="text-[#7DD8E8] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.vibe}
                onChange={(e) => setFormData({ ...formData, vibe: e.target.value })}
                placeholder="e.g., upscale, underground, family-friendly, hype..."
                className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!formData.eventName || !formData.venue}
              className="w-full py-4 bg-gradient-to-r from-[#59FFA0] to-[#1AC8ED] text-black font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              ✨ Generate Event with AI
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP: GENERATING
  if (step === 'generating') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="w-24 h-24 border-4 border-[#59FFA0]/20 rounded-full" />
            <div className="absolute inset-0 w-24 h-24 border-4 border-t-[#59FFA0] rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-3xl">✨</div>
          </div>
          <h2 className="text-2xl font-bold mb-3">Creating Your Event...</h2>
          <p className="text-[#7DD8E8]">AI is crafting titles, descriptions, and pricing</p>
        </div>
      </div>
    );
  }

  // STEP: PREVIEW
  if (!generatedContent) return null;

  const selectedTitle = generatedContent.titles[selectedTitleIndex] || formData.eventName;
  const displayDate =
    formData.date
      ? new Date(`${formData.date}T12:00:00`).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      : 'Date TBD';

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Your Event is Ready!</h1>
            <p className="text-[#7DD8E8]">Review and customize below, then save as draft</p>
          </div>
          <button
            onClick={() => setStep('input')}
            className="text-sm text-[#7DD8E8] hover:text-white transition-colors"
          >
            ← Edit Details
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: Flyer Preview */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Flyer Preview</h2>
              {backgroundGenerating ? (
                <span className="text-xs text-[#59FFA0] flex items-center gap-2">
                  <span className="w-3 h-3 border border-t-[#59FFA0] rounded-full animate-spin" />
                  Generating background...
                </span>
              ) : (
                <button
                  onClick={regenerateBackground}
                  className="text-xs text-[#59FFA0] hover:text-[#59FFA0]/80 transition-colors"
                >
                  🔄 New Background
                </button>
              )}
            </div>
            <EventFlyerPreview
              backgroundUrl={backgroundUrl}
              eventName={selectedTitle}
              date={displayDate}
              venue={formData.venue}
              ticketPrice={generatedContent.pricing.general}
              category={formData.category}
            />
          </div>

          {/* RIGHT: Customization */}
          <div className="space-y-6">
            {/* Title Selection */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold mb-4">Choose a Title</h3>
              <div className="space-y-3">
                {generatedContent.titles.map((title, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedTitleIndex(i)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      selectedTitleIndex === i
                        ? 'border-accent bg-accent/10 text-white'
                        : 'border-border hover:border-accent/50 text-[#7DD8E8]'
                    }`}
                  >
                    {title}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold mb-3">AI-Generated Description</h3>
              <p className="text-[#7DD8E8] text-sm leading-relaxed">
                {generatedContent.description}
              </p>
            </div>

            {/* Highlights */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold mb-3">Event Highlights</h3>
              <ul className="space-y-2">
                {generatedContent.highlights.map((h, i) => (
                  <li key={i} className="text-sm text-[#7DD8E8]">
                    {h}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold mb-4">Suggested Pricing</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-background rounded-xl p-3">
                  <div className="text-xs text-[#7DD8E8] mb-1">Early Bird</div>
                  <div className="text-xl font-bold text-[#59FFA0]">
                    ${generatedContent.pricing.early_bird}
                  </div>
                </div>
                <div className="bg-background rounded-xl p-3 border border-accent/30">
                  <div className="text-xs text-[#7DD8E8] mb-1">General</div>
                  <div className="text-xl font-bold text-white">
                    ${generatedContent.pricing.general}
                  </div>
                </div>
                <div className="bg-background rounded-xl p-3">
                  <div className="text-xs text-[#7DD8E8] mb-1">VIP</div>
                  <div className="text-xl font-bold text-[#1AC8ED]">
                    ${generatedContent.pricing.vip}
                  </div>
                </div>
              </div>
            </div>

            {/* Marketing Copy */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold mb-3">Marketing Copy</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-[#7DD8E8] uppercase tracking-wider mb-1">
                    Instagram Caption
                  </div>
                  <p className="text-sm bg-background rounded-lg p-3">
                    {generatedContent.marketing.instagram}
                  </p>
                </div>
                <div>
                  <div className="text-xs text-[#7DD8E8] uppercase tracking-wider mb-1">
                    Email Subject Line
                  </div>
                  <p className="text-sm bg-background rounded-lg p-3">
                    {generatedContent.marketing.email_subject}
                  </p>
                </div>
              </div>
            </div>

            {/* Save CTA */}
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="w-full py-4 bg-gradient-to-r from-[#59FFA0] to-[#1AC8ED] text-black font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {saving ? 'Saving...' : '💾 Save as Draft & Continue Editing'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
