'use client';

import { useState } from 'react';

interface PromoCodeGeneratorProps {
  eventId: string;
  targetNeighborhoods: string[];
  targetVibes: string[];
  targetAgeRanges: string[];
  onCodeGenerated: (code: string) => void;
}

export function PromoCodeGenerator({
  eventId,
  targetNeighborhoods,
  targetVibes,
  targetAgeRanges,
  onCodeGenerated,
}: PromoCodeGeneratorProps) {
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!discountValue || !validUntil) {
      setError('Discount value and valid until date are required.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/admin/promo-codes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId || undefined,
          code: code || undefined,
          discount_type: discountType,
          discount_value: Number(discountValue),
          usage_limit: usageLimit ? Number(usageLimit) : undefined,
          valid_from: validFrom || undefined,
          valid_until: validUntil,
          target_neighborhoods: targetNeighborhoods,
          target_vibes: targetVibes,
          target_age_ranges: targetAgeRanges,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setGeneratedCode(data.data.promo_code.code);
        onCodeGenerated(data.data.promo_code.code);
      } else {
        setError(data.error ?? 'Failed to generate promo code.');
      }
    } catch {
      setError('Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const hasScope =
    targetNeighborhoods.length > 0 || targetVibes.length > 0 || targetAgeRanges.length > 0;

  return (
    <div className="bg-[#1a1a1d] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
      <h2 className="text-lg font-header font-bold text-white">Generate Promo Code</h2>

      {/* Row 1: Code input + Discount type */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
            Code (optional)
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Auto-generate"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
            Discount Type
          </label>
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            <button
              type="button"
              onClick={() => setDiscountType('percentage')}
              className={[
                'flex-1 py-2.5 text-sm font-medium transition-colors',
                discountType === 'percentage'
                  ? 'bg-[#59FFA0]/20 text-[#59FFA0]'
                  : 'text-[#7DD8E8] hover:bg-white/5',
              ].join(' ')}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => setDiscountType('fixed')}
              className={[
                'flex-1 py-2.5 text-sm font-medium transition-colors border-l border-white/10',
                discountType === 'fixed'
                  ? 'bg-[#59FFA0]/20 text-[#59FFA0]'
                  : 'text-[#7DD8E8] hover:bg-white/5',
              ].join(' ')}
            >
              $
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Discount value + Usage limit */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
            Discount Value
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder={discountType === 'percentage' ? '10' : '5.00'}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
            Usage Limit
          </label>
          <input
            type="number"
            min="1"
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder="Unlimited"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors"
          />
        </div>
      </div>

      {/* Row 3: Valid from + Valid until */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
            Valid From
          </label>
          <input
            type="date"
            aria-label="Valid From"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors [color-scheme:dark]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
            Valid Until *
          </label>
          <input
            type="date"
            aria-label="Valid Until"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#59FFA0]/50 transition-colors [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Audience scope preview */}
      <div className="space-y-2">
        <p className="text-xs text-[#7DD8E8] uppercase tracking-wider font-medium">
          Scoped to event audience
        </p>
        {hasScope ? (
          <div className="flex flex-wrap gap-1.5">
            {targetNeighborhoods.map((n) => (
              <span
                key={n}
                className="px-2.5 py-1 rounded-full text-xs border border-[#59FFA0]/30 text-[#59FFA0]/70 bg-[#59FFA0]/5"
              >
                {n.replace(/_/g, ' ')}
              </span>
            ))}
            {targetVibes.map((v) => (
              <span
                key={v}
                className="px-2.5 py-1 rounded-full text-xs border border-[#1AC8ED]/30 text-[#1AC8ED]/70 bg-[#1AC8ED]/5"
              >
                {v.replace(/_/g, ' ')}
              </span>
            ))}
            {targetAgeRanges.map((a) => (
              <span
                key={a}
                className="px-2.5 py-1 rounded-full text-xs border border-white/20 text-white/50 bg-white/5"
              >
                {a}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/30 italic">No targeting selected — will apply to all users</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Generate button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="w-full py-3 bg-[#59FFA0] text-[#121113] font-header font-bold rounded-xl hover:bg-[#59FFA0]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {loading ? 'Generating…' : 'Generate Promo Code'}
      </button>

      {/* Success state */}
      {generatedCode && (
        <div className="flex items-center justify-between gap-3 bg-[#59FFA0]/10 border border-[#59FFA0]/30 rounded-xl px-4 py-3">
          <span className="font-mono text-[#59FFA0] text-sm font-bold tracking-widest">
            {generatedCode}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#1AC8ED]/20 border border-[#1AC8ED]/30 text-[#1AC8ED] text-xs font-medium hover:bg-[#1AC8ED]/30 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}
