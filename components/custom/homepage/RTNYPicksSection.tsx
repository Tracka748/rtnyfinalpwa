"use client"

// TODO: connect picks api

import { useState } from "react"
import { Moon, Ticket, Sparkles, Music, Film, Store } from "lucide-react"

// ─── Shared brand mark ───────────────────────────────────────────────────────

function BrandMark() {
  return (
    <div className="flex justify-center mt-3">
      <span className="font-header text-2xl font-black tracking-tight">
        <span className="text-[#1AC8ED]">Roc</span>
        <span className="text-[#F9FDFF]">Ticket</span>
        <span className="text-[#59FFA0]">Ny</span>
      </span>
    </div>
  )
}

// ─── Shared pagination dots ───────────────────────────────────────────────────

function Dots({ active }: { active: 0 | 1 | 2 }) {
  return (
    <div className="flex gap-2 justify-center mt-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width:      i === active ? 24 : 8,
            height:     8,
            background: i === active ? "#59FFA0" : "rgba(255,255,255,0.2)",
          }}
        />
      ))}
    </div>
  )
}

// ─── Card 1 — NightPicks ──────────────────────────────────────────────────────

function NightPicksCard() {
  const [selected, setSelected] = useState<"dead" | "allnight" | null>(null)

  return (
    <div
      className="w-full max-w-sm mx-auto flex flex-col relative overflow-hidden"
      style={{
        minHeight: "85vh",
        borderRadius: 24,
        background: "radial-gradient(ellipse at top, #2a0a40, #0d0a14)",
        border: "0.5px solid rgba(130,60,255,0.25)",
        padding: "28px 22px 22px",
      }}
    >
      {/* Purple ambient glow */}
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none"
        style={{
          top: -60,
          left: "50%",
          transform: "translateX(-50%)",
          width: 200,
          height: 200,
          background: "rgba(130,60,255,0.2)",
          filter: "blur(50px)",
        }}
      />

      <BrandMark />

      {/* Header */}
      <div className="flex items-center gap-2 relative z-10 mt-3">
        <Moon size={18} className="text-yellow-200" />
        <span className="font-label text-sm font-bold tracking-widest text-[#F9FDFF] uppercase">
          NightPicks
        </span>
      </div>
      <p className="font-sans text-sm text-[rgba(249,253,255,0.45)] mt-1 relative z-10">
        Pick the vibe. See if the night delivers.
      </p>

      {/* Visual zone */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <span
          className="font-slab-serif font-extrabold text-[#F9FDFF]"
          style={{ fontSize: "6rem", lineHeight: 1 }}
        >
          9PM
        </span>
        <span className="font-label text-xs tracking-widest text-[rgba(249,253,255,0.4)] uppercase mt-1">
          Doors Open
        </span>
        <div
          className="mt-4 px-5 py-2 rounded-full font-label text-sm font-bold uppercase"
          style={{
            background: "rgba(130,60,255,0.2)",
            border: "1px solid rgba(130,60,255,0.4)",
            color: "#c39fff",
          }}
        >
          Anthology
        </div>
      </div>

      {/* Choice row */}
      <div className="flex gap-3 mt-6 relative z-10">
        {([["dead", "Dead"], ["allnight", "All Night"]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelected(key)}
            className="flex-1 py-3 rounded-2xl font-label text-sm font-bold tracking-wider uppercase transition-all"
            style={{
              border:      selected === key ? "1px solid #59FFA0"              : "1px solid rgba(255,255,255,0.2)",
              background:  selected === key ? "rgba(89,255,160,0.1)"           : "rgba(255,255,255,0.05)",
              color:       selected === key ? "#59FFA0"                        : "#F9FDFF",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* CTA */}
      <button
        type="button"
        className="mt-3 w-full py-4 rounded-full font-label font-bold text-sm tracking-widest uppercase bg-[#59FFA0] text-[#121113]"
      >
        Pick the Night
      </button>

      <p className="text-center mt-3 font-label text-[10px] text-[rgba(249,253,255,0.3)] uppercase tracking-widest">
        How NightPicks Works
      </p>

      <Dots active={0} />
    </div>
  )
}

// ─── Card 2 — EventPicks ──────────────────────────────────────────────────────

function EventPicksCard() {
  const [selected, setSelected] = useState<"rock" | "comedy" | null>(null)

  return (
    <div
      className="w-full max-w-sm mx-auto flex flex-col relative overflow-hidden"
      style={{
        minHeight: "85vh",
        borderRadius: 24,
        background: "radial-gradient(ellipse at top, #0a1f40, #080d1a)",
        border: "0.5px solid rgba(26,200,237,0.2)",
        padding: "28px 22px 22px",
      }}
    >
      {/* Cyan ambient glow */}
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none"
        style={{
          top: -60,
          left: "50%",
          transform: "translateX(-50%)",
          width: 200,
          height: 200,
          background: "rgba(26,200,237,0.15)",
          filter: "blur(50px)",
        }}
      />

      <BrandMark />

      {/* Header */}
      <div className="flex items-center gap-2 relative z-10 mt-3">
        <Ticket size={18} className="text-[#1AC8ED]" />
        <span className="font-label text-sm font-bold tracking-widest text-[#F9FDFF] uppercase">
          EventPicks
        </span>
      </div>
      <p className="font-sans text-sm text-[rgba(249,253,255,0.45)] mt-1 relative z-10">
        Pick the event you think sells out first.
      </p>

      {/* VS visual zone */}
      <div className="flex-1 flex items-center gap-4 relative z-10">
        {/* Rock */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="flex items-center justify-center text-4xl rounded-2xl w-[72px] h-[72px] bg-[rgba(26,200,237,0.1)] border border-[rgba(26,200,237,0.2)]">
            🎸
          </div>
          <span className="font-sans text-xs font-semibold text-[rgba(249,253,255,0.7)] text-center">
            Rock Concert
          </span>
          <span className="font-sans text-[10px] text-[#1AC8ED]">214 left</span>
        </div>

        <span className="font-label text-sm font-bold text-[rgba(249,253,255,0.25)]">vs</span>

        {/* Comedy */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="flex items-center justify-center text-4xl rounded-2xl w-[72px] h-[72px] bg-[rgba(255,159,67,0.1)] border border-[rgba(255,159,67,0.2)]">
            🎭
          </div>
          <span className="font-sans text-xs font-semibold text-[rgba(249,253,255,0.7)] text-center">
            Comedy Night
          </span>
          <span className="font-sans text-[10px] text-[#FF9F43]">89 left</span>
        </div>
      </div>

      {/* Choice row — each button has its own active color */}
      <div className="flex gap-3 mt-6 relative z-10">
        <button
          type="button"
          onClick={() => setSelected("rock")}
          className={`flex-1 py-3 rounded-2xl font-label text-sm font-bold tracking-wider uppercase transition-all border ${
            selected === "rock"
              ? "border-[#1AC8ED] bg-[rgba(26,200,237,0.1)] text-[#1AC8ED]"
              : "border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.05)] text-[#F9FDFF]"
          }`}
        >
          Rock
        </button>
        <button
          type="button"
          onClick={() => setSelected("comedy")}
          className={`flex-1 py-3 rounded-2xl font-label text-sm font-bold tracking-wider uppercase transition-all border ${
            selected === "comedy"
              ? "border-[#FF9F43] bg-[rgba(255,159,67,0.1)] text-[#FF9F43]"
              : "border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.05)] text-[#F9FDFF]"
          }`}
        >
          Comedy
        </button>
      </div>

      {/* CTA */}
      <button
        type="button"
        className="mt-3 w-full py-4 rounded-full font-label font-bold text-sm tracking-widest uppercase text-[#121113] bg-[#1AC8ED]"
      >
        Make Your Pick
      </button>

      <p className="text-center mt-3 font-label text-[10px] text-[rgba(249,253,255,0.3)] uppercase tracking-widest">
        How EventPicks Works
      </p>

      <Dots active={1} />
    </div>
  )
}

// ─── Card 3 — RocPicks ────────────────────────────────────────────────────────

const ROC_PILLS = [
  {
    iconBgClass:    "bg-[rgba(89,255,160,0.12)]",
    iconColorClass: "text-[#59FFA0]",
    Icon:           Music,
    text:           "Who headlines Rocfest 2026?",
  },
  {
    iconBgClass:    "bg-[rgba(26,200,237,0.12)]",
    iconColorClass: "text-[#1AC8ED]",
    Icon:           Film,
    text:           "Best movie at The Little this weekend?",
  },
  {
    iconBgClass:    "bg-[rgba(255,159,67,0.12)]",
    iconColorClass: "text-[#FF9F43]",
    Icon:           Store,
    text:           "Hottest new spot in the ROC?",
  },
] as const

function RocPicksCard() {
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <div
      className="w-full max-w-sm mx-auto flex flex-col relative overflow-hidden min-h-[85vh] rounded-3xl pt-7 px-[22px] pb-[22px]"
      style={{
        background: "radial-gradient(ellipse at top, #1a0a0a, #120808)",
        border: "0.5px solid rgba(255,59,48,0.2)",
      }}
    >
      {/* Red ambient glow */}
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none -top-[60px] left-1/2 -translate-x-1/2 w-[200px] h-[200px]"
        style={{
          background: "rgba(255,59,48,0.15)",
          filter: "blur(50px)",
        }}
      />

      <BrandMark />

      {/* Header */}
      <div className="flex items-center gap-2 relative z-10 mt-3">
        <Sparkles size={18} className="text-[#FF3B30]" />
        <span className="font-label text-sm font-bold tracking-widest text-[#F9FDFF] uppercase">
          RocPicks
        </span>
      </div>
      <p className="font-sans text-sm text-[rgba(249,253,255,0.45)] mt-1 relative z-10">
        What&apos;s moving Rochester right now?
      </p>

      {/* Culture pills */}
      <div className="flex-1 flex flex-col gap-3 justify-center relative z-10">
        {ROC_PILLS.map(({ iconBgClass, iconColorClass, Icon, text }, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelected(selected === i ? null : i)}
            className={`flex items-center gap-3 p-3 rounded-2xl w-full text-left transition-all border ${
              selected === i
                ? "bg-[rgba(255,59,48,0.1)] border-[rgba(255,59,48,0.3)]"
                : "bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.09)]"
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
              <Icon size={15} className={iconColorClass} />
            </div>
            <span className="font-sans text-sm text-[rgba(249,253,255,0.75)]">{text}</span>
          </button>
        ))}
      </div>

      {/* CTA */}
      <button
        type="button"
        className="mt-6 w-full py-4 rounded-full font-label font-bold text-sm tracking-widest uppercase text-white bg-[#FF3B30]"
      >
        Pick Now
      </button>

      <p className="text-center mt-3 font-label text-[10px] text-[rgba(249,253,255,0.3)] uppercase tracking-widest">
        How RocPicks Works
      </p>

      <Dots active={2} />
    </div>
  )
}

// ─── Section shell — sticky stack scroll ──────────────────────────────────────

export default function RTNYPicksSection() {
  return (
    <section className="bg-[#121113]">
      <div className="relative min-h-[300vh]">

        {/* Section header — scrolls away normally, not sticky */}
        <div className="px-5 pt-8 pb-6">
          <h2 className="font-slab-serif font-bold text-[#F9FDFF] text-[26px]">
            🎯 RTNY Picks
          </h2>
          <p className="font-sans text-sm text-[rgba(249,253,255,0.5)] mt-1">
            Rochester&apos;s live prediction game — pick, debate, win.
          </p>
        </div>

        {/*
          Each card wrapper is:
            sticky top-0  → sticks to viewport top
            h-screen      → its containing-block is 100vh tall, giving
                            the next card ~100vh of travel before it covers this one
            z-[10/20/30]  → later cards render on top as they slide up
        */}

        {/* Card 1 — anchors first; cards 2 & 3 slide up over it */}
        <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center z-10 px-4">
          <NightPicksCard />
        </div>

        {/* Card 2 — slides up and covers card 1 */}
        <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center z-20 px-4">
          <EventPicksCard />
        </div>

        {/* Card 3 — slides up and covers card 2 */}
        <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center z-30 px-4">
          <RocPicksCard />
        </div>

      </div>
    </section>
  )
}
