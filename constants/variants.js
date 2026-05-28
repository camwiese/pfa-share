// Deck variants. Right now there are two: the default "full" deck (all 30
// panels) and a "lite" preview (15 panels) that strips most of the in-section
// art and keeps one representative image per section.
//
// The variant is selected by a `?v=lite` URL flag on /, /deck, and
// /d/[token]. The flag flows from each page → DeckPanels (server render)
// and → PublicDeck → /api/deck/gated (client splice). Both render paths
// must filter the same way or the deck index will skip panels.
//
// Limitation: slide-tracking still emits the array index of the rendered
// panel set, so in lite mode admin analytics will report e.g. "slide 9"
// for what is `data-panel="13"` (Future Lab — hands-on). The data-panel
// attribute is preserved so we can layer a mapping back to canonical
// titles later without re-keying anything.

export const FULL_VARIANT = "full";
export const LITE_VARIANT = "lite";

// Canonical lite keep-list (zero-indexed panel positions in the full deck).
// Strips every pure-image slide; keeps the section-intro maps (Tour into
// Tomorrow, Future Lab, Grand Hall, Grounds) since each carries the prose
// that introduces its section. Order: hero / tagline / PPIE pair /
// coalition / welcome / vision / four section intros / Letter / CTA /
// Burnham — 14 panels total.
//
// NOTE: indexes shifted down by 1 after slide 26 (the old "Call" bridge)
// was deleted because it duplicated the Letter slide's text. The
// data-panel attributes were preserved (Letter is still data-panel="27"),
// but array positions now go: ... 24, 25, 26 (Letter), 27 (CTA),
// 28 (Burnham).
export const LITE_SLIDE_INDEXES = [
  0, 1, 2, 3, 4, 5, 6, 7, 12, 16, 20, 26, 27, 28,
];

// Lowercase + restrict to the two known values; anything else falls back
// to the full deck. Centralizes the parsing so every callsite agrees.
export function parseVariant(raw) {
  const v = typeof raw === "string" ? raw.toLowerCase() : "";
  return v === LITE_VARIANT ? LITE_VARIANT : FULL_VARIANT;
}

// Returns the subset of `panels` selected by the variant. Pure: takes any
// array (React nodes or HTML strings) and returns a new array of the same
// shape. Stable order = order in LITE_SLIDE_INDEXES.
export function filterPanels(panels, variant) {
  if (variant !== LITE_VARIANT) return panels;
  return LITE_SLIDE_INDEXES.filter((i) => i < panels.length).map((i) => panels[i]);
}

// For the gated splice: given the full-deck `start` index, returns the
// number of lite panels whose original index is >= start. Used by the
// gated route so it can mirror the lite slice the page already rendered.
export function liteCountFromStart(start) {
  return LITE_SLIDE_INDEXES.filter((i) => i >= start).length;
}
