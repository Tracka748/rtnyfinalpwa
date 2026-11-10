import { redirect } from 'next/navigation';
import { checkAdminAccess } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // PREREQUISITE: this inbox is admin-only. Before assigning ANY specialist, move it behind a capability-guarded staff layout (events.requests.view).
  // Everything under /admin, including /admin/requests, is gated by this admin-only check.
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
