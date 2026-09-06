"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import VibePulseModule from "@/components/custom/homepage/VibePulseModule";

const CHAR_MAPS = {
  A:[[0,1,1,0],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
  B:[[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,0,1],[1,1,1,0]],
  C:[[0,1,1,1],[1,0,0,0],[1,0,0,0],[1,0,0,0],[0,1,1,1]],
  D:[[1,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,0]],
  E:[[1,1,1,1],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,1,1,1]],
  F:[[1,1,1,1],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,0,0,0]],
  G:[[0,1,1,1],[1,0,0,0],[1,0,1,1],[1,0,0,1],[0,1,1,1]],
  H:[[1,0,0,1],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
  I:[[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
  J:[[0,0,1],[0,0,1],[0,0,1],[1,0,1],[0,1,1]],
  K:[[1,0,0,1],[1,0,1,0],[1,1,0,0],[1,0,1,0],[1,0,0,1]],
  L:[[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
  M:[[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  N:[[1,0,0,1],[1,1,0,1],[1,0,1,1],[1,0,0,1],[1,0,0,1]],
  O:[[0,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[0,1,1,0]],
  P:[[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,0,0],[1,0,0,0]],
  R:[[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,1,0],[1,0,0,1]],
  S:[[0,1,1,1],[1,0,0,0],[0,1,1,0],[0,0,0,1],[1,1,1,0]],
  T:[[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
  U:[[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,0,0,1],[0,1,1,0]],
  Y:[[1,0,1],[1,0,1],[0,1,0],[0,1,0],[0,1,0]],
  " ":[[0,0],[0,0],[0,0],[0,0],[0,0]],
  0:[[0,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[0,1,1,0]],
  1:[[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
  2:[[0,1,1,0],[1,0,0,1],[0,0,1,0],[0,1,0,0],[1,1,1,1]],
  3:[[1,1,1,0],[0,0,0,1],[0,1,1,0],[0,0,0,1],[1,1,1,0]],
  4:[[1,0,0,1],[1,0,0,1],[1,1,1,1],[0,0,0,1],[0,0,0,1]],
  5:[[1,1,1,1],[1,0,0,0],[1,1,1,0],[0,0,0,1],[1,1,1,0]],
  6:[[0,1,1,0],[1,0,0,0],[1,1,1,0],[1,0,0,1],[0,1,1,0]],
  7:[[1,1,1,1],[0,0,0,1],[0,0,1,0],[0,1,0,0],[0,1,0,0]],
  8:[[0,1,1,0],[1,0,0,1],[0,1,1,0],[1,0,0,1],[0,1,1,0]],
  9:[[0,1,1,0],[1,0,0,1],[0,1,1,1],[0,0,0,1],[0,1,1,0]],
  $:[[0,1,1,0],[1,1,0,0],[0,1,1,0],[0,0,1,1],[0,1,1,0]],
};

function LEDChar({ char, dotSize = 7, gap = 2.2, color = "#59FFA0", revealed = true }) {
  const map = CHAR_MAPS[char?.toUpperCase()] ?? CHAR_MAPS[" "];
  const dim = "#1c1c1c";
  const step = dotSize + gap;
  const w = (map[0]?.length || 0) * step;
  const h = map.length * step;
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      {map.map((row, r) => row.map((lit, c) => {
        const cx = c * step + dotSize / 2;
        const cy = r * step + dotSize / 2;
        const isLit = lit && revealed;
        return (
          <circle key={`${r}-${c}`} cx={cx} cy={cy} r={dotSize / 2}
            fill={isLit ? color : dim}
            style={{
              transition: "fill 0.12s ease",
              filter: isLit ? `drop-shadow(0 0 ${dotSize * 0.55}px ${color})` : "none",
            }}
          />
        );
      }))}
    </svg>
  );
}

function LEDWord({ text = "", dotSize = 7, gap = 2.2, charGap = 6, color = "#59FFA0" }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: charGap }}>
      {text.split("").map((ch, i) => (
        <LEDChar key={i} char={ch} dotSize={dotSize} gap={gap} color={color} revealed />
      ))}
    </div>
  );
}

function LEDReveal({ text, dotSize = 7, gap = 2.2, charGap = 6, color = "#59FFA0", stagger = 55 }) {
  const [revealed, setRevealed] = useState([]);
  useEffect(() => {
    setRevealed([]);
    text.split("").forEach((_, i) =>
      setTimeout(() => setRevealed(p => [...p, i]), i * stagger + 150)
    );
  }, [text]);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: charGap }}>
      {text.split("").map((ch, i) => (
        <LEDChar key={i} char={ch} dotSize={dotSize} gap={gap} color={color} revealed={revealed.includes(i)} />
      ))}
    </div>
  );
}

function LEDTotal({ value, dotSize = 9, gap = 2.5, charGap = 6, color = "#F9FDFF" }) {
  const [display, setDisplay] = useState(value);
  const raf = useRef(null);
  const prev = useRef(value);
  useEffect(() => {
    const start = prev.current;
    const end = value;
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min((now - t0) / 500, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * e));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else prev.current = end;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <LEDWord text={`$${display}`} dotSize={dotSize} gap={gap} charGap={charGap} color={color} />;
}

const PLANS = [
  {
    icon: "🌙", name: "Friday Night Out", badge: "NIGHTLIFE",
    stops: [
      { num: "1", icon: "🍸", name: "The Revelry",        time: "8:00 PM",  loc: "Downtown ROC", price: 25 },
      { num: "2", icon: "🎵", name: "Montage Music Hall", time: "9:30 PM",  loc: "Downtown ROC", price: 35 },
      { num: "3", icon: "🌃", name: "After Hours Lounge", time: "11:30 PM", loc: "East Ave",     price: 20 },
    ],
  },
  {
    icon: "☀️", name: "Sunday Funday", badge: "FAMILY",
    stops: [
      { num: "1", icon: "🍳", name: "Nosh",            time: "11:00 AM", loc: "South Wedge",  price: 18 },
      { num: "2", icon: "🌿", name: "Highland Park",   time: "1:00 PM",  loc: "Monroe Ave",   price: 0  },
      { num: "3", icon: "🍦", name: "Abbott's Custard", time: "3:00 PM", loc: "Irondequoit",  price: 8  },
    ],
  },
  {
    icon: "💫", name: "Date Night ROC", badge: "ROMANCE",
    stops: [
      { num: "1", icon: "🍷", name: "Revelry Kitchen",    time: "6:30 PM",  loc: "East Ave",     price: 60 },
      { num: "2", icon: "😂", name: "Comedy @ The Spot",  time: "8:30 PM",  loc: "Alexander St", price: 25 },
      { num: "3", icon: "🎶", name: "The Bop Shop",        time: "10:00 PM", loc: "South Wedge",  price: 10 },
    ],
  },
  {
    icon: "👨‍👩‍👧", name: "Family Saturday", badge: "FAMILY",
    stops: [
      { num: "1", icon: "🏛️", name: "Strong Museum",    time: "10:00 AM", loc: "Manhattan Sq", price: 18 },
      { num: "2", icon: "🌮", name: "Nick Tahou's",      time: "12:30 PM", loc: "W Main St",    price: 12 },
      { num: "3", icon: "⛸️", name: "Innovative Field", time: "3:00 PM",  loc: "Downtown ROC", price: 15 },
    ],
  },
  {
    icon: "🥁", name: "Afrobeats Night", badge: "NIGHTLIFE",
    stops: [
      { num: "1", icon: "🍽️", name: "Ras Tejbir",        time: "7:30 PM",  loc: "Monroe Ave",   price: 20 },
      { num: "2", icon: "🎵", name: "Afrobeats Venue",   time: "9:00 PM",  loc: "Downtown ROC", price: 20 },
      { num: "3", icon: "🌃", name: "Late Night Lounge", time: "11:30 PM", loc: "East Ave",     price: 10 },
    ],
  },
  {
    icon: "🖼️", name: "Art & Coffee", badge: "CULTURE",
    stops: [
      { num: "1", icon: "☕", name: "Java's Cafe",           time: "9:00 AM",  loc: "Gibbs St",   price: 8  },
      { num: "2", icon: "🎨", name: "Memorial Art Gallery",  time: "10:00 AM", loc: "University", price: 15 },
      { num: "3", icon: "🎭", name: "Little Theatre",         time: "12:30 PM", loc: "East Ave",   price: 12 },
    ],
  },
];

const BADGE_COLORS = {
  NIGHTLIFE: { bg: "rgba(180,100,255,0.12)", border: "rgba(180,100,255,0.3)", color: "#C87FFF" },
  FAMILY:    { bg: "rgba(26,200,237,0.1)",   border: "rgba(26,200,237,0.3)",  color: "#1AC8ED" },
  ROMANCE:   { bg: "rgba(255,100,140,0.1)",  border: "rgba(255,100,140,0.3)", color: "#FF7EB3" },
  CULTURE:   { bg: "rgba(89,255,160,0.08)",  border: "rgba(89,255,160,0.25)", color: "#59FFA0" },
};

export default function PlanYourDayCard() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [removed, setRemoved] = useState([]);
  const [exiting, setExiting] = useState(false);
  const [exitDir, setExitDir] = useState(0);
  const [revealKey, setRevealKey] = useState(0);
  const touchStart = useRef(null);

  const plan = PLANS[current];
  const activeStops = plan.stops.filter((_, i) => !removed.includes(i));
  const total = activeStops.reduce((s, st) => s + st.price, 0);
  const bc = BADGE_COLORS[plan.badge] || BADGE_COLORS.CULTURE;

  const navigate = (dir) => {
    const next = current + dir;
    if (next < 0 || next >= PLANS.length) return;
    setExiting(true);
    setExitDir(dir);
    setTimeout(() => {
      setCurrent(next);
      setRemoved([]);
      setRevealKey(k => k + 1);
      setExiting(false);
    }, 240);
  };

  const toggleStop = (i) =>
    setRemoved(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  return (
    <div style={{
      background: "#060606",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "28px 18px 36px",
      fontFamily: "'Inter', sans-serif",
      WebkitFontSmoothing: "antialiased",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DotGothic16&family=Silkscreen:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── SECTION HEADER ── */}
      <div style={{ width:"100%", maxWidth:400, display:"flex", justifyContent:"center", marginBottom:18, animation:"fadeUp 0.35s ease both" }}>
        <VibePulseModule />
      </div>

      {/* ── CARD ── */}
      <div
        onTouchStart={e => { touchStart.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          const dx = e.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(dx) > 42) navigate(dx < 0 ? 1 : -1);
        }}
        style={{
          width:"100%", maxWidth:400,
          background:"#090909",
          border:"1.5px solid rgba(89,255,160,0.18)",
          borderRadius:20,
          padding:"26px 22px 22px",
          position:"relative",
          overflow:"hidden",
          boxShadow:"0 0 0 1px rgba(89,255,160,0.04), 0 0 60px rgba(89,255,160,0.07), inset 0 0 80px rgba(0,0,0,0.6)",
          transition:"transform 0.24s ease, opacity 0.24s ease",
          transform: exiting ? `translateX(${exitDir < 0 ? 60 : -60}px)` : "translateX(0)",
          opacity: exiting ? 0 : 1,
        }}
      >
        {/* dot grid bg */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.35, pointerEvents:"none" }}>
          <defs>
            <pattern id="dg" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="0.75" fill="#1d1d1d" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dg)" />
        </svg>

        {/* scanlines */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:1, borderRadius:"inherit", background:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 4px)" }} />

        {/* corner brackets */}
        {[
          [{ top:11, left:11 },   { bt:true, bl:true }],
          [{ top:11, right:11 },  { bt:true, br:true }],
          [{ bottom:11, left:11 }, { bb:true, bl:true }],
          [{ bottom:11, right:11 },{ bb:true, br:true }],
        ].map(([pos], i) => (
          <div key={i} style={{
            position:"absolute", width:13, height:13, zIndex:2,
            ...pos,
            borderColor:"rgba(89,255,160,0.35)", borderStyle:"solid",
            borderTopWidth:    i < 2 ? 2 : 0,
            borderBottomWidth: i >= 2 ? 2 : 0,
            borderLeftWidth:   (i === 0 || i === 2) ? 2 : 0,
            borderRightWidth:  (i === 1 || i === 3) ? 2 : 0,
          }} />
        ))}

        <div style={{ position:"relative", zIndex:5 }}>

          {/* ── BRAND ── */}
          <div style={{ display:"flex", justifyContent:"center", alignItems:"flex-start", gap:6, marginBottom:16 }}>
            <LEDWord text="ROC"    dotSize={4} gap={1.2} charGap={4} color="#1AC8ED" />
            <LEDWord text="TICKET" dotSize={4} gap={1.2} charGap={4} color="#F9FDFF" />
            <LEDWord text="NY"     dotSize={4} gap={1.2} charGap={4} color="#59FFA0" />
          </div>

          {/* ── BIG TITLE ── */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, marginBottom:16 }}>
            <LEDReveal key={`t1-${revealKey}`} text="PLAN"     dotSize={9} gap={2.5} charGap={9} color="#59FFA0" stagger={55} />
            <LEDReveal key={`t2-${revealKey}`} text="YOUR DAY" dotSize={9} gap={2.5} charGap={9} color="#59FFA0" stagger={45} />
          </div>

          {/* ── PLAN NAME + BADGE ── */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:9, marginBottom:14 }}>
            <span style={{ fontSize:17 }}>{plan.icon}</span>
            <span style={{ fontFamily:"'DotGothic16',monospace", fontSize:15, color:"#F9FDFF", letterSpacing:"0.03em" }}>
              {plan.name}
            </span>
            <span style={{
              fontFamily:"'Silkscreen',monospace", fontSize:7,
              padding:"3px 8px", borderRadius:5,
              background: bc.bg, border:`1px solid ${bc.border}`, color: bc.color,
              letterSpacing:"0.5px",
            }}>{plan.badge}</span>
          </div>

          {/* divider */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
            <div style={{ flex:1, height:1, background:"linear-gradient(90deg,transparent,rgba(89,255,160,0.18),transparent)" }} />
            <span style={{ fontFamily:"'Silkscreen',monospace", fontSize:7, color:"rgba(89,255,160,0.28)", letterSpacing:"2px" }}>TAP TO TOGGLE</span>
            <div style={{ flex:1, height:1, background:"linear-gradient(90deg,transparent,rgba(89,255,160,0.18),transparent)" }} />
          </div>

          {/* ── STOP ROWS ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:9, marginBottom:18 }}>
            {plan.stops.map((stop, i) => {
              const off = removed.includes(i);
              return (
                <div key={i} onClick={() => toggleStop(i)} style={{
                  display:"flex", alignItems:"center", gap:11,
                  border:`1px dashed ${off ? "rgba(89,255,160,0.1)" : "rgba(89,255,160,0.22)"}`,
                  borderRadius:11, padding:"11px 13px",
                  background: off ? "transparent" : "rgba(89,255,160,0.02)",
                  opacity: off ? 0.3 : 1,
                  cursor:"pointer",
                  transition:"all 0.25s",
                }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth:26 }}>
                    <LEDWord text={stop.num} dotSize={5} gap={1.5} charGap={3} color="#59FFA0" />
                    <div style={{ fontFamily:"'Silkscreen',monospace", fontSize:6, color:"rgba(89,255,160,0.3)", letterSpacing:"1px", marginTop:2 }}>STOP</div>
                  </div>
                  <div style={{ width:38, height:38, borderRadius:"50%", border:"1px solid rgba(89,255,160,0.22)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0, background:"rgba(89,255,160,0.03)" }}>
                    {stop.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"'DotGothic16',monospace", fontSize:13, color:"#F9FDFF", letterSpacing:"0.02em", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {stop.name}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:3 }}>
                      <span style={{ fontFamily:"'Silkscreen',monospace", fontSize:8, color:"rgba(26,200,237,0.6)", letterSpacing:"0.3px" }}>{stop.time}</span>
                      <div style={{ width:2, height:2, borderRadius:"50%", background:"rgba(255,255,255,0.15)", flexShrink:0 }} />
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:"rgba(249,253,255,0.32)", fontWeight:400 }}>{stop.loc}</span>
                    </div>
                  </div>
                  <div style={{ fontFamily:"'DotGothic16',monospace", fontSize:16, color: off ? "rgba(89,255,160,0.25)" : "#59FFA0", textShadow: off ? "none" : "0 0 8px rgba(89,255,160,0.4)", flexShrink:0, textDecoration: off ? "line-through" : "none" }}>
                    ${stop.price}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── TOTAL ROW ── */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", borderTop:"1px dashed rgba(89,255,160,0.14)", paddingTop:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:20 }}>🎟️</span>
              <div>
                <div style={{ fontFamily:"'Silkscreen',monospace", fontSize:7, color:"rgba(249,253,255,0.25)", letterSpacing:"2.5px" }}>YOUR DAY</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:"rgba(26,200,237,0.55)", fontWeight:400, marginTop:3 }}>
                  {activeStops.length} of {plan.stops.length} stops · Rochester
                </div>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Silkscreen',monospace", fontSize:7, color:"rgba(249,253,255,0.25)", letterSpacing:"2.5px", marginBottom:6 }}>TOTAL</div>
              <LEDTotal key={`tot-${current}-${removed.join()}`} value={total} dotSize={8} gap={2.2} charGap={5} color="#F9FDFF" />
            </div>
          </div>

          {/* ── CTA ── */}
          <button style={{
            width:"100%", marginTop:18, padding:"14px 0",
            background:"transparent",
            border:"1.5px solid rgba(89,255,160,0.38)",
            borderRadius:10, cursor:"pointer",
            fontFamily:"'DotGothic16',monospace",
            fontSize:15, color:"#59FFA0",
            letterSpacing:"0.06em",
            textShadow:"0 0 10px rgba(89,255,160,0.35)",
            boxShadow:"0 0 20px rgba(89,255,160,0.05)",
            transition:"all 0.2s",
          }}
            onMouseOver={e => { e.currentTarget.style.background="rgba(89,255,160,0.07)"; e.currentTarget.style.boxShadow="0 0 28px rgba(89,255,160,0.15)"; }}
            onMouseOut={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.boxShadow="0 0 20px rgba(89,255,160,0.05)"; }}
            onClick={() => {
              const planData = {
                title: plan.name,
                date: new Date().toISOString().split('T')[0],
                badge: plan.badge,
                stops: activeStops.map(s => ({
                  name: s.name,
                  category: 'venue',
                  icon: s.icon,
                  time: s.time,
                  address: s.loc,
                  estimatedSpend: s.price,
                  durationMinutes: 90,
                })),
                totalSpend: total,
                source: 'curated',
              }
              sessionStorage.setItem('rtny_pending_day_plan', JSON.stringify(planData))
              router.push('/plan/confirm')
            }}
          >
            ◈ Book This Plan ◈
          </button>

          {/* footer */}
          <div style={{ textAlign:"center", marginTop:12, fontFamily:"'Inter',sans-serif", fontSize:9, color:"rgba(89,255,160,0.18)", letterSpacing:"2px" }}>
            ROCTICKETNY.COM · ROCHESTER, NY
          </div>
        </div>
      </div>

      {/* ── NAV ── */}
      <div style={{ width:"100%", maxWidth:400, display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:18, animation:"fadeUp 0.35s ease both 0.15s" }}>
        <button onClick={() => navigate(-1)} disabled={current === 0} style={{ width:44, height:44, borderRadius:"50%", border:"1.5px solid rgba(89,255,160,0.22)", background:"rgba(89,255,160,0.03)", color:"#59FFA0", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:current === 0 ? 0.2 : 1, transition:"all 0.2s" }}>←</button>

        <div style={{ display:"flex", gap:7, alignItems:"center" }}>
          {PLANS.map((_, i) => (
            <div key={i} onClick={() => navigate(i > current ? 1 : -1)} style={{
              height:5, borderRadius:3,
              width: i === current ? 22 : 5,
              background: i === current ? "#59FFA0" : "rgba(255,255,255,0.12)",
              boxShadow: i === current ? "0 0 8px rgba(89,255,160,0.6)" : "none",
              transition:"all 0.3s cubic-bezier(0.25,0.46,0.45,0.94)",
              cursor:"pointer",
            }} />
          ))}
        </div>

        <button onClick={() => navigate(1)} disabled={current === PLANS.length - 1} style={{ width:44, height:44, borderRadius:"50%", border:"1.5px solid rgba(89,255,160,0.22)", background:"rgba(89,255,160,0.03)", color:"#59FFA0", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:current === PLANS.length - 1 ? 0.2 : 1, transition:"all 0.2s" }}>→</button>
      </div>

      <div style={{ fontFamily:"'Silkscreen',monospace", fontSize:8, color:"rgba(89,255,160,0.28)", letterSpacing:"2px", marginTop:10 }}>
        {current + 1} OF {PLANS.length} PLANS
      </div>
    </div>
  );
}
