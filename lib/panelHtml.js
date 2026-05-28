// HTML strings for the 30 deck panels. Used by the API route that
// serves gated panels (where react-dom/server can't run). Must be kept
// in sync with components/DeckPanels.jsx — the React version is the
// design source of truth, and any change there needs a mirror edit here
// or the public/gated path will quietly serve a stale deck.

import { filterPanels, FULL_VARIANT } from "../constants/variants.js";

function img({ base, alt, dims, sizes = "100vw", className = "panel__img" }) {
  return `<picture>
    <source type="image/avif" srcset="/images/opt/${base}-800.avif 800w, /images/opt/${base}-1280.avif 1280w, /images/opt/${base}-1672.avif 1672w" sizes="${sizes}">
    <source type="image/webp" srcset="/images/opt/${base}-800.webp 800w, /images/opt/${base}-1280.webp 1280w, /images/opt/${base}-1672.webp 1672w" sizes="${sizes}">
    <img src="/images/opt/${base}-1280.jpg" srcset="/images/opt/${base}-800.jpg 800w, /images/opt/${base}-1280.jpg 1280w, /images/opt/${base}-1672.jpg 1672w" sizes="${sizes}" alt="${escapeHtml(alt)}" class="${className}" loading="lazy" decoding="async" width="${dims.w}" height="${dims.h}">
  </picture>`;
}

function ppie({ idx, base, text, textAbove, textBelow, alt, dims }) {
  const figure = `<figure class="ppie__figure" data-animate="1">${img({ base, alt, dims, sizes: "(max-width: 860px) 92vw, 1000px", className: "ppie__image" })}</figure>`;
  const useSplit = typeof textAbove === "string" && typeof textBelow === "string";
  let inner;
  if (useSplit) {
    inner = `<p class="ppie__text" data-animate="1">${textAbove}</p>${figure}<p class="ppie__text" data-animate="1">${textBelow}</p>`;
  } else if (textBelow === true) {
    inner = `${figure}<p class="ppie__text" data-animate="1">${text}</p>`;
  } else {
    inner = `<p class="ppie__text" data-animate="1">${text}</p>${figure}`;
  }
  return `<section class="panel panel--cream panel--ppie" data-panel="${idx}">
    <div class="ppie__content">${inner}</div>
  </section>`;
}

function prose({ idx, text, follow }) {
  const followLine = follow
    ? `<p class="prose__text prose__text--follow" data-animate="2">${follow}</p>`
    : "";
  return `<section class="panel panel--cream panel--prose" data-panel="${idx}">
    <div class="prose__content">
      <p class="prose__text" data-animate="1">${text}</p>
      ${followLine}
    </div>
  </section>`;
}

function imagePanel({ idx, base, alt, dims }) {
  return `<section class="panel panel--image" data-panel="${idx}">
    ${img({ base, alt, dims })}
  </section>`;
}

// HTML-string mirror of <SectionIntroPanel/> in DeckPanels.jsx — used by
// /api/deck/gated to render panels post-OTP for the organic flow.
function sectionIntro({ idx, text, base, alt, dims = { w: 1672, h: 941 } }) {
  return `<section class="panel panel--cream panel--section-intro" data-panel="${idx}">
    <div class="welcome__content">
      <p class="section-intro__text" data-animate="1">${text}</p>
      <figure class="welcome__figure" data-animate="1">${img({ base, alt, dims, sizes: "(max-width: 860px) 90vw, 760px", className: "welcome__image" })}</figure>
    </div>
  </section>`;
}

const PANELS_HTML = [
  // 0 — Hero
  `<section class="panel panel--hero is-active" data-panel="0" data-dark>
    <div class="hero__veil" aria-hidden="true"></div>
    <div class="hero__content">
      <h1 class="hero__title">A new civic destination for San&nbsp;Francisco at the Palace of Fine&nbsp;Arts</h1>
    </div>
    <div class="hero__scroll" aria-hidden="true"><div class="hero__scroll-line"></div></div>
  </section>`,
  // 1 — Tagline
  `<section class="panel panel--tagline" data-panel="1" data-dark>
    <div class="tagline__content">
      <p class="tagline__text" data-animate="1">We&rsquo;re building a place to experience beauty, wonder, and hope for the future.</p>
    </div>
  </section>`,
  // 2
  ppie({
    idx: 2,
    base: "1915-PPIE-full",
    textAbove: "In 1915, the Panama-Pacific International Exposition welcomed 19 million people to San Francisco.",
    textBelow: "They walked through the greatest achievements of their time, and left believing anything was possible.",
    alt: "The Panama-Pacific International Exposition, San Francisco, 1915",
    dims: { w: 3393, h: 1352 },
  }),
  // 3
  ppie({
    idx: 3,
    base: "palace-only",
    textAbove: "The last building standing from that fair is the Palace of Fine Arts.",
    textBelow: "What happens to the building next is up to us.",
    alt: "The Palace of Fine Arts today",
    dims: { w: 2048, h: 816 },
  }),
  // 4
  prose({ idx: 4, text: "We’re assembling a coalition of founders, funders, and builders to write the Palace’s next chapter." }),
  // 5 — Welcome
  `<section class="panel panel--cream panel--welcome" data-panel="5">
    <div class="welcome__content">
      <h2 class="welcome__heading" data-animate="1">Welcome to the Future</h2>
      <p class="welcome__sub" data-animate="1">Our vision for San Francisco&rsquo;s new home of progress.</p>
      <p class="welcome__year" data-animate="1">Palace of Fine Arts &middot; 2030</p>
      <figure class="welcome__figure" data-animate="1">${img({ base: "map-grounds-v1-bg", alt: "Map of the Palace of Fine Arts grounds", dims: { w: 1672, h: 941 }, sizes: "(max-width: 860px) 90vw, 760px", className: "welcome__image" })}</figure>
    </div>
  </section>`,
  // 6
  prose({ idx: 6, text: "The Palace of Fine Arts, reimagined to capture our spirit of innovation and celebrate the best San Francisco has to offer the world." }),
  // 7 — Tour into Tomorrow title page
  sectionIntro({
    idx: 7,
    text: `Modeled after the pavilions of the 1915 Exposition,<br><span class="section-intro__name">Tour&nbsp;into&nbsp;Tomorrow</span> lets you explore four visions of the future.`,
    base: "map-exhibit",
    alt: "Map of the Tour into Tomorrow exhibits",
  }),
  // 8–11 — Tour exhibits
  imagePanel({ idx: 8, base: "exhibit-1", alt: "Clean energy facility", dims: { w: 1683, h: 934 } }),
  imagePanel({ idx: 9, base: "exhibit-2", alt: "Tour into Tomorrow exhibit", dims: { w: 1672, h: 941 } }),
  imagePanel({ idx: 10, base: "exhibit-3", alt: "Tour into Tomorrow exhibit", dims: { w: 1672, h: 941 } }),
  imagePanel({ idx: 11, base: "exhibit-4", alt: "Tour into Tomorrow exhibit", dims: { w: 1672, h: 941 } }),
  // 12–15 — Future Lab
  // 12 — Future Lab title page
  sectionIntro({
    idx: 12,
    text: `<span class="section-intro__name">Future&nbsp;Lab</span> turns inspiration into action, connecting people of all ages with the scientists, engineers, and builders shaping what comes next.`,
    base: "map-futurelab",
    alt: "Map of the Future Lab",
  }),
  imagePanel({ idx: 13, base: "lab-1", alt: "Future Lab hands-on STEM", dims: { w: 1672, h: 941 } }),
  imagePanel({ idx: 14, base: "lab-2", alt: "Scientists at work in the Future Lab", dims: { w: 1672, h: 941 } }),
  imagePanel({ idx: 15, base: "lab-3", alt: "Kids and adults learning with scientists", dims: { w: 1672, h: 941 } }),
  // 16–19 — Heart of it all
  // 16 — Grand Hall title page
  sectionIntro({
    idx: 16,
    text: `The <span class="section-intro__name">Grand&nbsp;Hall</span> is the social heart of the Palace, showcasing the Bay Area’s culinary culture, from global dining to the future of food.`,
    base: "map-hall-v2",
    alt: "Map of the Grand Hall",
  }),
  imagePanel({ idx: 17, base: "fare-0-hall", alt: "The entrance to the Grand Hall", dims: { w: 1672, h: 941 } }),
  imagePanel({ idx: 18, base: "fare-2", alt: "Dining experience in the Grand Hall", dims: { w: 1672, h: 941 } }),
  imagePanel({ idx: 19, base: "fare-3", alt: "Evening in the Grand Hall", dims: { w: 1672, h: 941 } }),
  // 20–24 — Grounds
  // 20 — Grounds title page
  sectionIntro({
    idx: 20,
    text: `The <span class="section-intro__name">Grounds</span> are the most beautiful public space in the country, open to all, from morning to night.`,
    base: "map-grounds-v2",
    alt: "Map of the Palace of Fine Arts grounds",
  }),
  imagePanel({ idx: 21, base: "grounds-4-pop", alt: "Palace grounds at golden hour", dims: { w: 1672, h: 941 } }),
  imagePanel({ idx: 22, base: "grounds-1", alt: "Wandering the Palace grounds", dims: { w: 1672, h: 941 } }),
  imagePanel({ idx: 23, base: "grounds-0", alt: "Palace of Fine Arts grounds", dims: { w: 1672, h: 941 } }),
  // 24 — Fountain (full bleed via .fountain-fixed background).
  // Transparent panel; image lives in the fixed bg so slide 25 can
  // fade a blur over the *same* stationary image (mirrors 0 → 1).
  `<section class="panel panel--fountain" data-panel="24" data-dark></section>`,
  // 25 — Impact (ivory tagline over blurred fountain — mirrors slide 1).
  `<section class="panel panel--fountain-tagline" data-panel="25" data-dark>
    <div class="tagline__content">
      <p class="tagline__text" data-animate="1">Every visit leaves you with a sense of wonder&nbsp;&mdash; and a reason to return.</p>
    </div>
  </section>`,
  // Letter (standalone statement, no signature) — was data-panel="27"
  // at array index 27, now at array index 26 after the duplicate Call
  // bridge slide (data-panel="26") was removed.
  `<section class="panel panel--cream panel--letter" data-panel="27">
    <div class="letter__content">
      <h2 class="letter__heading" data-animate="1">If you&rsquo;re reading this, we&rsquo;d love your help bringing the vision to life.</h2>
    </div>
    <p class="letter__footer" data-animate="3">Confidential &middot; World&rsquo;s Fair Co.</p>
  </section>`,
  // 28 — Preview Center CTA (merged with closing ask + signature)
  `<section class="panel panel--cream panel--cta" data-panel="28">
    <div class="cta__content">
      <div class="cta__text">
        <h2 class="cta__heading" data-animate="1">Join us</h2>
        <p class="cta__body" data-animate="1">We&rsquo;re assembling a coalition of founders, funders, and builders to write the next chapter in the story of San&nbsp;Francisco.</p>
        <p class="cta__body" data-animate="1">I&rsquo;d love to host you at our Preview Room in the Design District to share the full vision in person.</p>
        <div class="cta__signature" data-animate="2">
          <img class="cta__signature-img" src="/images/cameron-wiese-signature.png" alt="Cameron Wiese" width="932" height="630">
          <p class="cta__signature-name">Cameron Wiese</p>
        </div>
        <a class="cta__button" href="https://cal.com/wiese/preview-center-tour?overlayCalendar=true" target="_blank" rel="noopener noreferrer" role="button" data-animate="2">
          <span class="cta__button-label">Schedule a time</span>
          <span class="cta__button-arrow" aria-hidden="true">&rarr;</span>
        </a>
        <p class="cta__contact-alt" data-animate="2">If none of these times work or you&rsquo;d like to meet at your office, please contact me.
          <span class="cta__contact-info">
            <a href="tel:+13603184480">360-318-4480</a>
            <span class="cta__sep" aria-hidden="true">&middot;</span>
            <a href="mailto:cam@worldsfair.co?subject=I%27d%20love%20to%20visit%20the%20Preview%20Room&amp;body=Hi%20Cameron%2C%0A%0AI%27d%20love%20to%20visit%20the%20Preview%20Room.%20When%20might%20be%20a%20good%20time%3F%0A%0AThanks!">cam@worldsfair.co</a>
          </span>
        </p>
      </div>
      <figure class="cta__figure" data-animate="1">
        <picture>
          <source type="image/avif" srcset="/images/opt/preview-model-800.avif 800w, /images/opt/preview-model-1280.avif 1280w, /images/opt/preview-model-1672.avif 1672w" sizes="(max-width: 860px) 92vw, 560px">
          <source type="image/webp" srcset="/images/opt/preview-model-800.webp 800w, /images/opt/preview-model-1280.webp 1280w, /images/opt/preview-model-1672.webp 1672w" sizes="(max-width: 860px) 92vw, 560px">
          <img src="/images/opt/preview-model-1280.jpg" srcset="/images/opt/preview-model-800.jpg 800w, /images/opt/preview-model-1280.jpg 1280w, /images/opt/preview-model-1672.jpg 1672w" sizes="(max-width: 860px) 92vw, 560px" alt="The Preview Room — scale model of the renewed Palace of Fine Arts" class="cta__image" loading="lazy" decoding="async" width="1920" height="1280">
        </picture>
      </figure>
    </div>
    <p class="cta__footer" data-animate="3">Confidential &middot; World&rsquo;s Fair Co.</p>
  </section>`,
  // 29 — Burnham quote (closing coda)
  `<section class="panel panel--cream panel--burnham" data-panel="29">
    <div class="burnham__content">
      <p class="burnham__text" data-animate="1">&ldquo;Make no little plans. They have no magic to stir men&rsquo;s blood and probably themselves will not be realized. Make big plans; aim high in hope and work&hellip;</p>
      <p class="burnham__text" data-animate="1">Let your watchword be order and your beacon beauty. Think big.&rdquo;</p>
      <div class="burnham__attribution" data-animate="2">
        <p class="burnham__author">Daniel Burnham</p>
        <p class="burnham__role">Chief Architect, 1893 Chicago World&rsquo;s Fair</p>
      </div>
    </div>
    <p class="burnham__footer" data-animate="3">Confidential &middot; World&rsquo;s Fair Co.</p>
  </section>`,
];

export const TOTAL_PANELS = PANELS_HTML.length;

// Fixed fountain background + blur layer — only needed when the slice
// includes slide 24. Mirrors the JSX in <DeckPanels /> so the gated
// splice on the public path injects the same DOM the admin / token
// paths render server-side.
const FOUNTAIN_FIXED_HTML = `<div class="fountain-fixed is-hidden" aria-hidden="true">
  <picture>
    <source type="image/avif" srcset="/images/opt/grounds-3-800.avif 800w, /images/opt/grounds-3-1280.avif 1280w, /images/opt/grounds-3-1672.avif 1672w" sizes="100vw">
    <source type="image/webp" srcset="/images/opt/grounds-3-800.webp 800w, /images/opt/grounds-3-1280.webp 1280w, /images/opt/grounds-3-1672.webp 1672w" sizes="100vw">
    <img src="/images/opt/grounds-3-1280.jpg" srcset="/images/opt/grounds-3-800.jpg 800w, /images/opt/grounds-3-1280.jpg 1280w, /images/opt/grounds-3-1672.jpg 1672w" sizes="100vw" alt="" class="fountain-fixed__img" decoding="async" loading="lazy">
  </picture>
</div>
<div class="fountain-fixed__blur is-hidden" aria-hidden="true"></div>`;

export function getPanelsHtml(start = 0, count, variant = FULL_VARIANT) {
  // Apply the variant filter first so `start` / `count` index into the
  // same panel set the page already rendered server-side.
  const variantPanels = filterPanels(PANELS_HTML, variant);
  const effectiveCount = count ?? variantPanels.length;
  const end = Math.min(variantPanels.length, start + effectiveCount);
  const panels = variantPanels.slice(start, end).join("\n");
  // Fountain (panel 24) is dropped in lite, so the substrate is only
  // ever needed when the full variant's slice covers index 24.
  const includesFountain = variant === FULL_VARIANT && start <= 24 && end > 24;
  return includesFountain ? FOUNTAIN_FIXED_HTML + "\n" + panels : panels;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
