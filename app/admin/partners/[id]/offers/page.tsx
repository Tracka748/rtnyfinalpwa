'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { NewOfferButton, OfferList } from '@/components/custom/offers/OfferList';

// Admin access is enforced server-side by app/admin/layout.tsx.
export default function AdminPartnerOffersPage() {
  const { id } = useParams<{ id: string }>();
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const wizardHref = `/admin/partners/${id}/offers/wizard`;

  useEffect(() => {
    createBrowserSupabaseClient()
      .from('partners')
      .select('display_name')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => setPartnerName(data?.display_name ?? null));
  }, [id]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-3">
        <a href={`/admin/partners/${id}/edit`} className="text-sm text-[#7DD8E8] hover:text-white transition-colors">
          ← Edit Partner
        </a>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-header font-bold text-white">Birthday Offers</h1>
            {partnerName && <p className="text-sm text-[#7DD8E8] mt-1">{partnerName}</p>}
          </div>
          <NewOfferButton href={wizardHref} />
        </div>
      </div>

      <OfferList partnerId={id} wizardHref={wizardHref} />
    </div>
  );
}
