'use client';

import { useState, useEffect, useRef } from 'react';

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  usage_limit: number | null;
  usage_count: number;
  valid_from: string;
  valid_until: string;
  active: boolean;
  created_at: string;
}

interface FormErrors {
  code?: string;
  discount_type?: string;
  discount_value?: string;
  valid_until?: string;
  general?: string;
}

const today = new Date().toISOString().slice(0, 10);

function ActiveToggle({
  code,
  onChange,
}: {
  code: PromoCode;
  onChange: (id: string, active: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/promoter/promo-codes/${code.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !code.active }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        onChange(code.id, !code.active);
      }
    } catch {
      // silent — UI stays as-is on failure
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-label={code.active ? 'Deactivate' : 'Activate'}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        code.active
          ? 'bg-[#59FFA0] focus-visible:outline-[#59FFA0]'
          : 'bg-white/20 focus-visible:outline-white/40',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200',
          code.active ? 'translate-x-[18px]' : 'translate-x-[3px]',
        ].join(' ')}
      />
    </button>
  );
}

export default function PromoterPromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(true);

  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    loadCodes();
  }, []);

  async function loadCodes() {
    setLoadingCodes(true);
    try {
      const res = await fetch('/api/v1/promoter/promo-codes');
      const json = await res.json();
      if (res.ok && json.success) setCodes(json.data ?? []);
    } catch {
      // leave empty
    } finally {
      setLoadingCodes(false);
    }
  }

  function validate(fd: FormData): FormErrors {
    const errs: FormErrors = {};
    const code = (fd.get('code') as string)?.trim().toUpperCase();
    const discountType = fd.get('discount_type') as string;
    const discountValue = Number(fd.get('discount_value'));
    const validUntil = fd.get('valid_until') as string;

    if (!code) {
      errs.code = 'Code is required';
    } else if (!/^[A-Z0-9-]+$/.test(code)) {
      errs.code = 'Only uppercase letters, numbers, and hyphens allowed';
    }

    if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
      errs.discount_type = 'Select a discount type';
    }

    if (!fd.get('discount_value') || isNaN(discountValue) || discountValue <= 0) {
      errs.discount_value = 'Enter a positive number';
    } else if (discountType === 'percentage' && discountValue > 100) {
      errs.discount_value = 'Percentage cannot exceed 100';
    }

    if (!validUntil) {
      errs.valid_until = 'Expiry date is required';
    } else if (validUntil < today) {
      errs.valid_until = 'Expiry date must be today or later';
    }

    return errs;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    const errs = validate(fd);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const body = {
        code: (fd.get('code') as string).trim().toUpperCase(),
        discount_type: fd.get('discount_type'),
        discount_value: Number(fd.get('discount_value')),
        valid_from: fd.get('valid_from') || undefined,
        valid_until: fd.get('valid_until'),
        usage_limit: fd.get('usage_limit') ? Number(fd.get('usage_limit')) : undefined,
      };

      const res = await fetch('/api/v1/promoter/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok) {
        setErrors({ general: json.error || 'Failed to create promo code' });
        return;
      }

      setSuccess(true);
      setErrors({});
      formRef.current?.reset();
      // Prepend new code to list
      if (json.data) {
        setCodes(prev => [json.data, ...prev]);
      }
    } catch {
      setErrors({ general: 'Network error — please try again' });
    } finally {
      setSubmitting(false);
    }
  }

  function handleToggle(id: string, active: boolean) {
    setCodes(prev => prev.map(c => (c.id === id ? { ...c, active } : c)));
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#59FFA0]/50 focus:bg-white/[0.08] transition-colors';
  const labelClass = 'block text-xs font-medium text-[#7DD8E8] mb-1.5';
  const errorClass = 'mt-1 text-xs text-red-400';

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* ── CREATE FORM ──────────────────────────────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h1 className="text-lg font-semibold text-white mb-1">Create Promo Code</h1>
        <p className="text-sm text-[#7DD8E8] mb-6">
          New codes are active immediately and scoped to your account.
        </p>

        {success && (
          <div className="mb-5 p-3 bg-[#59FFA0]/10 border border-[#59FFA0]/30 rounded-lg text-sm text-[#59FFA0]">
            Promo code created successfully!
          </div>
        )}

        {errors.general && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {errors.general}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label htmlFor="code" className={labelClass}>
                Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                placeholder="SUMMER20"
                autoComplete="off"
                onChange={e => {
                  e.target.value = e.target.value.toUpperCase();
                }}
                className={`${inputClass} ${errors.code ? 'border-red-500/50' : ''}`}
              />
              {errors.code && <p className={errorClass}>{errors.code}</p>}
            </div>

            {/* Discount Type */}
            <div>
              <label htmlFor="discount_type" className={labelClass}>
                Discount Type
              </label>
              <select
                id="discount_type"
                name="discount_type"
                defaultValue=""
                className={`${inputClass} ${errors.discount_type ? 'border-red-500/50' : ''}`}
              >
                <option value="" disabled>Select type…</option>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
              {errors.discount_type && <p className={errorClass}>{errors.discount_type}</p>}
            </div>

            {/* Discount Value */}
            <div>
              <label htmlFor="discount_value" className={labelClass}>
                Discount Value
              </label>
              <input
                id="discount_value"
                name="discount_value"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="10"
                className={`${inputClass} ${errors.discount_value ? 'border-red-500/50' : ''}`}
              />
              {errors.discount_value && <p className={errorClass}>{errors.discount_value}</p>}
            </div>

            {/* Usage Limit */}
            <div>
              <label htmlFor="usage_limit" className={labelClass}>
                Usage Limit{' '}
                <span className="text-white/30 font-normal">(optional)</span>
              </label>
              <input
                id="usage_limit"
                name="usage_limit"
                type="number"
                min="1"
                step="1"
                placeholder="Unlimited"
                className={inputClass}
              />
            </div>

            {/* Valid From */}
            <div>
              <label htmlFor="valid_from" className={labelClass}>
                Valid From{' '}
                <span className="text-white/30 font-normal">(optional — defaults to now)</span>
              </label>
              <input
                id="valid_from"
                name="valid_from"
                type="date"
                min={today}
                className={inputClass}
              />
            </div>

            {/* Valid Until */}
            <div>
              <label htmlFor="valid_until" className={labelClass}>
                Valid Until
              </label>
              <input
                id="valid_until"
                name="valid_until"
                type="date"
                min={today}
                className={`${inputClass} ${errors.valid_until ? 'border-red-500/50' : ''}`}
              />
              {errors.valid_until && <p className={errorClass}>{errors.valid_until}</p>}
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#59FFA0] text-black font-semibold text-sm rounded-xl hover:bg-[#59FFA0]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                'Create Code'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── CODES TABLE ──────────────────────────────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Your Promo Codes
          </h2>
          {!loadingCodes && (
            <span className="text-xs text-[#7DD8E8]/60">{codes.length} code{codes.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {loadingCodes ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : codes.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <span className="text-4xl mb-3 block">🏷️</span>
            <p className="text-sm text-[#7DD8E8]/60">No promo codes yet — create one above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Code', 'Type', 'Value', 'Valid Until', 'Used / Limit', 'Active'].map(h => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-medium text-[#7DD8E8]/70 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {codes.map(code => (
                  <tr key={code.id} className="hover:bg-white/[0.03] transition-colors">
                    {/* Code */}
                    <td className="px-5 py-3">
                      <span className="font-mono font-semibold text-white tracking-wide">
                        {code.code}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="px-5 py-3 text-[#7DD8E8]/80 capitalize">
                      {code.discount_type === 'percentage' ? 'Percentage' : 'Fixed'}
                    </td>

                    {/* Value */}
                    <td className="px-5 py-3 text-white font-medium">
                      {code.discount_type === 'percentage'
                        ? `${code.discount_value}%`
                        : `$${code.discount_value.toFixed(2)}`}
                    </td>

                    {/* Valid Until */}
                    <td className="px-5 py-3 text-[#7DD8E8]/80 whitespace-nowrap">
                      {fmtDate(code.valid_until)}
                    </td>

                    {/* Used / Limit */}
                    <td className="px-5 py-3 text-[#7DD8E8]/80">
                      {code.usage_count ?? 0}
                      {' / '}
                      <span className={code.usage_limit == null ? 'text-white/30' : ''}>
                        {code.usage_limit ?? '∞'}
                      </span>
                    </td>

                    {/* Active toggle */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <ActiveToggle code={code} onChange={handleToggle} />
                        <span
                          className={`text-xs font-medium ${
                            code.active ? 'text-[#59FFA0]' : 'text-white/30'
                          }`}
                        >
                          {code.active ? 'Active' : 'Off'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
