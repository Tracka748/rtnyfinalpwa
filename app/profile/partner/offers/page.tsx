'use client';

import { useOwnedPartner } from '@/hooks/useOwnedPartner';
import { NewOfferButton, OfferList } from '@/components/custom/offers/OfferList';
import { NoPartnerState } from '@/components/custom/offers/NoPartnerState';

const WIZARD_HREF = '/profile/partner/offers/wizard';

export default function PartnerOffersPage() {
  const { loading, partner, error } = useOwnedPartner();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121113] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#59FFA0]/30 border-t-[#59FFA0] animate-spin" />
      </div>
    );
  }

  if (!partner) return <NoPartnerState message={error} />;

  return (
    <div className="min-h-screen bg-[#121113] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-3">
          <a href="/profile/partner/edit" className="text-[#7DD8E8] hover:text-white transition-colors text-sm">
            ← My Partner Profile
          </a>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-header font-bold text-white">Birthday Offers</h1>
              <p className="text-sm text-[#7DD8E8] mt-1">{partner.displayName}</p>
            </div>
            <NewOfferButton href={WIZARD_HREF} />
          </div>
        </div>

        <OfferList partnerId={partner.id} wizardHref={WIZARD_HREF} />
      </div>
    </div>
  );
}
