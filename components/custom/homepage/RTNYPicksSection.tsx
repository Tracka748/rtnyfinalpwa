"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Ticket, Sparkles, ExternalLink } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"

// ─── Types ─────────────────────────────────────────────────────────────────

type CardType = "vs" | "list3"
type Mode = "survey" | "promo"

interface PicksCardOption {
  id: string
  card_id: string
  option_order: number
  label: string
  link_url: string | null
  vote_count: number
  created_at: string
}

interface PicksCard {
  id: string
  card_type: CardType
  mode: Mode
  title: string
  background_image_url: string | null
  background_color: string | null
  categories: string[]
  display_order: number
  is_active: boolean
  start_date: string | null
  end_date: string | null
  picks_card_options: PicksCardOption[]
  user_vote_option_id: string | null
}

// Ambient glow theme cycled per card position, matching the three looks
// (purple / cyan / red) the original hardcoded demo used per-card.
const GLOW_THEMES = [
  { glow: "rgba(130,60,255,0.2)", border: "rgba(130,60,255,0.25)", accent: "#823CFF" },
  { glow: "rgba(26,200,237,0.15)", border: "rgba(26,200,237,0.2)", accent: "#1AC8ED" },
  { glow: "rgba(255,59,48,0.15)", border: "rgba(255,59,48,0.2)", accent: "#FF3B30" },
]

// Solid badge backgrounds — mint / cyan, matching the app's existing
// solid-accent-background + dark-text button convention (e.g. JoinGroupButton).
const OPTION_BADGE_ACCENTS = ["#59FFA0", "#1AC8ED"]
const BADGE_TEXT_COLOR = "#121113"

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

function Dots({ active, count }: { active: number; count: number }) {
  if (count <= 1) return null
  return (
    <div className="flex gap-2 justify-center mt-4">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === active ? 24 : 8,
            height: 8,
            background: i === active ? "#59FFA0" : "rgba(255,255,255,0.2)",
          }}
        />
      ))}
    </div>
  )
}

// ─── Percentage helper ────────────────────────────────────────────────────────

function computePercentages(options: PicksCardOption[]): Map<string, number> {
  const total = options.reduce((sum, o) => sum + o.vote_count, 0)
  const map = new Map<string, number>()
  for (const o of options) {
    map.set(o.id, total === 0 ? 0 : Math.round((o.vote_count / total) * 100))
  }
  return map
}

// ─── VS options (two-option split) ────────────────────────────────────────────

interface OptionsProps {
  options: PicksCardOption[]
  mode: Mode
  revealed: boolean
  percentages: Map<string, number> | null
  selectedId: string | null
  disabled: boolean
  onSelect: (option: PicksCardOption) => void
}

function VsOptions({ options, mode, revealed, percentages, selectedId, disabled, onSelect }: OptionsProps) {
  const [a, b] = options
  if (!a || !b) return null

  function renderOption(opt: PicksCardOption, i: number) {
    const color = OPTION_BADGE_ACCENTS[i % OPTION_BADGE_ACCENTS.length]
    const isSelected = selectedId === opt.id
    const pct = percentages?.get(opt.id) ?? 0

    return (
      <button
        key={opt.id}
        type="button"
        disabled={disabled || revealed}
        onClick={() => onSelect(opt)}
        className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-6 transition-all border-4 touch-manipulation disabled:cursor-not-allowed"
        style={{
          background: color,
          borderColor: revealed && isSelected ? "#F9FDFF" : "transparent",
          opacity: revealed && !isSelected ? 0.55 : 1,
        }}
      >
        <span
          className="font-label text-base sm:text-lg font-black text-center leading-tight line-clamp-2"
          style={{ color: BADGE_TEXT_COLOR }}
        >
          {opt.label}
        </span>
        {mode === "promo" && opt.link_url && (
          <ExternalLink size={14} style={{ color: BADGE_TEXT_COLOR }} className="opacity-60" />
        )}
        {revealed && (
          <span className="font-label text-sm font-extrabold" style={{ color: BADGE_TEXT_COLOR }}>
            {pct}%{isSelected ? " · Your pick" : ""}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {renderOption(a, 0)}
        <span className="font-label text-sm font-bold text-white/25">vs</span>
        {renderOption(b, 1)}
      </div>
      {revealed && (
        <div className="flex h-1.5 rounded-full overflow-hidden bg-white/10">
          <div style={{ width: `${percentages?.get(a.id) ?? 0}%`, background: OPTION_BADGE_ACCENTS[0] }} />
          <div style={{ width: `${percentages?.get(b.id) ?? 0}%`, background: OPTION_BADGE_ACCENTS[1] }} />
        </div>
      )}
    </div>
  )
}

// ─── List3 options (vertical three-item list) ─────────────────────────────────

function List3Options({ options, mode, revealed, percentages, selectedId, disabled, onSelect }: OptionsProps) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((opt, i) => {
        const color = OPTION_BADGE_ACCENTS[i % OPTION_BADGE_ACCENTS.length]
        const isSelected = selectedId === opt.id
        const pct = percentages?.get(opt.id) ?? 0

        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled || revealed}
            onClick={() => onSelect(opt)}
            className="relative flex items-center gap-3 px-4 py-4 rounded-2xl w-full text-left transition-all border-4 overflow-hidden touch-manipulation disabled:cursor-not-allowed"
            style={{
              background: color,
              borderColor: revealed && isSelected ? "#F9FDFF" : "transparent",
              opacity: revealed && !isSelected ? 0.55 : 1,
            }}
          >
            {revealed && (
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 transition-all"
                style={{ width: `${pct}%`, background: "rgba(18,17,19,0.12)" }}
              />
            )}
            <div
              className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-label text-sm font-black"
              style={{ background: "rgba(18,17,19,0.15)", color: BADGE_TEXT_COLOR }}
            >
              {i + 1}
            </div>
            <span
              className="relative font-sans text-base font-bold flex-1 min-w-0 truncate"
              style={{ color: BADGE_TEXT_COLOR }}
            >
              {opt.label}
            </span>
            {mode === "promo" && opt.link_url && (
              <ExternalLink size={14} style={{ color: BADGE_TEXT_COLOR }} className="relative opacity-60 shrink-0" />
            )}
            {revealed && (
              <span className="relative font-label text-sm font-extrabold shrink-0" style={{ color: BADGE_TEXT_COLOR }}>
                {pct}%{isSelected ? " ✓" : ""}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Single card ───────────────────────────────────────────────────────────────

interface PicksCardViewProps {
  card: PicksCard
  index: number
  totalCards: number
  isVoting: boolean
  voteError: string | null
  onSelectOption: (card: PicksCard, option: PicksCardOption) => void
}

function PicksCardView({ card, index, totalCards, isVoting, voteError, onSelectOption }: PicksCardViewProps) {
  const theme = GLOW_THEMES[index % GLOW_THEMES.length]
  const hasImage = !!card.background_image_url
  const sortedOptions = [...card.picks_card_options].sort((a, b) => a.option_order - b.option_order)
  const revealed = card.mode === "survey" && !!card.user_vote_option_id
  const percentages = revealed ? computePercentages(sortedOptions) : null

  const Options = card.card_type === "vs" ? VsOptions : List3Options

  return (
    <div
      className="w-full max-w-sm mx-auto flex flex-col relative overflow-hidden min-h-[85vh] rounded-3xl"
      style={{
        backgroundImage: hasImage ? `url(${card.background_image_url})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: hasImage ? undefined : card.background_color || "#1a1a1a",
        border: `0.5px solid ${theme.border}`,
        padding: "28px 22px 22px",
      }}
    >
      {/* Legibility overlay — darker gradient over a photo, soft ambient wash over a flat color */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: hasImage
            ? "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.75) 100%)"
            : "radial-gradient(ellipse at top, rgba(255,255,255,0.05), transparent 60%)",
        }}
      />

      {/* Ambient glow blob */}
      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none -top-[60px] left-1/2 -translate-x-1/2 w-[200px] h-[200px]"
        style={{ background: theme.glow, filter: "blur(50px)" }}
      />

      <div className="flex flex-col flex-1 relative z-10">
        <BrandMark />

        <div className="flex items-center gap-2 relative z-10 mt-3">
          {card.mode === "promo" ? (
            <Sparkles size={18} style={{ color: theme.accent }} />
          ) : (
            <Ticket size={18} style={{ color: theme.accent }} />
          )}
          <span className="font-label text-sm font-bold tracking-widest text-[#F9FDFF] uppercase">
            {card.title}
          </span>
        </div>

        {card.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 relative z-10">
            {card.categories.map((cat) => (
              <span
                key={cat}
                className="text-[10px] px-2 py-0.5 rounded-full border border-white/15 bg-white/5 text-white/70 uppercase tracking-wide"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center relative z-10">
          <Options
            options={sortedOptions}
            mode={card.mode}
            revealed={revealed}
            percentages={percentages}
            selectedId={card.user_vote_option_id}
            disabled={isVoting}
            onSelect={(opt) => onSelectOption(card, opt)}
          />
        </div>

        {voteError && (
          <p className="text-center mt-2 text-xs text-red-400 relative z-10">{voteError}</p>
        )}

        <p className="text-center mt-3 font-label text-[10px] text-[rgba(249,253,255,0.3)] uppercase tracking-widest relative z-10">
          {card.mode === "promo"
            ? "Tap to explore"
            : revealed
              ? "Results"
              : isVoting
                ? "Casting your vote…"
                : "Tap to vote"}
        </p>

        <Dots active={index} count={totalCards} />
      </div>
    </div>
  )
}

// ─── Section shell — sticky stack scroll ──────────────────────────────────────

export default function RTNYPicksSection() {
  const router = useRouter()
  const [cards, setCards] = useState<PicksCard[]>([])
  const [loading, setLoading] = useState(true)
  const [votingCardId, setVotingCardId] = useState<string | null>(null)
  const [voteErrors, setVoteErrors] = useState<Record<string, string>>({})

  async function fetchCards() {
    try {
      const res = await fetch("/api/v1/picks-cards")
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load picks")
      setCards(json.data ?? [])
    } catch (err) {
      console.error("RTNYPicksSection fetch error:", err)
      setCards([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCards()
  }, [])

  async function handleSelectOption(card: PicksCard, option: PicksCardOption) {
    if (card.mode === "promo") {
      if (option.link_url) window.open(option.link_url, "_blank", "noopener,noreferrer")
      return
    }

    // Survey mode: no re-voting once we already know their choice.
    if (card.user_vote_option_id || votingCardId === card.id) return

    const supabase = createBrowserSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login?redirect=/")
      return
    }

    setVotingCardId(card.id)
    setVoteErrors((prev) => ({ ...prev, [card.id]: "" }))

    try {
      const res = await fetch(`/api/v1/picks-cards/${card.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_id: option.id }),
      })
      const json = await res.json()

      if (res.ok && json.success) {
        setCards((prev) =>
          prev.map((c) =>
            c.id !== card.id
              ? c
              : {
                  ...c,
                  user_vote_option_id: option.id,
                  picks_card_options: c.picks_card_options.map((o) =>
                    o.id === option.id ? { ...o, vote_count: json.data.vote_count } : o
                  ),
                }
          )
        )
        return
      }

      // Already voted (e.g. voted from another tab) — resync from the server
      // instead of showing an error; the card should just render as revealed.
      if (res.status === 409 && json.code === "ALREADY_VOTED") {
        await fetchCards()
        return
      }

      if (res.status === 401) {
        router.push("/login?redirect=/")
        return
      }

      setVoteErrors((prev) => ({ ...prev, [card.id]: json.error || "Something went wrong. Try again." }))
    } catch (err) {
      console.error("RTNYPicksSection vote error:", err)
      setVoteErrors((prev) => ({ ...prev, [card.id]: "Something went wrong. Try again." }))
    } finally {
      setVotingCardId(null)
    }
  }

  if (loading || cards.length === 0) return null

  return (
    <section className="bg-[#121113]">
      <div className="relative" style={{ minHeight: `${cards.length * 100}vh` }}>

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
            zIndex        → later cards render on top as they slide up
        */}
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="sticky top-0 h-screen overflow-hidden flex items-center justify-center px-4"
            style={{ zIndex: 10 + index * 10 }}
          >
            <PicksCardView
              card={card}
              index={index}
              totalCards={cards.length}
              isVoting={votingCardId === card.id}
              voteError={voteErrors[card.id] || null}
              onSelectOption={handleSelectOption}
            />
          </div>
        ))}

      </div>
    </section>
  )
}
