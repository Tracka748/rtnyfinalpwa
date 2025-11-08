"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createBrowserClient } from '@supabase/ssr'
import type { User } from "@supabase/supabase-js"

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Check authentication status
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const isActive = (path: string) => pathname === path

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-[#2A2A2A] bg-[#121113]/95 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link 
            href="/events" 
            className="font-[family-name:var(--font-rokkitt)] text-2xl font-bold text-[#F9FDFF] transition-colors hover:text-[#59FFA0]"
          >
            RTNY
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-6 md:flex">
            {/* Events Link */}
            <Link
              href="/events"
              className={`font-[family-name:var(--font-rubik)] text-sm font-medium transition-colors ${
                isActive("/events")
                  ? "text-[#59FFA0]"
                  : "text-[#F9FDFF] hover:text-[#59FFA0]"
              }`}
            >
              Events
            </Link>

            {/* Conditional Links based on Auth State */}
            {!loading && (
              <>
                {user ? (
                  // Logged In State
                  <>
                    <Link
                      href="/dashboard"
                      className={`font-[family-name:var(--font-rubik)] text-sm font-medium transition-colors ${
                        isActive("/dashboard")
                          ? "text-[#59FFA0]"
                          : "text-[#F9FDFF] hover:text-[#59FFA0]"
                      }`}
                    >
                      Dashboard
                    </Link>

                    <Link
                      href="/profile"
                      className={`font-[family-name:var(--font-rubik)] text-sm font-medium transition-colors ${
                        isActive("/profile")
                          ? "text-[#59FFA0]"
                          : "text-[#F9FDFF] hover:text-[#59FFA0]"
                      }`}
                    >
                      My Tickets
                    </Link>

                    {/* User Menu */}
                    <div className="flex items-center gap-4">
                      <span className="font-[family-name:var(--font-rubik)] text-sm text-[#A0A0A0]">
                        {user.email}
                      </span>
                      <button
                        onClick={handleLogout}
                        className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-2 font-[family-name:var(--font-rubik)] text-sm text-[#F9FDFF] transition-all hover:border-[#59FFA0] hover:bg-[#59FFA0]/10"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                ) : (
                  // Logged Out State
                  <Link
                    href="/login"
                    className="rounded-lg bg-[#59FFA0] px-4 py-2 font-[family-name:var(--font-rubik)] text-sm font-medium text-[#121113] transition-all hover:bg-[#4DE08A]"
                  >
                    Login
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-lg p-2 text-[#F9FDFF] hover:bg-[#1A1A1A]"
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-[#2A2A2A] bg-[#0A0A0A] md:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2">
            <Link
              href="/events"
              onClick={() => setMobileMenuOpen(false)}
              className={`block rounded-lg px-3 py-2 font-[family-name:var(--font-rubik)] text-base font-medium transition-colors ${
                isActive("/events")
                  ? "bg-[#59FFA0]/10 text-[#59FFA0]"
                  : "text-[#F9FDFF] hover:bg-[#1A1A1A]"
              }`}
            >
              Events
            </Link>

            {!loading && (
              <>
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block rounded-lg px-3 py-2 font-[family-name:var(--font-rubik)] text-base font-medium transition-colors ${
                        isActive("/dashboard")
                          ? "bg-[#59FFA0]/10 text-[#59FFA0]"
                          : "text-[#F9FDFF] hover:bg-[#1A1A1A]"
                      }`}
                    >
                      Dashboard
                    </Link>

                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block rounded-lg px-3 py-2 font-[family-name:var(--font-rubik)] text-base font-medium transition-colors ${
                        isActive("/profile")
                          ? "bg-[#59FFA0]/10 text-[#59FFA0]"
                          : "text-[#F9FDFF] hover:bg-[#1A1A1A]"
                      }`}
                    >
                      My Tickets
                    </Link>

                    <div className="mt-4 border-t border-[#2A2A2A] pt-4">
                      <p className="px-3 font-[family-name:var(--font-rubik)] text-sm text-[#A0A0A0]">
                        {user.email}
                      </p>
                      <button
                        onClick={() => {
                          handleLogout()
                          setMobileMenuOpen(false)
                        }}
                        className="mt-2 w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2 text-left font-[family-name:var(--font-rubik)] text-base font-medium text-[#F9FDFF] transition-all hover:border-[#59FFA0] hover:bg-[#59FFA0]/10"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg bg-[#59FFA0] px-3 py-2 text-center font-[family-name:var(--font-rubik)] text-base font-medium text-[#121113] transition-all hover:bg-[#4DE08A]"
                  >
                    Login
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}