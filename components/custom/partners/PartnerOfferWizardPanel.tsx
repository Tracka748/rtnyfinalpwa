'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOwnedPartner } from '@/hooks/useOwnedPartner';
import { OfferWizard } from '@/components/custom/offers/OfferWizard';
import { NoPartnerState } from '@/components/custom/offers/NoPartnerState';

interface PartnerOfferWizardPanelProps {
  /** Run the wizard for this specific partner (owner or admin only). Omit for the signed-in user's own partner. */
  partnerId?: string;
  /** Rendered inside a hub shell: no full-screen wrapper; the action bar clears the sidebar. */
  embedded?: boolean;
  /** Where the wizard exits to (default: the owner offers list). */
  exitHref?: string;
  /** The wizard's "edit your profile" link. */
  profileHref?: string;
  /** The no-partner link. */
  backHref?: string;
  backLabel?: string;
}

function Spinner({ embedded }: { embedded: boolean }) {
  return (
    <div className={`${embedded ? 'min-h-[60vh]' : 'min-h-screen bg-[#121113]'} flex items-center justify-center`}>
      <div className="w-8 h-8 rounded-full border-2 border-[#59FFA0]/30 border-t-[#59FFA0] animate-spin" />
    </div>
  );
}

function OwnerOfferWizard({
  partnerId,
  embedded,
  exitHref,
  profileHref,
  backHref,
  backLabel,
}: PartnerOfferWizardPanelProps & { embedded: boolean; exitHref: string }) {
  const searchParams = useSearchParams();
  const { loading, partner, error } = useOwnedPartner(partnerId);

  if (loading) return <Spinner embedded={embedded} />;
  if (!partner) return <NoPartnerState message={error} backHref={backHref} backLabel={backLabel} />;

  return (
    <div className={embedded ? '' : 'min-h-screen bg-[#121113] py-8 px-4'}>
      <OfferWizard
        partnerId={partner.id}
        offerId={searchParams.get('offer')}
        mode="owner"
        exitHref={exitHref}
        profileHref={profileHref}
        barOffset={embedded ? 'md:left-64' : undefined}
      />
    </div>
  );
}

export function PartnerOfferWizardPanel({
  embedded = false,
  exitHref = '/profile/partner/offers',
  ...rest
}: PartnerOfferWizardPanelProps = {}) {
  return (
    <Suspense fallback={<Spinner embedded={embedded} />}>
      <OwnerOfferWizard embedded={embedded} exitHref={exitHref} {...rest} />
    </Suspense>
  );
}
