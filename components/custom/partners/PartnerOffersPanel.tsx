'use client';

import { useOwnedPartner } from '@/hooks/useOwnedPartner';
import { NewOfferButton, OfferList } from '@/components/custom/offers/OfferList';
import { NoPartnerState } from '@/components/custom/offers/NoPartnerState';

interface PartnerOffersPanelProps {
  /** Show this specific partner's offers (owner or admin only). Omit for the signed-in user's own partner. */
  partnerId?: string;
  /** Rendered inside a hub shell: no full-screen wrapper, no page back link or title. */
  embedded?: boolean;
  /** Where "New offer" and each offer open the wizard. */
  wizardHref?: string;
  /** Header back link and the no-partner link. */
  backHref?: string;
  backLabel?: string;
}

export function PartnerOffersPanel({
  partnerId,
  embedded = false,
  wizardHref = '/profile/partner/offers/wizard',
  backHref,
  backLabel,
}: PartnerOffersPanelProps = {}) {
  const { loading, partner, error } = useOwnedPartner(partnerId);

  if (loading) {
    return (
      <div
        className={`${embedded ? 'min-h-[60vh]' : 'min-h-screen bg-[#121113]'} flex items-center justify-center`}
      >
        <div className="w-8 h-8 rounded-full border-2 border-[#59FFA0]/30 border-t-[#59FFA0] animate-spin" />
      </div>
    );
  }

  if (!partner) return <NoPartnerState message={error} backHref={backHref} backLabel={backLabel} />;

  return (
    <div className={embedded ? '' : 'min-h-screen bg-[#121113] py-10 px-4'}>
      <div className="max-w-2xl mx-auto space-y-6">
        {embedded ? (
          <div className="flex justify-end">
            <NewOfferButton href={wizardHref} />
          </div>
        ) : (
          <div className="space-y-3">
            <a
              href={backHref ?? '/profile/partner/edit'}
              className="text-[#7DD8E8] hover:text-white transition-colors text-sm"
            >
              {backLabel ?? '← My Partner Profile'}
            </a>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-header font-bold text-white">Birthday Offers</h1>
                <p className="text-sm text-[#7DD8E8] mt-1">{partner.displayName}</p>
              </div>
              <NewOfferButton href={wizardHref} />
            </div>
          </div>
        )}

        <OfferList partnerId={partner.id} wizardHref={wizardHref} mode="owner" />
      </div>
    </div>
  );
}
