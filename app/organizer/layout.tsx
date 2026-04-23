import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OrganizerShell } from '@/components/organizer/OrganizerShell';

export default async function OrganizerLayout({
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

  if (profile?.role !== 'organizer' && profile?.role !== 'admin') {
    redirect('/');
  }

  return (
    <OrganizerShell userEmail={user.email}>
      {children}
    </OrganizerShell>
  );
}
