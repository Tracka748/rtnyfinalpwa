import { PartnerOfferWizardPanel } from '@/components/custom/partners/PartnerOfferWizardPanel';

export default async function PartnerBirthdayWizardPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;

  return (
    <PartnerOfferWizardPanel
      partnerId={partnerId}
      embedded
      exitHref={`/partner/${partnerId}/programs`}
      profileHref={`/partner/${partnerId}/profile`}
      backHref={`/partner/${partnerId}/programs`}
    />
  );
}
