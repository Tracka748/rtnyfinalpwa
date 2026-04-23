import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PromoterShell } from '@/components/promoter/PromoterShell';

export default async function PromoterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_organizer')
    .eq('id', user.id)
    .single();

  const isPromoter = profile?.role === 'promoter' || profile?.role === 'admin';
  const isOrganizer = profile?.is_organizer === true || profile?.role === 'organizer';

  if (!isPromoter && !isOrganizer) {
    redirect('/apply/promoter');
  }

  return (
    <PromoterShell userEmail={user.email} isOrganizer={isOrganizer}>
      {children}
    </PromoterShell>
  );
}
