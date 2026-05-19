// HTML strings for the 28 deck panels. Used both by the API route that
// serves gated panels (where react-dom/server can't run) and as the source
// of truth for the panel markup. Kept in sync with components/DeckPanels.jsx.

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
      <figure class="welcome__figure" data-animate="1">${img({ base: "map-new", alt: "Map of the Palace of Fine Arts grounds", dims: { w: 1672, h: 941 }, sizes: "(max-width: 860px) 90vw, 760px", className: "welcome__image" })}</figure>
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
  imagePanel({ idx: 24, base: "grounds-3", alt: "Evening fountain show on the lagoon", dims: { w: 2750, h: 1536 } }),
  // 25 — Impact
  `<section class="panel panel--cream panel--impact" data-panel="25">
    <div class="impact__content">
      <p class="impact__text" data-animate="1">Every visit leaves you with a sense of wonder&nbsp;&mdash; and a reason to return.</p>
    </div>
  </section>`,
  // 26 — Call
  `<section class="panel panel--cream panel--call" data-panel="26">
    <div class="call__content">
      <p class="call__text" data-animate="1">If you&rsquo;re reading this, we&rsquo;d love your help bringing this vision to life.</p>
    </div>
  </section>`,
  // 27 — Letter
  `<section class="panel panel--cream panel--letter" data-panel="27">
    <div class="letter__content">
      <h2 class="letter__heading" data-animate="1">Join us in writing the next chapter<br>in the story of San&nbsp;Francisco.</h2>
      <div class="letter__sign" data-animate="2">
        <img class="letter__signature" src="/images/cameron-wiese-signature.png" alt="Cameron Wiese" width="932" height="630">
        <p class="letter__name">Cameron Wiese</p>
        <p class="letter__contact">
          <a href="tel:+13603184480">360-318-4480</a>
          <span class="letter__sep" aria-hidden="true">|</span>
          <a href="mailto:cam@worldsfair.co">cam@worldsfair.co</a>
        </p>
      </div>
    </div>
    <p class="letter__footer" data-animate="3">Confidential &middot; World&rsquo;s Fair Co.</p>
  </section>`,
  // 28 — Burnham quote (closing coda)
  `<section class="panel panel--cream panel--burnham" data-panel="28">
    <div class="burnham__content">
      <p class="burnham__text" data-animate="1">Make no little plans. They have no magic to stir men&rsquo;s blood and probably themselves will not be realized. Make big plans; aim high in hope and work&hellip;</p>
      <p class="burnham__text" data-animate="1">Let your watchword be order and your beacon beauty. Think big.</p>
      <div class="burnham__attribution" data-animate="2">
        <p class="burnham__author">Daniel Burnham</p>
        <p class="burnham__role">Chief Architect, 1893 Chicago World&rsquo;s Fair</p>
      </div>
    </div>
    <p class="burnham__footer" data-animate="3">Confidential &middot; World&rsquo;s Fair Co.</p>
  </section>`,
];

export const TOTAL_PANELS = PANELS_HTML.length;

export function getPanelsHtml(start = 0, count = PANELS_HTML.length) {
  const end = Math.min(PANELS_HTML.length, start + count);
  return PANELS_HTML.slice(start, end).join("\n");
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
