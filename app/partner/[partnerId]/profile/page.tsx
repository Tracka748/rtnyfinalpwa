import { PartnerProfileEditor } from '@/components/custom/partners/PartnerProfileEditor';

export default async function PartnerHubProfilePage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;

  return (
    <PartnerProfileEditor
      partnerId={partnerId}
      embedded
      backHref={`/partner/${partnerId}/dashboard`}
      offersHref={`/partner/${partnerId}/programs`}
      noPartnerHref="/partner"
    />
  );
}
