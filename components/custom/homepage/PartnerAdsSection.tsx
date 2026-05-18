"use client";

const banners = [
  {
    emoji: "🍳",
    name: "Jines Restaurant",
    category: "Dining",
    offer: "Rochester's iconic brunch. 15% off with your RTNY code.",
    cta: "Claim →",
    tint: "rgba(89,255,160,0.07)",
    border: "rgba(89,255,160,0.15)",
    logoBg: "rgba(89,255,160,0.12)",
    ctaBg: "rgba(89,255,160,0.1)",
  },
  {
    emoji: "🍾",
    name: "Nox Nightclub",
    category: "Nightlife",
    offer: "Skip the line. Free entry before 10PM Fri & Sat.",
    cta: "View Deal →",
    tint: "rgba(130,60,255,0.08)",
    border: "rgba(130,60,255,0.2)",
    logoBg: "rgba(130,60,255,0.15)",
    ctaBg: "rgba(130,60,255,0.12)",
  },
  {
    emoji: "🚗",
    name: "ROC Rides",
    category: "Transport",
    offer: "Safe rides home after the show. $3 off your first trip.",
    cta: "Book →",
    tint: "rgba(26,200,237,0.07)",
    border: "rgba(26,200,237,0.18)",
    logoBg: "rgba(26,200,237,0.12)",
    ctaBg: "rgba(26,200,237,0.1)",
  },
];

const cards = [
  {
    emoji: "🎳",
    name: "Bowl-O-Rama",
    category: "Fun",
    offer: "$5 off any lane",
    gradientA: "#1a2e1a",
    gradientB: "#0a140a",
  },
  {
    emoji: "🍕",
    name: "Good Luck",
    category: "Food",
    offer: "Free app w/ tickets",
    gradientA: "#2e1a0a",
    gradientB: "#140a0a",
  },
  {
    emoji: "💈",
    name: "ROC Cuts",
    category: "Style",
    offer: "10% off first visit",
    gradientA: "#1a0a2e",
    gradientB: "#0a0a14",
  },
  {
    emoji: "🎬",
    name: "The Little",
    category: "Film",
    offer: "2-for-1 Tuesdays",
    gradientA: "#0a2e2e",
    gradientB: "#0a1414",
  },
];

export default function PartnerAdsSection() {
  return (
    <div style={{ padding: "24px 16px", display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ── FORMAT A ── Full-width banners */}
      <div>
        {/* Section header */}
        <div style={{ marginBottom: 14 }}>
          <p
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              color: "#59FFA0",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 4,
            }}
          >
            Partners
          </p>
          <h2
            style={{
              fontFamily: "Rokkitt, serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#F9FDFF",
              lineHeight: 1.1,
            }}
          >
            Rochester's Best
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {banners.map((b) => (
            <div
              key={b.name}
              style={{
                borderRadius: 18,
                background: b.tint,
                border: `0.5px solid ${b.border}`,
                padding: "14px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {/* Logo box */}
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 14,
                  background: b.logoBg,
                  border: `0.5px solid ${b.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  flexShrink: 0,
                }}
              >
                {b.emoji}
              </div>

              {/* Text block */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: "Rubik, sans-serif",
                    fontSize: 9,
                    color: "rgba(249,253,255,0.4)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 2,
                  }}
                >
                  Sponsored · {b.category}
                </p>
                <p
                  style={{
                    fontFamily: "Rokkitt, serif",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#F9FDFF",
                    lineHeight: 1.15,
                    marginBottom: 2,
                  }}
                >
                  {b.name}
                </p>
                <p
                  style={{
                    fontFamily: "Rubik, sans-serif",
                    fontSize: 12,
                    color: "rgba(249,253,255,0.45)",
                    lineHeight: 1.35,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {b.offer}
                </p>
              </div>

              {/* CTA pill */}
              <button
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "0.5px solid rgba(255,255,255,0.15)",
                  borderRadius: 999,
                  padding: "8px 14px",
                  fontFamily: "Montserrat, sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#F9FDFF",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {b.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── FORMAT B ── Horizontal scroll cards */}
      <div>
        {/* Section header */}
        <div style={{ marginBottom: 14 }}>
          <p
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              color: "#59FFA0",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 4,
            }}
          >
            Partners
          </p>
          <h2
            style={{
              fontFamily: "Rokkitt, serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#F9FDFF",
              lineHeight: 1.1,
            }}
          >
            Rochester's Best
          </h2>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 4,
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          // hide webkit scrollbar via className below
          className="scrollbar-hide"
        >
          {cards.map((c) => (
            <div
              key={c.name}
              style={{
                width: 158,
                minWidth: 158,
                borderRadius: 18,
                background: "#1C1B1E",
                border: "0.5px solid rgba(255,255,255,0.08)",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {/* Image zone */}
              <div
                style={{
                  height: 100,
                  background: `linear-gradient(135deg, ${c.gradientA} 0%, ${c.gradientB} 100%)`,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 44,
                }}
              >
                {c.emoji}
                {/* gradient overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(to bottom, transparent 40%, #1C1B1E 100%)`,
                    pointerEvents: "none",
                  }}
                />
              </div>

              {/* Body */}
              <div style={{ padding: "10px 12px 12px" }}>
                <p
                  style={{
                    fontFamily: "Rubik, sans-serif",
                    fontSize: 9,
                    color: "rgba(249,253,255,0.4)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 3,
                  }}
                >
                  {c.category}
                </p>
                <p
                  style={{
                    fontFamily: "Rokkitt, serif",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#F9FDFF",
                    lineHeight: 1.15,
                    marginBottom: 4,
                  }}
                >
                  {c.name}
                </p>
                <p
                  style={{
                    fontFamily: "Rubik, sans-serif",
                    fontSize: 12,
                    color: "#59FFA0",
                    marginBottom: 10,
                    lineHeight: 1.3,
                  }}
                >
                  {c.offer}
                </p>
                <button
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    background: "rgba(89,255,160,0.1)",
                    border: "0.5px solid rgba(89,255,160,0.25)",
                    padding: "8px 0",
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#59FFA0",
                    cursor: "pointer",
                  }}
                >
                  Grab Deal
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
