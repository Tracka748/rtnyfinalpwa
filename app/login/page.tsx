// app/login/page.tsx
import { LoginForm } from "@/components/custom/auth/login-form"
import Link from "next/link"

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#121113] px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-rokkitt)] text-4xl font-bold text-[#F9FDFF]">
            Welcome Back
          </h1>
          <p className="mt-3 font-[family-name:var(--font-rubik)] text-[#A0A0A0]">
            Sign in to your RTNY account
          </p>
        </div>

        {/* Login Form */}
        <LoginForm />

        {/* Back to Events */}
        <div className="text-center">
          <Link
            href="/events"
            className="font-[family-name:var(--font-rubik)] text-sm text-[#A0A0A0] underline-offset-2 transition-all hover:text-[#F9FDFF] hover:underline"
          >
            ← Browse events
          </Link>
        </div>
      </div>
    </main>
  )
}