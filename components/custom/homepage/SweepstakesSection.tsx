"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

interface SweepstakesData {
  id: string;
  prize_name: string;
  end_date: string;
  entry_count: number;
}

type EntryState = "idle" | "loading" | "entered" | "already_entered";

function getCountdownText(endDate: string): string {
  const diffMs = new Date(endDate).getTime() - Date.now();
  if (diffMs <= 0) return "Drawing soon";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `Drawing in ${days} day${days !== 1 ? "s" : ""}`;
  if (hours > 0) return `Drawing in ${hours} hour${hours !== 1 ? "s" : ""}`;
  return "Drawing soon";
}

export default function SweepstakesSection() {
  const router = useRouter();
  const [sweepstakes, setSweepstakes] = useState<SweepstakesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [entryState, setEntryState] = useState<EntryState>("idle");
  const [entryCount, setEntryCount] = useState(0);

  async function fetchActive() {
    try {
      const res = await fetch("/api/v1/sweepstakes/active");
      if (!res.ok) {
        setSweepstakes(null);
        return;
      }
      const data = await res.json();
      setSweepstakes(data);
      setEntryCount(data.entry_count);
    } catch {
      setSweepstakes(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchActive();
  }, []);

  async function handleEnter() {
    if (!sweepstakes || entryState === "loading" || entryState === "entered" || entryState === "already_entered") return;

    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setEntryState("loading");

    try {
      const res = await fetch("/api/v1/sweepstakes/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sweepstakes_id: sweepstakes.id }),
      });

      if (res.status === 409) {
        setEntryState("already_entered");
        return;
      }

      if (res.ok) {
        setEntryState("entered");
        const activeRes = await fetch("/api/v1/sweepstakes/active");
        if (activeRes.ok) {
          const data = await activeRes.json();
          setEntryCount(data.entry_count);
        }
      } else {
        setEntryState("idle");
      }
    } catch {
      setEntryState("idle");
    }
  }

  if (loading || !sweepstakes) return null;

  const isEntered = entryState === "entered" || entryState === "already_entered";
  const isLoading = entryState === "loading";
  const progressPct = Math.min(95, Math.round((entryCount / 5000) * 100));

  function getButtonLabel() {
    if (entryState === "entered") return "✓ You're entered!";
    if (entryState === "already_entered") return "✓ You're already in!";
    if (isLoading) return "Entering…";
    return "🎟️ Enter Now — It's Free";
  }

  return (
    <div className="w-full px-4 py-6 flex flex-col gap-3">
      {/* Main sweepstakes card */}
      <div
        style={{
          borderRadius: 22,
          background: "linear-gradient(135deg, #1a0a2e 0%, #0a0a14 100%)",
          border: "0.5px solid rgba(130,60,255,0.3)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Radial glow — purple top-right */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(130,60,255,0.22) 0%, transparent 70%)",
            filter: "blur(24px)",
            pointerEvents: "none",
          }}
        />
        {/* Radial glow — cyan bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(26,200,237,0.18) 0%, transparent 70%)",
            filter: "blur(24px)",
            pointerEvents: "none",
          }}
        />

        {/* Top section */}
        <div style={{ padding: "22px 18px 18px", position: "relative" }}>
          {/* 1. Badge row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <span
              style={{
                background:
                  "linear-gradient(90deg, rgba(130,60,255,0.35) 0%, rgba(26,200,237,0.25) 100%)",
                border: "0.5px solid rgba(130,60,255,0.4)",
                borderRadius: 999,
                padding: "4px 12px",
                fontSize: 12,
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 600,
                color: "#F9FDFF",
                letterSpacing: "0.02em",
              }}
            >
              🏆 Active Now
            </span>

            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#59FFA0",
                boxShadow: "0 0 6px 2px rgba(89,255,160,0.5)",
                animation: "pulse 1.6s ease-in-out infinite",
              }}
            />

            <span
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontSize: 12,
                fontWeight: 600,
                color: "#59FFA0",
              }}
            >
              {getCountdownText(sweepstakes.end_date)}
            </span>
          </div>

          {/* 2. Prize row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 16,
                background:
                  "linear-gradient(135deg, rgba(130,60,255,0.25) 0%, rgba(26,200,237,0.12) 100%)",
                border: "0.5px solid rgba(130,60,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 38,
                flexShrink: 0,
              }}
            >
              🎁
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span
                style={{
                  fontFamily: "Rubik, sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(249,253,255,0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Grand Prize
              </span>
              <span
                style={{
                  fontFamily: "Rokkitt, serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#F9FDFF",
                  lineHeight: 1.15,
                }}
              >
                {sweepstakes.prize_name}
              </span>
            </div>
          </div>

          {/* 3. Stats row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              marginBottom: 18,
            }}
          >
            {[
              { label: "Total Entries", value: entryCount.toLocaleString(), valueColor: "#1AC8ED" },
              {
                label: "Your Entries",
                value: isEntered ? "1" : "0",
                valueColor: "#F9FDFF",
              },
              { label: "Winners", value: "3", valueColor: "#F9FDFF" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 12,
                  padding: "10px 8px",
                  textAlign: "center",
                  border: "0.5px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  style={{
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: 18,
                    fontWeight: 800,
                    color: stat.valueColor,
                    lineHeight: 1.1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontFamily: "Rubik, sans-serif",
                    fontSize: 10,
                    color: "rgba(249,253,255,0.45)",
                    marginTop: 2,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* 4. Progress bar */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontFamily: "Rubik, sans-serif",
                  fontSize: 11,
                  color: "rgba(249,253,255,0.5)",
                }}
              >
                Entry pool filling up
              </span>
              <span
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#F9FDFF",
                }}
              >
                {progressPct}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  borderRadius: 999,
                  background:
                    "linear-gradient(90deg, #823CFF 0%, #1AC8ED 100%)",
                }}
              />
            </div>
          </div>

          {/* 5. Avatar stack */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <div style={{ display: "flex" }}>
              {["#823CFF", "#1AC8ED", "#59FFA0", "#F97316"].map(
                (color, i) => (
                  <div
                    key={i}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: color,
                      border: "2px solid #1a0a2e",
                      marginLeft: i === 0 ? 0 : -8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      color: "#121113",
                      fontWeight: 700,
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    {["A", "B", "C", "D"][i]}
                  </div>
                )
              )}
            </div>
            <span
              style={{
                fontFamily: "Rubik, sans-serif",
                fontSize: 11,
                color: "rgba(249,253,255,0.5)",
              }}
            >
              {entryCount.toLocaleString()} people entered this week
            </span>
          </div>

          {/* 6. CTA button */}
          <button
            onClick={handleEnter}
            disabled={isLoading}
            style={{
              width: "100%",
              borderRadius: 16,
              background: isEntered
                ? "linear-gradient(90deg, #59FFA0 0%, #1AC8ED 100%)"
                : "linear-gradient(90deg, #823CFF 0%, #1AC8ED 100%)",
              border: "none",
              padding: "14px 0",
              fontFamily: "Montserrat, sans-serif",
              fontSize: 14,
              fontWeight: 800,
              color: "#F9FDFF",
              cursor: isLoading ? "not-allowed" : "pointer",
              letterSpacing: "0.01em",
              opacity: isLoading ? 0.7 : 1,
              transition: "background 0.3s ease, transform 0.1s ease",
            }}
            onMouseDown={(e) => {
              if (!isLoading) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            {getButtonLabel()}
          </button>
        </div>

        {/* Card footer */}
        <div
          style={{
            borderTop: "0.5px solid rgba(255,255,255,0.07)",
            padding: "12px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <a
            href="#"
            style={{
              fontFamily: "Rubik, sans-serif",
              fontSize: 12,
              color: "rgba(249,253,255,0.3)",
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            How it works
          </a>
          <span
            style={{
              fontFamily: "Rubik, sans-serif",
              fontSize: 10,
              color: "rgba(249,253,255,0.25)",
            }}
          >
            No purchase necessary. See rules.
          </span>
        </div>
      </div>

      {/* Earn more entries strip */}
      <div
        style={{
          borderRadius: 16,
          background: "rgba(89,255,160,0.06)",
          border: "0.5px solid rgba(89,255,160,0.2)",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* Icon box */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "rgba(89,255,160,0.12)",
            border: "0.5px solid rgba(89,255,160,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          ⚡
        </div>

        {/* Text */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontSize: 13,
              fontWeight: 700,
              color: "#F9FDFF",
              marginBottom: 2,
            }}
          >
            Earn more entries
          </div>
          <div
            style={{
              fontFamily: "Rubik, sans-serif",
              fontSize: 11,
              color: "rgba(249,253,255,0.45)",
            }}
          >
            Buy a ticket · Share RTNY · Invite a friend
          </div>
        </div>

        {/* How pill */}
        <button
          style={{
            background: "#59FFA0",
            color: "#121113",
            border: "none",
            borderRadius: 999,
            padding: "7px 14px",
            fontFamily: "Montserrat, sans-serif",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          How →
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}
