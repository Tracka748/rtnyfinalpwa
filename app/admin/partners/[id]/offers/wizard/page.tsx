'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { OfferWizard } from '@/components/custom/offers/OfferWizard';

function AdminOfferWizard() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  return (
    <OfferWizard
      partnerId={id}
      offerId={searchParams.get('offer')}
      mode="admin"
      exitHref={`/admin/partners/${id}/offers`}
    />
  );
}

// Admin access is enforced server-side by app/admin/layout.tsx.
export default function AdminOfferWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#59FFA0]/30 border-t-[#59FFA0] animate-spin" />
        </div>
      }
    >
      <AdminOfferWizard />
    </Suspense>
  );
}
