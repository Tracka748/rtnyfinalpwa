"use client";

import { useState } from "react";

export default function SweepstakesSection() {
  const [entries, setEntries] = useState(0);
  const [entered, setEntered] = useState(false);

  function handleEnter() {
    setEntries((prev) => prev + 1);
    setEntered(true);
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
              Drawing in 3 days
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
                VIP Weekend Package
              </span>
              <span
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#59FFA0",
                }}
              >
                $500 value
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
              { label: "Total Entries", value: "2,841", valueColor: "#1AC8ED" },
              {
                label: "Your Entries",
                value: entries.toString(),
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
                68%
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
                  width: "68%",
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
              2,841 people entered this week
            </span>
          </div>

          {/* 6. CTA button */}
          <button
            onClick={handleEnter}
            style={{
              width: "100%",
              borderRadius: 16,
              background: entered
                ? "linear-gradient(90deg, #59FFA0 0%, #1AC8ED 100%)"
                : "linear-gradient(90deg, #823CFF 0%, #1AC8ED 100%)",
              border: "none",
              padding: "14px 0",
              fontFamily: "Montserrat, sans-serif",
              fontSize: 14,
              fontWeight: 800,
              color: "#F9FDFF",
              cursor: "pointer",
              letterSpacing: "0.01em",
              transition: "background 0.3s ease, transform 0.1s ease",
            }}
            onMouseDown={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.transform =
                "scale(0.98)")
            }
            onMouseUp={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.transform =
                "scale(1)")
            }
          >
            {entered
              ? "✓ Entered! Share for +1 entry"
              : "🎟️ Enter Now — It's Free"}
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
