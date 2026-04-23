"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { useSidebar } from "@/contexts/sidebar-context"
import type { User } from "@supabase/supabase-js"

interface Profile {
  first_name: string | null
  last_name: string | null
  role: string | null
  is_organizer: boolean | null
}

function getInitials(profile: Profile | null, user: User): string {
  if (profile?.first_name || profile?.last_name) {
    const f = profile.first_name?.[0] ?? ""
    const l = profile.last_name?.[0] ?? ""
    return (f + l).toUpperCase() || "?"
  }
  return (user.email?.[0] ?? "?").toUpperCase()
}

function getDisplayName(profile: Profile | null, user: User): string {
  if (profile?.first_name || profile?.last_name) {
    return [profile.first_name, profile.last_name].filter(Boolean).join(" ")
  }
  return user.email ?? "User"
}

interface NavItemProps {
  href: string
  emoji: string
  label: string
  disabled?: boolean
  onClick: () => void
}

function NavItem({ href, emoji, label, disabled, onClick }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href.split("?")[0]))

  if (disabled) {
    return (
      <span className="flex cursor-not-allowed items-center gap-3 px-4 py-3 font-sans text-sm opacity-40">
        <span className="w-6 text-center text-base">{emoji}</span>
        {label}
      </span>
    )
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 font-sans text-sm transition-colors hover:bg-white/5 ${
        isActive
          ? "border-l-2 border-[#59FFA0] text-[#59FFA0]"
          : "text-[#F9FDFF] hover:text-[#F9FDFF]"
      }`}
    >
      <span className="w-6 text-center text-base">{emoji}</span>
      {label}
    </Link>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-4 pb-1 pt-4">
      <span className="font-label text-xs tracking-widest text-[#7DD8E8]">{label}</span>
    </div>
  )
}

export function Sidebar() {
  const { isOpen, close } = useSidebar()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        const { data } = await supabase
          .from("profiles")
          .select("first_name, last_name, role, is_organizer")
          .eq("id", u.id)
          .single()
        setProfile(data ?? null)
      }
      setLoadingAuth(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        const { data } = await supabase
          .from("profiles")
          .select("first_name, last_name, role, is_organizer")
          .eq("id", u.id)
          .single()
        setProfile(data ?? null)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    if (isOpen) document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, close])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  const handleNavClick = () => close()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    close()
    router.push("/")
    router.refresh()
  }

  const isPromoter = profile?.role === "promoter" || profile?.role === "admin"

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={close}
      />

      {/* Sidebar panel */}
      <div
        ref={sidebarRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed left-0 top-0 z-50 flex h-full w-[85vw] max-w-[320px] flex-col bg-[#121113] shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 pb-3 pt-5">
          {/* User identity */}
          <div className="flex items-center gap-3">
            {!loadingAuth && user ? (
              <>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1AC8ED]/20 font-sans text-sm font-bold text-[#1AC8ED]">
                  {getInitials(profile, user)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-sans text-sm font-semibold text-[#F9FDFF]">
                    {getDisplayName(profile, user)}
                  </p>
                  <p className="truncate font-sans text-xs text-[#7DD8E8]">{user.email}</p>
                </div>
              </>
            ) : !loadingAuth ? (
              <div>
                <p className="font-sans text-sm text-[#F9FDFF]">Welcome to RTNY</p>
                <Link
                  href="/login"
                  onClick={handleNavClick}
                  className="mt-2 inline-block rounded-xl bg-[#59FFA0] px-4 py-2 font-sans text-sm font-bold text-[#121113]"
                >
                  Sign In
                </Link>
              </div>
            ) : null}
          </div>

          {/* Close button */}
          <button
            onClick={close}
            aria-label="Close menu"
            className="shrink-0 rounded-lg p-2 text-[#F9FDFF]/60 transition-colors hover:bg-white/5 hover:text-[#F9FDFF]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-[#1AC8ED]/30" />

        {/* Scrollable nav content */}
        <nav className="flex-1 overflow-y-auto pb-4">
          {/* DISCOVER */}
          <SectionLabel label="Discover" />
          <div className="border-b border-white/10">
            <NavItem href="/events" emoji="🎟" label="Browse Events" onClick={handleNavClick} />
            <NavItem href="/events?filter=featured" emoji="🔥" label="Featured This Weekend" onClick={handleNavClick} />
            <NavItem href="/deals" emoji="🏷" label="Deals & Promos" onClick={handleNavClick} />
            <NavItem href="/events?category=movies" emoji="🎬" label="Movies" onClick={handleNavClick} />
            <NavItem href="/events?category=dining" emoji="🍽" label="Dining" onClick={handleNavClick} />
            <NavItem href="/events?category=family" emoji="👨‍👩‍👧" label="Family" onClick={handleNavClick} />
            <NavItem href="/events?category=nightlife" emoji="🌙" label="Nightlife" onClick={handleNavClick} />
          </div>

          {/* MY ACCOUNT */}
          <SectionLabel label="My Account" />
          <div className="border-b border-white/10">
            <NavItem href="/dashboard/tickets" emoji="🎫" label="My Tickets" disabled={!user} onClick={handleNavClick} />
            <NavItem href="/dashboard/orders" emoji="📋" label="My Orders" disabled={!user} onClick={handleNavClick} />
            <NavItem href="/groups" emoji="👥" label="My Groups" disabled={!user} onClick={handleNavClick} />
            <NavItem href="/dashboard/saved" emoji="❤️" label="Saved Events" disabled={!user} onClick={handleNavClick} />
          </div>

          {/* SHOP */}
          <SectionLabel label="Shop" />
          <div className="border-b border-white/10">
            <NavItem href="/merch" emoji="👕" label="Merch Store" onClick={handleNavClick} />
            <NavItem href="/gift-cards" emoji="🎁" label="Gift Cards" onClick={handleNavClick} />
          </div>

          {/* TOOLS */}
          <SectionLabel label="Tools" />
          <div className="border-b border-white/10">
            {(isPromoter || profile?.is_organizer) ? (
              <NavItem href="/promoter/dashboard" emoji="📊" label="Promoter Hub" onClick={handleNavClick} />
            ) : (
              <NavItem href="/apply/promoter" emoji="🤝" label="Become a Promoter" onClick={handleNavClick} />
            )}
          </div>

          {/* SUPPORT */}
          <SectionLabel label="Support" />
          <div className="border-b border-white/10">
            <NavItem href="/help" emoji="❓" label="Help & FAQ" onClick={handleNavClick} />
            <NavItem href="/contact" emoji="📧" label="Contact Us" onClick={handleNavClick} />
            <NavItem href="/about" emoji="ℹ️" label="About RTNY" onClick={handleNavClick} />
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 px-4 py-4">
          {user && (
            <button
              onClick={handleSignOut}
              className="mb-3 font-sans text-sm text-red-400 transition-colors hover:text-red-300"
            >
              Sign Out
            </button>
          )}
          <p className="font-sans text-xs text-[#F9FDFF]/30">RTNY v1.0 · Rochester, NY</p>
        </div>
      </div>
    </>
  )
}
