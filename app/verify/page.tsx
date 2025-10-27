// app/verify/page.tsx
import { VerifyForm } from "@/components/custom/auth/verify-form"

export default function VerifyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#121113] px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-rokkitt)] text-4xl font-bold text-[#F9FDFF]">
            Check Your Email
          </h1>
          <p className="mt-3 font-[family-name:var(--font-rubik)] text-[#A0A0A0]">
            Enter the verification code we sent you
          </p>
        </div>

        {/* Verify Form */}
        <VerifyForm />
      </div>
    </main>
  )
}