import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { checkOwnerOrAdmin } from '@/lib/partner-auth';
import { HubShell, type HubNavSection } from '@/components/hub/HubShell';

export default async function PartnerHubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ partnerId: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { partnerId } = await params;
  const db = createSupabaseAdmin();

  // Owner-or-admin gate (shared helper), the partner row, and the owned count
  // run together. Anything but a clean pass is a 404 so existence isn't revealed.
  const [auth, partnerResult, ownedResult] = await Promise.all([
    checkOwnerOrAdmin(partnerId),
    db.from('partners').select('id, display_name, business_id').eq('id', partnerId).maybeSingle(),
    db.from('partners').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
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

  const base = `/partner/${partnerId}`;

  const sections: HubNavSection[] = [
    {
      accent: 'green',
      items: [
        { href: `${base}/dashboard`, label: 'Overview', icon: '📊', exact: true },
        { href: `${base}/profile`, label: 'Profile', icon: '👤' },
        { href: `${base}/programs`, label: 'Marketing programs', icon: '📣' },
      ],
    },
    {
      heading: 'Coming soon',
      accent: 'cyan',
      items: [
        { href: `${base}/sponsorships`, label: 'Sponsorships', icon: '🤝', soon: true },
        { href: `${base}/media`, label: 'Media', icon: '🖼️', soon: true },
        { href: `${base}/supporters`, label: 'Supporters', icon: '❤️', soon: true },
        { href: `${base}/credits`, label: 'Credits', icon: '💳', soon: true },
      ],
    },
  ];

  const pageTitles: Record<string, string> = {
    [`${base}/dashboard`]: 'Overview',
    [`${base}/profile`]: 'Profile',
    [`${base}/programs`]: 'Marketing programs',
    [`${base}/programs/birthday/wizard`]: 'Marketing programs',
  };

  const ownsMultiple = (ownedResult.count ?? 0) >= 2;

  const switcher = ownsMultiple ? (
    <Link
      href="/partner"
      className="block min-h-[44px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition-colors"
    >
      <span className="block font-label text-[10px] tracking-widest text-[#7DD8E8]/60 uppercase">
        Selected business
      </span>
      <span className="block text-sm font-medium text-white truncate">{businessName}</span>
    </Link>
  ) : undefined;

  return (
    <HubShell
      brand={{ icon: '🏪', name: 'Partner Hub' }}
      subBrand="RocTicketNY"
      switcher={switcher}
      sections={sections}
      pageTitles={pageTitles}
      fallbackTitle="Partner Hub"
      footerLink={{ href: '/dashboard', label: 'Back to Site' }}
      userEmail={user.email ?? ''}
    >
      {children}
    </HubShell>
  );
}
