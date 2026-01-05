import { SignupForm } from "@/components/custom/auth/signup-form"
import Link from "next/link"

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#121113] px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-rokkitt)] text-4xl font-bold text-[#F9FDFF]">
            Welcome to RTNY
          </h1>
          <p className="mt-3 font-[family-name:var(--font-rubik)] text-[#A0A0A0]">
            Create your account to get started
          </p>
        </div>

        {/* Signup Form */}
        <SignupForm />

        {/* Sign In Link */}
        <div className="text-center">
          <Link
            href="/login"
            className="font-[family-name:var(--font-rubik)] text-sm text-[#A0A0A0] underline-offset-2 transition-all hover:text-[#F9FDFF] hover:underline"
          >
            Already have an account? Sign in →
          </Link>
        </div>

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