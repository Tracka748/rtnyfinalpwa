"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { ChevronDown } from "lucide-react"
import type { User } from "@supabase/supabase-js"

interface Profile {
  first_name: string | null
  last_name: string | null
  role: string | null
}

function getInitials(profile: Profile | null, user: User): string {
  if (profile?.first_name || profile?.last_name) {
    const f = profile.first_name?.[0] ?? ""
    const l = profile.last_name?.[0] ?? ""
    return (f + l).toUpperCase() || "?"
  }
  return (user.email?.[0] ?? "?").toUpperCase()
}

const NAV_LINKS = [
  { label: "Browse Events", href: "/events" },
  { label: "Deals & Promos", href: "/deals" },
  { label: "Groups", href: "/groups" },
  { label: "Merch", href: "/merch" },
  { label: "Gift Cards", href: "/gift-cards" },
]

const CATEGORY_LINKS = [
  { emoji: "🎬", label: "Movies", href: "/events?category=movies" },
  { emoji: "🍽", label: "Dining", href: "/events?category=dining" },
  { emoji: "👨‍👩‍👧", label: "Family", href: "/events?category=family" },
  { emoji: "🌙", label: "Nightlife", href: "/events?category=nightlife" },
]

const ACCOUNT_LINKS = [
  { emoji: "🎫", label: "My Tickets", href: "/dashboard/tickets" },
  { emoji: "📋", label: "My Orders", href: "/dashboard/orders" },
  { emoji: "👥", label: "My Groups", href: "/groups" },
  { emoji: "❤️", label: "Saved Events", href: "/dashboard/saved" },
]

export function DesktopNav() {
  const pathname = usePathname()
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  const [catOpen, setCatOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)

  const avatarRef = useRef<HTMLDivElement>(null)
  const catRef = useRef<HTMLDivElement>(null)

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
          .select("first_name, last_name, role")
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
          .select("first_name, last_name, role")
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

  // Close avatar dropdown on outside click
  useEffect(() => {
    if (!avatarOpen) return
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [avatarOpen])

  // Close categories dropdown on outside click
  useEffect(() => {
    if (!catOpen) return
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [catOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setAvatarOpen(false)
    router.push("/")
    router.refresh()
  }

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href.split("?")[0] + "/") || pathname === href.split("?")[0]

  const isPromoter = profile?.role === "promoter"

  return (
    <nav className="sticky top-0 z-40 hidden w-full border-b border-white/10 bg-[#121113]/95 backdrop-blur-md md:block">
      <div className="flex h-16 items-center justify-between px-6">

        {/* Left: RTNY wordmark */}
        <Link
          href="/"
          className="shrink-0 font-slab-serif text-2xl text-[#F9FDFF] transition-opacity hover:opacity-80"
        >
          RTNY
        </Link>

        {/* Center: primary nav links */}
        <div className="flex items-center gap-1 px-8">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-3 py-2 font-sans text-sm transition-colors hover:bg-white/5 hover:text-[#F9FDFF] ${
                isActive(href)
                  ? "font-medium text-[#59FFA0]"
                  : "text-[#F9FDFF]/80"
              }`}
            >
              {label}
            </Link>
          ))}

          {/* Categories dropdown */}
          <div
            ref={catRef}
            className="relative"
            onMouseEnter={() => setCatOpen(true)}
            onMouseLeave={() => setCatOpen(false)}
          >
            <button
              type="button"
              className={`flex items-center gap-1 rounded-lg px-3 py-2 font-sans text-sm transition-colors hover:bg-white/5 hover:text-[#F9FDFF] ${
                catOpen ? "text-[#F9FDFF]" : "text-[#F9FDFF]/80"
              }`}
              aria-expanded={catOpen}
              aria-haspopup="true"
            >
              Categories
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-200 ${catOpen ? "rotate-180" : ""}`}
              />
            </button>

            {catOpen && (
              <div className="absolute left-0 top-full mt-1 w-44 rounded-xl border border-white/10 bg-[#1a1a1c] p-2 shadow-xl">
                {CATEGORY_LINKS.map(({ emoji, label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setCatOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 font-sans text-sm text-[#F9FDFF]/80 transition-colors hover:bg-white/5 hover:text-[#F9FDFF]"
                  >
                    <span>{emoji}</span>
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: auth actions */}
        <div className="ml-auto flex shrink-0 items-center">
          {!loadingAuth && (
            <>
              {user ? (
                <div ref={avatarRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setAvatarOpen((prev) => !prev)}
                    aria-label="Open account menu"
                    aria-expanded={avatarOpen}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1AC8ED] font-sans text-sm font-bold text-[#121113] transition-opacity hover:opacity-90"
                  >
                    {getInitials(profile, user)}
                  </button>

                  {avatarOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/10 bg-[#1a1a1c] p-2 shadow-xl">
                      {/* Account links */}
                      {ACCOUNT_LINKS.map(({ emoji, label, href }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setAvatarOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 font-sans text-sm text-[#F9FDFF]/80 transition-colors hover:bg-white/5 hover:text-[#F9FDFF]"
                        >
                          <span>{emoji}</span>
                          {label}
                        </Link>
                      ))}

                      <div className="my-1 border-t border-white/10" />

                      {/* Promoter section */}
                      {isPromoter ? (
                        <Link
                          href="/promoter/dashboard"
                          onClick={() => setAvatarOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 font-sans text-sm text-[#F9FDFF]/80 transition-colors hover:bg-white/5 hover:text-[#F9FDFF]"
                        >
                          <span>📊</span>
                          Promoter Dashboard
                        </Link>
                      ) : (
                        <Link
                          href="/promoter/apply"
                          onClick={() => setAvatarOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 font-sans text-sm text-[#F9FDFF]/80 transition-colors hover:bg-white/5 hover:text-[#F9FDFF]"
                        >
                          <span>🤝</span>
                          Become a Promoter
                        </Link>
                      )}

                      <div className="my-1 border-t border-white/10" />

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full rounded-lg px-3 py-2 text-left font-sans text-sm text-red-400 transition-colors hover:bg-white/5 hover:text-red-300"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="rounded-xl bg-[#59FFA0] px-4 py-2 font-sans text-sm font-bold text-[#121113] transition-opacity hover:opacity-90"
                >
                  Sign In
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
