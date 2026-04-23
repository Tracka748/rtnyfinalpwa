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
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'promoter' && profile?.role !== 'admin') {
    redirect('/promoter/apply');
  }

  return (
    <PromoterShell userEmail={user.email}>
      {children}
    </PromoterShell>
  );
}
