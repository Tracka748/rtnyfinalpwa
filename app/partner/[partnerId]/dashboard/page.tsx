import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseAdmin } from '@/lib/supabase';
import { checkOwnerOrAdmin } from '@/lib/partner-auth';
import { StatTile } from '@/components/hub/StatTile';

export default async function PartnerDashboardPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const db = createSupabaseAdmin();

  // The layout already gates this segment, but the page reads data itself, so
  // it checks too rather than relying on the layout having rendered first.
  const [auth, partnerResult, supportersResult, mediaResult, liveResult, reviewResult] =
    await Promise.all([
      checkOwnerOrAdmin(partnerId),
      db.from('partners').select('display_name, business_id').eq('id', partnerId).maybeSingle(),
      db.from('partner_supporters').select('id', { count: 'exact', head: true }).eq('partner_id', partnerId),
      db.from('partner_media').select('id', { count: 'exact', head: true }).eq('partner_id', partnerId),
      db
        .from('vendor_services')
        .select('id', { count: 'exact', head: true })
        .eq('partner_id', partnerId)
        .is('vendor_id', null)
        .eq('status', 'active'),
      db
        .from('vendor_services')
        .select('id', { count: 'exact', head: true })
        .eq('partner_id', partnerId)
        .is('vendor_id', null)
        .eq('status', 'pending'),
    ]);

  if ('error' in auth || !partnerResult.data) {
    notFound();
  }

  const partner = partnerResult.data;

  let businessName: string = partner.display_name;
  if (partner.business_id) {
    const { data: business } = await db
      .from('businesses')
      .select('name')
      .eq('id', partner.business_id)
      .maybeSingle();
    if (business?.name) businessName = business.name;
  }

  // A failed count shows a dash rather than a misleading zero.
  const show = (result: { count: number | null; error: unknown }): number | string =>
    result.error || result.count === null ? '—' : result.count;

  return (
    <>
      {/* ── HERO ── */}
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-[#59FFA0]/10 via-[#1AC8ED]/10 to-[#59FFA0]/10 border border-[#59FFA0]/20 p-8">
        <h1 className="text-4xl md:text-5xl font-header font-bold mb-6 text-white">
          Welcome back, <span className="text-[#59FFA0]">{businessName}</span>
        </h1>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/partner/${partnerId}/profile`}
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-[#59FFA0] text-black font-semibold rounded-xl hover:bg-[#59FFA0]/90 transition-colors text-sm"
          >
            Edit profile
          </Link>
          <Link
            href={`/partners/${partnerId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/15 transition-colors text-sm"
          >
            View public page
          </Link>
        </div>
      </div>

      {/* ── AT A GLANCE ── */}
      <h2 className="text-xl font-header font-bold text-white mb-4">At a glance</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Supporters" value={show(supportersResult)} color="cyan" />
        <StatTile label="Media items" value={show(mediaResult)} color="white" />
        <StatTile label="Live offers" value={show(liveResult)} color="green" />
        <StatTile label="In review" value={show(reviewResult)} color="yellow" />
      </div>
    </>
  );
}
