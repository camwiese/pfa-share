"use client";

// Side-by-side font preview for the "Join us" letter slide.
// All candidates are Google Fonts; we inject the <link> ourselves so
// this page can carry the weight without bloating the deck CSS.
//
// Three new candidates added vs. the global FontExplorer because the
// user specifically wants something that reads like Fraunces but
// without its distinctive descended lowercase f:
//   - Petrona      — closest visual match, conventional f
//   - Source Serif 4 — Adobe, modern serif, very clean
//   - Crimson Pro    — editorial register, no funk
//
// Cards highlight: (1) the actual letter heading, (2) a large "f f y"
// sample so the f-shape difference is unmissable, (3) a link to view
// the font live across the whole deck.

import { useEffect } from "react";

const FONTS = [
  // Tier 1: Fraunces-adjacent (what the user asked for)
  { id: "fraunces",      name: "Fraunces (current)",   stack: "'Fraunces', Georgia, serif",            note: "Default. Distinctive descended f, optical sizing." },
  { id: "petrona",       name: "Petrona",              stack: "'Petrona', Georgia, serif",             note: "★ Closest to Fraunces, conventional f." },
  { id: "source-serif",  name: "Source Serif 4",       stack: "'Source Serif 4', Georgia, serif",      note: "★ Adobe — clean, contemporary, no funk." },
  { id: "crimson",       name: "Crimson Pro",          stack: "'Crimson Pro', Georgia, serif",         note: "★ Editorial register, traditional shapes." },
  { id: "newsreader",    name: "Newsreader",           stack: "'Newsreader', Georgia, serif",          note: "Editorial, civic-feeling. Production Type." },

  // Tier 2: Different character but worth comparing
  { id: "lora",          name: "Lora",                 stack: "'Lora', Georgia, serif",                note: "Warm, friendly, less formal." },
  { id: "spectral",      name: "Spectral",             stack: "'Spectral', Georgia, serif",            note: "Contemporary serif with tight edge." },
  { id: "vollkorn",      name: "Vollkorn",             stack: "'Vollkorn', Georgia, serif",            note: "Warm, robust, slab-leaning." },
  { id: "cardo",         name: "Cardo",                stack: "'Cardo', Georgia, serif",               note: "Classical, scholarly, evokes the era." },
  { id: "cormorant",     name: "Cormorant Garamond",   stack: "'Cormorant Garamond', Georgia, serif",  note: "Refined, narrow, delicate." },
  { id: "playfair",      name: "Playfair Display",     stack: "'Playfair Display', Georgia, serif",    note: "High contrast, formal — leans wedding-card." },
];

const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?" + [
  "family=Fraunces:opsz,wght@9..144,300..700",
  "family=Newsreader:opsz,wght@6..72,300..700",
  "family=Petrona:wght@300..700",
  "family=Source+Serif+4:opsz,wght@8..60,300..700",
  "family=Crimson+Pro:wght@300..700",
  "family=Lora:wght@400..700",
  "family=Spectral:wght@300;400;500;600",
  "family=Vollkorn:wght@400..700",
  "family=Cardo:wght@400;700",
  "family=Cormorant+Garamond:wght@400;500;600",
  "family=Playfair+Display:wght@400..700",
  "display=swap",
].join("&");

export default function FontComparison() {
  useEffect(() => {
    // Inject the heavier font request just for this page so we don't
    // bloat the global CSS.
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_URL;
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, []);

  return (
    <div style={{ padding: "24px clamp(16px, 4vw, 40px) 64px", maxWidth: 1400, margin: "0 auto" }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 500, margin: 0, color: "var(--admin-ink, #1a1612)" }}>
          Font Preview — Letter Slide
        </h1>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(26, 22, 18, 0.6)", margin: "6px 0 0", lineHeight: 1.55 }}>
          Same heading rendered in each candidate. ★ marks options that match Fraunces&rsquo; editorial feel without the descended <code style={{ fontFamily: "ui-monospace, monospace" }}>f</code>.
          Each card links to <code style={{ fontFamily: "ui-monospace, monospace" }}>/deck?font=…</code> so you can see it live across all 29 panels.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(480px, 100%), 1fr))", gap: 20 }}>
        {FONTS.map((f) => (
          <FontCard key={f.id} font={f} />
        ))}
      </div>
    </div>
  );
}

function FontCard({ font }) {
  const highlighted = font.note.startsWith("★");
  return (
    <article
      style={{
        background: "#f5f5f5",
        border: highlighted ? "1px solid rgba(193, 68, 49, 0.35)" : "1px solid rgba(26, 22, 18, 0.12)",
        borderRadius: 8,
        padding: "28px 28px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Faint paper texture to match the actual cream slides */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
          backgroundSize: "200px 200px",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: "rgba(26, 22, 18, 0.85)", letterSpacing: 0.2 }}>
              {font.name}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(26, 22, 18, 0.55)", marginTop: 2 }}>
              {font.note.replace(/^★\s*/, "")}
            </div>
          </div>
          <a
            href={`/deck?font=${font.id}&slide=27`}
            style={{
              fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(26, 22, 18, 0.7)",
              textDecoration: "none", border: "1px solid rgba(26, 22, 18, 0.18)",
              borderRadius: 4, padding: "4px 8px", whiteSpace: "nowrap",
            }}
          >
            see in deck →
          </a>
        </div>

        {/* The actual heading sample */}
        <h2
          style={{
            fontFamily: font.stack,
            fontWeight: 400,
            fontSize: "clamp(1.3rem, 2.2vw, 1.7rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.005em",
            color: "#1a1612",
            margin: 0,
            textWrap: "balance",
          }}
        >
          Join us in writing the next chapter
          <br />in the story of San Francisco.
        </h2>

        {/* Big f sample so the difference jumps out */}
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px dashed rgba(26, 22, 18, 0.14)" }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "rgba(26, 22, 18, 0.5)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>
            f-shape
          </div>
          <div
            style={{
              fontFamily: font.stack,
              fontWeight: 400,
              fontSize: "clamp(3rem, 6vw, 4.5rem)",
              lineHeight: 1,
              color: "#1a1612",
              letterSpacing: "0.05em",
            }}
          >
            ff fy of
          </div>
        </div>
      </div>
    </article>
  );
}
