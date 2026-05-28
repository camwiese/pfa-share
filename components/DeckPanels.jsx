// Server component. Renders panels 0..count-1 exactly as they appear in the
// original static index.html — only path-relative image refs are switched to
// absolute `/images/...` paths.
//
// We split the panels into a flat array so callers can request a partial deck
// for the free preview (count=5) and a separate "gated" slice for the OTP
// splice-in (the remaining panels starting at index 5).
//
// `variant`: "full" (default) renders the whole deck; "lite" filters via
// LITE_SLIDE_INDEXES to a 15-slide preview that drops most in-section art.
// See constants/variants.js — the same filter is mirrored in lib/panelHtml.js
// so the gated splice on the public path stays in sync.

import { filterPanels, FULL_VARIANT } from "../constants/variants";

const HERO_HTML = (
  <section className="panel panel--hero is-active" data-panel="0" data-dark="">
    <div className="hero__veil" aria-hidden="true" />
    <div className="hero__content">
      <h1 className="hero__title">A new civic destination for San&nbsp;Francisco at the Palace of Fine&nbsp;Arts</h1>
    </div>
    <div className="hero__scroll" aria-hidden="true">
      <div className="hero__scroll-line" />
    </div>
  </section>
);

const TAGLINE_HTML = (
  <section className="panel panel--tagline" data-panel="1" data-dark="">
    <div className="tagline__content">
      <p className="tagline__text" data-animate="1">We&rsquo;re building a place to experience beauty, wonder, and hope for the future.</p>
    </div>
  </section>
);

function PpiePanel({ idx, base, text, textAbove, textBelow, alt, dims, priority = false }) {
  // Three modes:
  //   - text only → text first, image below (original)
  //   - text + below-flag (textBelow=true with no textAbove) → image first, text below
  //   - textAbove + textBelow → sentence above image, sentence below image
  const useSplit = typeof textAbove === "string" && typeof textBelow === "string";
  const legacyBelow = !useSplit && textBelow === true;

  const figureEl = (
    <figure className="ppie__figure" data-animate="1">
      <picture>
        <source type="image/avif" srcSet={`/images/opt/${base}-800.avif 800w, /images/opt/${base}-1280.avif 1280w, /images/opt/${base}-1672.avif 1672w`} sizes="(max-width: 860px) 92vw, 1000px" />
        <source type="image/webp" srcSet={`/images/opt/${base}-800.webp 800w, /images/opt/${base}-1280.webp 1280w, /images/opt/${base}-1672.webp 1672w`} sizes="(max-width: 860px) 92vw, 1000px" />
        <img
          src={`/images/opt/${base}-1280.jpg`}
          srcSet={`/images/opt/${base}-800.jpg 800w, /images/opt/${base}-1280.jpg 1280w, /images/opt/${base}-1672.jpg 1672w`}
          sizes="(max-width: 860px) 92vw, 1000px"
          alt={alt}
          className="ppie__image"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          width={dims.w}
          height={dims.h}
        />
      </picture>
    </figure>
  );

  let inner;
  if (useSplit) {
    inner = (
      <>
        <p className="ppie__text" data-animate="1">{textAbove}</p>
        {figureEl}
        <p className="ppie__text" data-animate="1">{textBelow}</p>
      </>
    );
  } else if (legacyBelow) {
    inner = (
      <>
        {figureEl}
        <p className="ppie__text" data-animate="1">{text}</p>
      </>
    );
  } else {
    inner = (
      <>
        <p className="ppie__text" data-animate="1">{text}</p>
        {figureEl}
      </>
    );
  }

  return (
    <section className="panel panel--cream panel--ppie" data-panel={idx}>
      <div className="ppie__content">{inner}</div>
    </section>
  );
}

function ProsePanel({ idx, text, follow }) {
  return (
    <section className="panel panel--cream panel--prose" data-panel={idx}>
      <div className="prose__content">
        <p className="prose__text" data-animate="1">{text}</p>
        {follow ? (
          <p className="prose__text prose__text--follow" data-animate="2">{follow}</p>
        ) : null}
      </div>
    </section>
  );
}

// Section-intro panel — visually mirrors the Welcome slide (centered cream
// content, prose-style text, map image directly below). Used for the
// "Tour into Tomorrow", "Future Lab", and "Hall" title pages so each
// section opens with a consistent map-anchored layout.
function SectionIntroPanel({ idx, text, base, alt, dims = { w: 1672, h: 941 } }) {
  return (
    <section className="panel panel--cream panel--section-intro" data-panel={idx}>
      <div className="welcome__content">
        <p className="section-intro__text" data-animate="1">{text}</p>
        <figure className="welcome__figure" data-animate="1">
          <picture>
            <source type="image/avif" srcSet={`/images/opt/${base}-800.avif 800w, /images/opt/${base}-1280.avif 1280w, /images/opt/${base}-1672.avif 1672w`} sizes="(max-width: 860px) 90vw, 760px" />
            <source type="image/webp" srcSet={`/images/opt/${base}-800.webp 800w, /images/opt/${base}-1280.webp 1280w, /images/opt/${base}-1672.webp 1672w`} sizes="(max-width: 860px) 90vw, 760px" />
            <img
              src={`/images/opt/${base}-1280.jpg`}
              srcSet={`/images/opt/${base}-800.jpg 800w, /images/opt/${base}-1280.jpg 1280w, /images/opt/${base}-1672.jpg 1672w`}
              sizes="(max-width: 860px) 90vw, 760px"
              alt={alt}
              className="welcome__image"
              loading="lazy"
              decoding="async"
              width={dims.w}
              height={dims.h}
            />
          </picture>
        </figure>
      </div>
    </section>
  );
}

function ImagePanel({ idx, base, alt, dims, sizes = "100vw" }) {
  return (
    <section className="panel panel--image" data-panel={idx}>
      <picture>
        <source type="image/avif" srcSet={`/images/opt/${base}-800.avif 800w, /images/opt/${base}-1280.avif 1280w, /images/opt/${base}-1672.avif 1672w`} sizes={sizes} />
        <source type="image/webp" srcSet={`/images/opt/${base}-800.webp 800w, /images/opt/${base}-1280.webp 1280w, /images/opt/${base}-1672.webp 1672w`} sizes={sizes} />
        <img
          src={`/images/opt/${base}-1280.jpg`}
          srcSet={`/images/opt/${base}-800.jpg 800w, /images/opt/${base}-1280.jpg 1280w, /images/opt/${base}-1672.jpg 1672w`}
          sizes={sizes}
          alt={alt}
          className="panel__img"
          loading="lazy"
          decoding="async"
          width={dims.w}
          height={dims.h}
        />
      </picture>
    </section>
  );
}

const PANELS = [
  HERO_HTML, // 0
  TAGLINE_HTML, // 1
  <PpiePanel
    key="2"
    idx={2}
    base="1915-PPIE-full"
    textAbove="In 1915, the Panama-Pacific International Exposition welcomed 19 million people to San Francisco."
    textBelow="They walked through the greatest achievements of their time, and left believing anything was possible."
    alt="The Panama-Pacific International Exposition, San Francisco, 1915"
    dims={{ w: 3393, h: 1352 }}
    priority
  />,
  <PpiePanel
    key="3"
    idx={3}
    base="palace-only"
    textAbove="The last building standing from that fair is the Palace of Fine Arts."
    textBelow="What happens to the building next is up to us."
    alt="The Palace of Fine Arts today"
    dims={{ w: 2048, h: 816 }}
  />,
  <ProsePanel
    key="4"
    idx={4}
    text="We’re assembling a coalition of founders, funders, and builders to write the Palace’s next chapter."
  />,
  // 5 — Welcome
  <section className="panel panel--cream panel--welcome" data-panel="5" key="5">
    <div className="welcome__content">
      <h2 className="welcome__heading" data-animate="1">Welcome to the Future</h2>
      <p className="welcome__sub" data-animate="1">Our vision for San Francisco&rsquo;s new home of progress.</p>
      <p className="welcome__year" data-animate="1">Palace of Fine Arts &middot; 2030</p>
      <figure className="welcome__figure" data-animate="1">
        <picture>
          <source type="image/avif" srcSet="/images/opt/map-grounds-v1-bg-800.avif 800w, /images/opt/map-grounds-v1-bg-1280.avif 1280w, /images/opt/map-grounds-v1-bg-1672.avif 1672w" sizes="(max-width: 860px) 90vw, 760px" />
          <source type="image/webp" srcSet="/images/opt/map-grounds-v1-bg-800.webp 800w, /images/opt/map-grounds-v1-bg-1280.webp 1280w, /images/opt/map-grounds-v1-bg-1672.webp 1672w" sizes="(max-width: 860px) 90vw, 760px" />
          <img
            src="/images/opt/map-grounds-v1-bg-1280.jpg"
            srcSet="/images/opt/map-grounds-v1-bg-800.jpg 800w, /images/opt/map-grounds-v1-bg-1280.jpg 1280w, /images/opt/map-grounds-v1-bg-1672.jpg 1672w"
            sizes="(max-width: 860px) 90vw, 760px"
            alt="The Palace of Fine Arts and lagoon, reimagined"
            className="welcome__image"
            loading="lazy"
            decoding="async"
            width={1672}
            height={941}
          />
        </picture>
      </figure>
    </div>
  </section>,
  <ProsePanel key="6" idx={6} text="The Palace of Fine Arts, reimagined to capture our spirit of innovation and celebrate the best San Francisco has to offer the world." />,
  <SectionIntroPanel
    key="7"
    idx={7}
    text={
      <>
        Modeled after the pavilions of the 1915 Exposition,
        <br />
        <span className="section-intro__name">Tour&nbsp;into&nbsp;Tomorrow</span> lets you explore four visions of the future.
      </>
    }
    base="map-exhibit"
    alt="Map of the Tour into Tomorrow exhibits"
  />,
  <ImagePanel key="8" idx={8} base="exhibit-1" alt="Clean energy facility" dims={{ w: 1683, h: 934 }} />,
  <ImagePanel key="9" idx={9} base="exhibit-2" alt="Tour into Tomorrow exhibit" dims={{ w: 1672, h: 941 }} />,
  <ImagePanel key="10" idx={10} base="exhibit-3" alt="Tour into Tomorrow exhibit" dims={{ w: 1672, h: 941 }} />,
  <ImagePanel key="11" idx={11} base="exhibit-4" alt="Tour into Tomorrow exhibit" dims={{ w: 1672, h: 941 }} />,
  <SectionIntroPanel
    key="12"
    idx={12}
    text={
      <>
        <span className="section-intro__name">Future&nbsp;Lab</span> turns inspiration into action, connecting people of all ages with the scientists, engineers, and builders shaping what comes next.
      </>
    }
    base="map-futurelab"
    alt="Map of the Future Lab"
  />,
  <ImagePanel key="13" idx={13} base="lab-1" alt="Future Lab hands-on STEM" dims={{ w: 1672, h: 941 }} />,
  <ImagePanel key="14" idx={14} base="lab-2" alt="Scientists at work in the Future Lab" dims={{ w: 1672, h: 941 }} />,
  <ImagePanel key="15" idx={15} base="lab-3" alt="Kids and adults learning with scientists" dims={{ w: 1672, h: 941 }} />,
  <SectionIntroPanel
    key="16"
    idx={16}
    text={
      <>
        The <span className="section-intro__name">Grand&nbsp;Hall</span> is the social heart of the Palace, showcasing the Bay Area’s culinary culture, from global dining to the future of food.
      </>
    }
    base="map-hall-v2"
    alt="Map of the Grand Hall"
  />,
  <ImagePanel key="17" idx={17} base="fare-0-hall" alt="The entrance to the Grand Hall" dims={{ w: 1672, h: 941 }} />,
  <ImagePanel key="18" idx={18} base="fare-2" alt="Dining experience in the Grand Hall" dims={{ w: 1672, h: 941 }} />,
  <ImagePanel key="19" idx={19} base="fare-3" alt="Evening in the Grand Hall" dims={{ w: 1672, h: 941 }} />,
  <SectionIntroPanel
    key="20"
    idx={20}
    text={
      <>
        The <span className="section-intro__name">Grounds</span> are the most beautiful public space in the country, open to all, from morning to night.
      </>
    }
    base="map-grounds-v2"
    alt="Map of the Palace of Fine Arts grounds"
  />,
  <ImagePanel key="21" idx={21} base="grounds-4-pop" alt="Palace grounds at golden hour" dims={{ w: 1672, h: 941 }} />,
  <ImagePanel key="22" idx={22} base="grounds-1" alt="Wandering the Palace grounds" dims={{ w: 1672, h: 941 }} />,
  <ImagePanel key="23" idx={23} base="grounds-0" alt="Palace of Fine Arts grounds" dims={{ w: 1672, h: 941 }} />,
  // 24 — Fountain (full bleed). Transparent panel; the actual image
  // lives in the fixed `.fountain-fixed` background rendered once
  // alongside the slice so slide 25 can fade in a blur over the same
  // stationary image (mirrors the hero → tagline opening).
  <section className="panel panel--fountain" data-panel="24" data-dark="" key="24" />,
  // 25 — Impact (over blurred fountain, ivory type — mirrors tagline).
  <section className="panel panel--fountain-tagline" data-panel="25" data-dark="" key="25">
    <div className="tagline__content">
      <p className="tagline__text" data-animate="1">Every visit leaves you with a sense of wonder&nbsp;&mdash; and a reason to return.</p>
    </div>
  </section>,
  // 26 — Letter (standalone statement, no signature) — was slide 27;
  // the old "Call" bridge slide (data-panel="26") was removed because
  // it carried the exact same sentence this heading now does.
  // data-panel="27" is preserved so the canonical slide identifier
  // stays meaningful even though the array index has shifted up by 1.
  <section className="panel panel--cream panel--letter" data-panel="27" key="27">
    <div className="letter__content">
      <h2 className="letter__heading" data-animate="1">If you&rsquo;re reading this, we&rsquo;d love your help bringing the vision to life.</h2>
    </div>
    <p className="letter__footer" data-animate="3">Confidential &middot; World&rsquo;s Fair Co.</p>
  </section>,
  // 28 — Preview Center CTA (merged with closing ask + signature)
  <section className="panel panel--cream panel--cta" data-panel="28" key="28">
    <div className="cta__content">
      <div className="cta__text">
        <h2 className="cta__heading" data-animate="1">Join us</h2>
        <p className="cta__body" data-animate="1">
          We&rsquo;re assembling a coalition of founders, funders, and builders to write the next chapter in the story of San&nbsp;Francisco.
        </p>
        <p className="cta__body" data-animate="1">
          I&rsquo;d love to host you at our Preview Room in the Design District to share the full vision in person.
        </p>
        <div className="cta__signature" data-animate="2">
          <img className="cta__signature-img" src="/images/cameron-wiese-signature.png" alt="Cameron Wiese" width={932} height={630} />
          <p className="cta__signature-name">Cameron Wiese</p>
        </div>
        {/* The deck's tap-to-advance listener already short-circuits on
            `<a>` via isInteractive() in Deck.jsx, so a real user click
            here lands in a new tab without flipping the slide. */}
        <a
          className="cta__button"
          href="https://cal.com/wiese/preview-center-tour?overlayCalendar=true"
          target="_blank"
          rel="noopener noreferrer"
          role="button"
          data-animate="2"
        >
          <span className="cta__button-label">Schedule a time</span>
          <span className="cta__button-arrow" aria-hidden="true">&rarr;</span>
        </a>
        <p className="cta__contact-alt" data-animate="2">
          If none of these times work or you&rsquo;d like to meet at your office, please contact me.
          <span className="cta__contact-info">
            <a href="tel:+13603184480">360-318-4480</a>
            <span className="cta__sep" aria-hidden="true">&middot;</span>
            <a href="mailto:cam@worldsfair.co?subject=I%27d%20love%20to%20visit%20the%20Preview%20Room&body=Hi%20Cameron%2C%0A%0AI%27d%20love%20to%20visit%20the%20Preview%20Room.%20When%20might%20be%20a%20good%20time%3F%0A%0AThanks!">cam@worldsfair.co</a>
          </span>
        </p>
      </div>
      <figure className="cta__figure" data-animate="1">
        <picture>
          <source type="image/avif" srcSet="/images/opt/preview-model-800.avif 800w, /images/opt/preview-model-1280.avif 1280w, /images/opt/preview-model-1672.avif 1672w" sizes="(max-width: 860px) 92vw, 560px" />
          <source type="image/webp" srcSet="/images/opt/preview-model-800.webp 800w, /images/opt/preview-model-1280.webp 1280w, /images/opt/preview-model-1672.webp 1672w" sizes="(max-width: 860px) 92vw, 560px" />
          <img
            src="/images/opt/preview-model-1280.jpg"
            srcSet="/images/opt/preview-model-800.jpg 800w, /images/opt/preview-model-1280.jpg 1280w, /images/opt/preview-model-1672.jpg 1672w"
            sizes="(max-width: 860px) 92vw, 560px"
            alt="The Preview Room — scale model of the renewed Palace of Fine Arts"
            className="cta__image"
            loading="lazy"
            decoding="async"
            width={1920}
            height={1280}
          />
        </picture>
      </figure>
    </div>
    <p className="cta__footer" data-animate="3">Confidential &middot; World&rsquo;s Fair Co.</p>
  </section>,
  // 29 — Burnham quote (closing coda)
  <section className="panel panel--cream panel--burnham" data-panel="29" key="29">
    <div className="burnham__content">
      <p className="burnham__text" data-animate="1">
        &ldquo;Make no little plans. They have no magic to stir men&rsquo;s blood and probably themselves will not be realized. Make big plans; aim high in hope and work&hellip;
      </p>
      <p className="burnham__text" data-animate="1">
        Let your watchword be order and your beacon beauty. Think big.&rdquo;
      </p>
      <div className="burnham__attribution" data-animate="2">
        <p className="burnham__author">Daniel Burnham</p>
        <p className="burnham__role">Chief Architect, 1893 Chicago World&rsquo;s Fair</p>
      </div>
    </div>
    <p className="burnham__footer" data-animate="3">Confidential &middot; World&rsquo;s Fair Co.</p>
  </section>,
];

export const PANEL_COUNT = PANELS.length;

export default function DeckPanels({ start = 0, count, variant = FULL_VARIANT }) {
  // Pick the panel set first (full vs lite) so `start` / `count` always
  // index into the variant the caller will actually navigate through.
  const variantPanels = filterPanels(PANELS, variant);
  const effectiveCount = count ?? variantPanels.length;
  const end = Math.min(variantPanels.length, start + effectiveCount);
  // Slide 24 (the fountain) only exists in the full deck. Even in lite
  // mode, the substrate `<picture>` is gated on whether any rendered
  // panel still has data-panel="24" — but lite drops it, so this is
  // always false there. Kept array-index-aware so future variants that
  // include 24 still get the fixed substrate.
  const includesFountain = variant === FULL_VARIANT && start <= 24 && end > 24;
  return (
    <>
      {start === 0 ? (
        <>
          {/* Preload the hero so the request starts in parallel with HTML
              parsing. imageSrcSet lets the browser pick the right variant
              for the viewport. Next.js hoists this <link> into <head>. */}
          <link
            rel="preload"
            as="image"
            type="image/avif"
            href="/images/opt/header-image-1280.avif"
            imageSrcSet="/images/opt/header-image-800.avif 800w, /images/opt/header-image-1280.avif 1280w, /images/opt/header-image-1672.avif 1672w"
            imageSizes="100vw"
            fetchPriority="high"
          />
          <div className="hero-fixed" aria-hidden="true">
            {/* Real <picture> instead of a CSS background so AVIF/WebP are
                delivered everywhere (CSS image-set() previously broke on some
                iOS Safari builds). Image is fixed + cover-styled in deck.css. */}
            <picture>
              <source
                type="image/avif"
                srcSet="/images/opt/header-image-800.avif 800w, /images/opt/header-image-1280.avif 1280w, /images/opt/header-image-1672.avif 1672w"
                sizes="100vw"
              />
              <source
                type="image/webp"
                srcSet="/images/opt/header-image-800.webp 800w, /images/opt/header-image-1280.webp 1280w, /images/opt/header-image-1672.webp 1672w"
                sizes="100vw"
              />
              <img
                src="/images/opt/header-image-1280.jpg"
                srcSet="/images/opt/header-image-800.jpg 800w, /images/opt/header-image-1280.jpg 1280w, /images/opt/header-image-1672.jpg 1672w"
                sizes="100vw"
                alt=""
                className="hero-fixed__img"
                fetchPriority="high"
                decoding="async"
              />
            </picture>
          </div>
          <div className="hero-fixed__blur" aria-hidden="true" />
        </>
      ) : null}
      {includesFountain ? (
        <>
          <div className="fountain-fixed is-hidden" aria-hidden="true">
            <picture>
              <source
                type="image/avif"
                srcSet="/images/opt/grounds-3-800.avif 800w, /images/opt/grounds-3-1280.avif 1280w, /images/opt/grounds-3-1672.avif 1672w"
                sizes="100vw"
              />
              <source
                type="image/webp"
                srcSet="/images/opt/grounds-3-800.webp 800w, /images/opt/grounds-3-1280.webp 1280w, /images/opt/grounds-3-1672.webp 1672w"
                sizes="100vw"
              />
              <img
                src="/images/opt/grounds-3-1280.jpg"
                srcSet="/images/opt/grounds-3-800.jpg 800w, /images/opt/grounds-3-1280.jpg 1280w, /images/opt/grounds-3-1672.jpg 1672w"
                sizes="100vw"
                alt=""
                className="fountain-fixed__img"
                decoding="async"
                loading="lazy"
              />
            </picture>
          </div>
          <div className="fountain-fixed__blur is-hidden" aria-hidden="true" />
        </>
      ) : null}
      {variantPanels.slice(start, end)}
    </>
  );
}
