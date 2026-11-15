import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/AdminShell'
import { StaffShell } from '@/components/staff/StaffShell'
import { SignInRedirect } from '@/components/staff/SignInRedirect'
import { getStaffAccess } from '@/lib/staff-auth'

// Staff layout for the request inbox only (/admin/requests and /admin/requests/<id>). It lets in anyone
// who holds events.requests.view (admins always do) and nobody else. Every other /admin page keeps the
// admin-only layout in app/admin/layout.tsx. This layout is only the UX layer: every inbox API route
// enforces its own capability check.
//
// Do not add any other page under app/(staff): lib/admin-guards.audit.test.ts fails if you do.
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const access = await getStaffAccess()

  if (access.state === 'signed_out') return <SignInRedirect />
  if (access.state === 'denied') redirect('/dashboard')

  // Admins keep the full admin sidebar; specialists get the slim shell.
  return access.isAdmin ? (
    <AdminShell userEmail={access.email ?? undefined}>{children}</AdminShell>
  ) : (
    <StaffShell userEmail={access.email}>{children}</StaffShell>
  )
}
