'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ComingSoonContent() {
  const searchParams = useSearchParams();
  const featureId = searchParams.get('feature') ?? '';

  const featureLabel = featureId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white/5 border border-white/10 rounded-xl p-10">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#59FFA0]/10 border border-[#59FFA0]/20 flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#59FFA0]"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <h1 className="text-2xl font-header font-bold text-white mb-2">
            {featureLabel || 'Feature'}{' '}
            <span className="text-[#59FFA0]">Coming Soon</span>
          </h1>

          <p className="text-[#7DD8E8] text-sm leading-relaxed mb-8">
            This feature is coming soon. You&apos;ve been added to the early access list.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#59FFA0]/10 border border-[#59FFA0]/20 rounded-full text-[#59FFA0] text-sm font-medium mb-8">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Early Access Reserved
          </div>

          <Link
            href="/promoter/dashboard"
            className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-[#59FFA0] text-black font-semibold rounded-xl hover:bg-[#59FFA0]/90 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ComingSoonPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#59FFA0] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ComingSoonContent />
    </Suspense>
  );
}
