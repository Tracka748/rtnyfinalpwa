import { PartnerOffersPanel } from '@/components/custom/partners/PartnerOffersPanel';

export default async function PartnerProgramsPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-header font-bold text-white">Marketing programs</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-header font-bold text-white">Birthday offers</h2>
        <PartnerOffersPanel
          partnerId={partnerId}
          embedded
          wizardHref={`/partner/${partnerId}/programs/birthday/wizard`}
          backHref="/partner"
          backLabel="← Back"
        />
      </section>

      <div className="rounded-xl border border-dashed border-white/20 px-6 py-5 text-center">
        <p className="text-sm text-[#7DD8E8]">
          More programs and wizards will appear here — <span className="text-white/60">Coming soon</span>
        </p>
      </div>
    </div>
  );
}
