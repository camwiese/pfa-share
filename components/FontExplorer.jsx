"use client";

// Font preview switcher. Reads `?font=<name>` from the URL on mount and
// overrides the --font-display CSS variable for the whole document.
// Returns null — no rendered UI. Drop <FontExplorer /> into any layout
// or page where you want the preview to work.
//
// Available candidates (all loaded from Google Fonts in app/layout.js):
//   fraunces    — current default (variable, optical sizing)
//   newsreader  — Production Type, editorial / civic-feeling
//   lora        — friendly, warm, less formal than Fraunces
//   spectral    — modern serif with a contemporary edge
//   playfair    — high-contrast, formal "fancy"
//   cardo       — classical, scholarly, evokes the era
//   cormorant   — refined, delicate (already a fallback in the stack)
//
// Examples:
//   /deck?font=lora
//   /d/<token>?font=newsreader
//
// To keep the picked font across pages, the value is also stashed in
// sessionStorage. Adding ?font=fraunces (or clearing storage) resets.

import { useEffect } from "react";

const FONT_MAP = {
  fraunces:      "'Fraunces', 'Cormorant Garamond', Georgia, serif",
  newsreader:    "'Newsreader', Georgia, serif",
  petrona:       "'Petrona', Georgia, serif",
  "source-serif": "'Source Serif 4', Georgia, serif",
  crimson:       "'Crimson Pro', Georgia, serif",
  vollkorn:      "'Vollkorn', Georgia, serif",
  lora:          "'Lora', Georgia, serif",
  spectral:      "'Spectral', Georgia, serif",
  playfair:      "'Playfair Display', Georgia, serif",
  cardo:         "'Cardo', Georgia, serif",
  cormorant:     "'Cormorant Garamond', Georgia, serif",
};

export default function FontExplorer() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      let pick = url.searchParams.get("font");
      if (!pick) {
        // Fall back to whatever we last picked this session, if anything.
        pick = sessionStorage.getItem("pfa_font_preview");
      } else {
        sessionStorage.setItem("pfa_font_preview", pick);
      }
      const stack = pick && FONT_MAP[pick.toLowerCase()];
      if (stack) {
        document.documentElement.style.setProperty("--font-display", stack);
      }
    } catch {
      // No-op — query param parsing failed; stay on the default.
    }
  }, []);
  return null;
}
