"use client"

import { Coins, Ticket, Award, Gift } from "lucide-react"

const POINTS = 240
const STUBS = 2

const EARNING_HISTORY = [
  { label: "Event Attendance – May Fest", pts: 50, date: "May 18" },
  { label: "Ticket Purchase – Eastman Concert", pts: 120, date: "May 10" },
  { label: "Sign-up Bonus", pts: 70, date: "Apr 29" },
]

const STUB_TIERS = [
  { count: 3, reward: "Event Access" },
  { count: 5, reward: "Free Ticket" },
  { count: 7, reward: "VIP Eligibility" },
]

const BADGES = [
  { name: "First Event", earned: true },
  { name: "Explorer", earned: true },
  { name: "Streak 3x", earned: true },
  { name: "Power Fan", earned: true },
  { name: "VIP Ready", earned: false },
  { name: "Local Legend", earned: false },
  { name: "Night Owl", earned: false },
  { name: "Season Ticket", earned: false },
]

const GIFTS = [
  { name: "Birthday Perk", desc: "Special birthday discount — use before May 31" },
]

export default function RewardsPage() {
  return (
    <main className="min-h-screen pb-24" style={{ background: "#121113" }}>
      <div className="px-5 pt-8 pb-4">
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: "var(--font-rokkitt)", color: "#F9FDFF" }}
        >
          My Rewards
        </h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Points */}
        <Section>
          <SectionHeader icon={<Coins size={18} color="#59FFA0" />} title="Points" />
          <div className="mt-3">
            <span className="text-4xl font-bold tabular-nums" style={{ color: "#59FFA0" }}>
              {POINTS}
            </span>
            <p className="text-xs mt-1" style={{ color: "rgba(249,253,255,0.50)" }}>
              Earned through purchases &amp; activity
            </p>
          </div>
          <div className="mt-4 space-y-2.5">
            {EARNING_HISTORY.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="text-sm truncate" style={{ color: "rgba(249,253,255,0.70)" }}>
                  {item.label}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-semibold" style={{ color: "#59FFA0" }}>
                    +{item.pts} pts
                  </span>
                  <span className="text-xs" style={{ color: "rgba(249,253,255,0.30)" }}>
                    {item.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Stubs */}
        <Section>
          <SectionHeader icon={<Ticket size={18} color="#1AC8ED" />} title="Stubs" />
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: "rgba(249,253,255,0.50)" }}>
                Toward next milestone
              </span>
              <span className="text-sm font-semibold tabular-nums" style={{ color: "#1AC8ED" }}>
                {STUBS} / 5
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${(STUBS / 5) * 100}%`, background: "#1AC8ED", transition: "width 0.4s ease" }}
              />
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            {STUB_TIERS.map((tier) => {
              const reached = STUBS >= tier.count
              const isCurrent = !reached && STUB_TIERS.find((t) => STUBS < t.count)?.count === tier.count
              return (
                <div key={tier.count} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background: reached
                          ? "#1AC8ED"
                          : isCurrent
                          ? "rgba(26,200,237,0.40)"
                          : "rgba(255,255,255,0.15)",
                      }}
                    />
                    <span
                      className="text-sm"
                      style={{
                        color: reached
                          ? "#F9FDFF"
                          : isCurrent
                          ? "rgba(249,253,255,0.70)"
                          : "rgba(249,253,255,0.35)",
                      }}
                    >
                      {tier.reward}
                    </span>
                  </div>
                  <span
                    className="text-xs font-semibold tabular-nums"
                    style={{
                      color: reached ? "#1AC8ED" : isCurrent ? "rgba(26,200,237,0.60)" : "rgba(249,253,255,0.25)",
                    }}
                  >
                    {tier.count} stubs
                  </span>
                </div>
              )
            })}
          </div>
        </Section>

        {/* Badges */}
        <Section>
          <SectionHeader icon={<Award size={18} color="#59FFA0" />} title="Badges" />
          <div className="mt-3 grid grid-cols-4 gap-3">
            {BADGES.map((badge) => (
              <div key={badge.name} className="flex flex-col items-center gap-1.5">
                <div
                  className="w-13 h-13 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: badge.earned ? "rgba(89,255,160,0.10)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${badge.earned ? "rgba(89,255,160,0.25)" : "rgba(255,255,255,0.07)"}`,
                  }}
                >
                  <Award size={22} color={badge.earned ? "#59FFA0" : "rgba(249,253,255,0.18)"} />
                </div>
                <span
                  className="text-[10px] text-center leading-tight"
                  style={{ color: badge.earned ? "rgba(249,253,255,0.75)" : "rgba(249,253,255,0.22)" }}
                >
                  {badge.name}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Gifts */}
        <Section>
          <SectionHeader icon={<Gift size={18} color="#1AC8ED" />} title="Gifts" />
          <div className="mt-3 space-y-3">
            {GIFTS.length > 0 ? (
              GIFTS.map((gift) => (
                <div
                  key={gift.name}
                  className="flex items-start gap-3 rounded-xl p-3"
                  style={{
                    background: "rgba(26,200,237,0.05)",
                    border: "1px solid rgba(26,200,237,0.14)",
                  }}
                >
                  <span
                    className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: "#59FFA0" }}
                  />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#F9FDFF" }}>
                      {gift.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(249,253,255,0.48)" }}>
                      {gift.desc}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm" style={{ color: "rgba(249,253,255,0.32)" }}>
                No gifts available right now.
              </p>
            )}
          </div>
        </Section>
      </div>
    </main>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "#1E1D1F",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {children}
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span
        className="text-base font-semibold"
        style={{ fontFamily: "var(--font-rokkitt)", color: "#F9FDFF" }}
      >
        {title}
      </span>
    </div>
  )
}
