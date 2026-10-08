'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOwnedPartner } from '@/hooks/useOwnedPartner';
import { OfferWizard } from '@/components/custom/offers/OfferWizard';
import { NoPartnerState } from '@/components/custom/offers/NoPartnerState';

function Spinner() {
  return (
    <div className="min-h-screen bg-[#121113] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#59FFA0]/30 border-t-[#59FFA0] animate-spin" />
    </div>
  );
}

function OwnerOfferWizard() {
  const searchParams = useSearchParams();
  const { loading, partner, error } = useOwnedPartner();

  if (loading) return <Spinner />;
  if (!partner) return <NoPartnerState message={error} />;

  return (
    <div className="min-h-screen bg-[#121113] py-8 px-4">
      <OfferWizard
        partnerId={partner.id}
        offerId={searchParams.get('offer')}
        mode="owner"
        exitHref="/profile/partner/offers"
      />
    </div>
  );
}

export default function PartnerOfferWizardPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <OwnerOfferWizard />
    </Suspense>
  );
}
