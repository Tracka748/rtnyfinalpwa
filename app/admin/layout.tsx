import { redirect } from 'next/navigation';
import { checkAdminAccess } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Everything under app/admin is gated by this admin-only check. The request inbox (/admin/requests) is
  // the one exception: it lives in app/(staff)/admin, behind a layout guarded by events.requests.view.
  const { isAdmin, user } = await checkAdminAccess();

  if (!isAdmin) {
    redirect('/');
  }

  return (
    <AdminShell userEmail={user?.email}>
      {children}
    </AdminShell>
  );
}
