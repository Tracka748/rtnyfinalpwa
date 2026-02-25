import { redirect } from 'next/navigation';
import { checkAdminAccess } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
