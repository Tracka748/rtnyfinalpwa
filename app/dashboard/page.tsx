// app/dashboard/page.tsx
import { getCurrentUser } from "@/lib/auth/get-user"
import { createSupabaseServer } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { LogoutButton } from "@/components/custom/auth/logout-button"
import { SavedDayPlans } from "@/components/custom/dashboard/SavedDayPlans"
import Link from "next/link"

export default async function DashboardPage() {
  const { user } = await getCurrentUser()

  // Protect route - redirect if not authenticated
  if (!user) {
    redirect('/login')
  }

  const supabase = await createSupabaseServer()
  const { data: dayPlans } = await supabase
    .from('day_plans')
    .select('id, plan_date, stops, total_estimated_spend, total_duration_minutes, created_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: crewMemberships } = await supabase
    .from('crew_members')
    .select('crew:crews(id, name, invite_code, crew_members(count))')
    .eq('user_id', user!.id)
    .limit(10)

  const crews = (crewMemberships ?? [])
    .map((m: any) => m.crew)
    .filter(Boolean)
    .map((c: any) => ({
      ...c,
      member_count: c.crew_members?.[0]?.count ?? 0,
    }))

  return (
    <main className="min-h-screen bg-[#121113]">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] bg-[#0A0A0A]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="font-[family-name:var(--font-rokkitt)] text-3xl font-bold text-[#F9FDFF]">
              Dashboard
            </h1>
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Welcome Card */}
        <div className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-8">
          <h2 className="font-[family-name:var(--font-rokkitt)] text-2xl font-bold text-[#F9FDFF]">
            Welcome back!
          </h2>
          <p className="mt-2 font-[family-name:var(--font-rubik)] text-[#A0A0A0]">
            Logged in as: <span className="text-[#59FFA0]">{user.email}</span>
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Browse Events */}
          <Link
            href="/events"
            className="group rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-6 transition-all hover:border-[#59FFA0] hover:bg-[#59FFA0]/5"
          >
            <h3 className="font-[family-name:var(--font-rokkitt)] text-xl font-bold text-[#F9FDFF] group-hover:text-[#59FFA0]">
              Browse Events
            </h3>
            <p className="mt-2 font-[family-name:var(--font-rubik)] text-sm text-[#A0A0A0]">
              Discover upcoming nightlife events in Rochester
            </p>
          </Link>

          {/* My Tickets */}
          <Link
            href="/dashboard/tickets"
            className="group rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-6 transition-all hover:border-[#59FFA0] hover:bg-[#59FFA0]/5"
          >
            <h3 className="font-[family-name:var(--font-rokkitt)] text-xl font-bold text-[#F9FDFF] group-hover:text-[#59FFA0]">
              My Tickets
            </h3>
            <p className="mt-2 font-[family-name:var(--font-rubik)] text-sm text-[#A0A0A0]">
              View your purchased tickets
            </p>
          </Link>

          {/* Profile Settings */}
          <Link
            href="/dashboard/settings"
            className="group rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-6 transition-all hover:border-[#59FFA0] hover:bg-[#59FFA0]/5"
          >
            <h3 className="font-[family-name:var(--font-rokkitt)] text-xl font-bold text-[#F9FDFF] group-hover:text-[#59FFA0]">
              Profile Settings
            </h3>
            <p className="mt-2 font-[family-name:var(--font-rubik)] text-sm text-[#A0A0A0]">
              Manage your account and preferences
            </p>
          </Link>
        </div>

        {/* Saved Day Plans */}
        <div className="bg-gradient-to-br from-cyan-950/30 to-transparent border border-cyan-500/10 rounded-2xl p-6 mt-6">
          <SavedDayPlans plans={(dayPlans ?? []) as any} />
        </div>

        {/* My Crews */}
        <div className="bg-gradient-to-br from-emerald-950/20 to-transparent border border-emerald-500/10 rounded-2xl p-6 mt-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
            <span className="text-2xl">👥</span>
            <h2 className="text-xl font-bold text-foreground font-slab-serif">
              My Crews
            </h2>
            <a href="/crews" className="ml-auto text-xs text-accent hover:underline">
              Manage Crews →
            </a>
          </div>

          {crews.length === 0 ? (
            <div className="text-center py-8 text-foreground/30 border border-white/5 rounded-2xl">
              <span className="text-3xl">👥</span>
              <p className="mt-2 text-sm">You&apos;re not in any crews yet.</p>
              <a href="/crews" className="text-accent text-sm hover:underline mt-1 block">
                Create or join a crew →
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {crews.map((crew: any) => (
                <div
                  key={crew.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-white/5 hover:bg-white/5 transition"
                >
                  <div>
                    <p className="font-medium text-foreground">{crew.name}</p>
                    <p className="text-xs text-foreground/40 mt-0.5">
                      {crew.member_count} member{crew.member_count !== 1 ? 's' : ''} · Code:{' '}
                      <span className="text-accent font-mono">{crew.invite_code}</span>
                    </p>
                  </div>
                  <a href="/crews" className="text-xs text-foreground/40 hover:text-accent transition">
                    View →
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Info (Debug) */}
        <div className="mt-8 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-6">
          <h3 className="font-[family-name:var(--font-rokkitt)] text-lg font-bold text-[#F9FDFF]">
            Account Info
          </h3>
          <dl className="mt-4 space-y-2 font-[family-name:var(--font-rubik)] text-sm">
            <div>
              <dt className="text-[#A0A0A0]">User ID:</dt>
              <dd className="text-[#F9FDFF]">{user.id}</dd>
            </div>
            <div>
              <dt className="text-[#A0A0A0]">Email:</dt>
              <dd className="text-[#F9FDFF]">{user.email}</dd>
            </div>
            {user.profile && (
              <>
                <div>
                  <dt className="text-[#A0A0A0]">Name:</dt>
                  <dd className="text-[#F9FDFF]">
                    {user.profile.first_name || 'Not set'} {user.profile.last_name || ''}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </div>
    </main>
  )
}