// Server component. Renders panels 0..count-1 exactly as they appear in the
// original static index.html — only path-relative image refs are switched to
// absolute `/images/...` paths.
//
// We split the panels into a flat array so callers can request a partial deck
// for the free preview (count=5) and a separate "gated" slice for the OTP
// splice-in (count=28 starting at 5).

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

function PpiePanel({ idx, base, text, alt, dims, textBelow = false }) {
  const textEl = <p className="ppie__text" data-animate={textBelow ? "2" : "1"}>{text}</p>;
  const figureEl = (
    <figure className="ppie__figure" data-animate={textBelow ? "1" : "2"}>
      <picture>
        <source type="image/avif" srcSet={`/images/opt/${base}-800.avif 800w, /images/opt/${base}-1280.avif 1280w, /images/opt/${base}-1672.avif 1672w`} sizes="(max-width: 860px) 92vw, 1000px" />
        <source type="image/webp" srcSet={`/images/opt/${base}-800.webp 800w, /images/opt/${base}-1280.webp 1280w, /images/opt/${base}-1672.webp 1672w`} sizes="(max-width: 860px) 92vw, 1000px" />
        <img
          src={`/images/opt/${base}-1280.jpg`}
          srcSet={`/images/opt/${base}-800.jpg 800w, /images/opt/${base}-1280.jpg 1280w, /images/opt/${base}-1672.jpg 1672w`}
          sizes="(max-width: 860px) 92vw, 1000px"
          alt={alt}
          className="ppie__image"
          loading="lazy"
          decoding="async"
          width={dims.w}
          height={dims.h}
        />
      </picture>
    </figure>
  );
  return (
    <section className="panel panel--cream panel--ppie" data-panel={idx}>
      <div className="ppie__content">
        {textBelow ? <>{figureEl}{textEl}</> : <>{textEl}{figureEl}</>}
      </div>
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
    text="In 1915, the Panama-Pacific International Exposition welcomed 19 million people to San Francisco. They walked through the greatest achievements of their time, and left believing anything was possible."
    alt="The Panama-Pacific International Exposition, San Francisco, 1915"
    dims={{ w: 3393, h: 1352 }}
    textBelow
  />,
  <PpiePanel
    key="3"
    idx={3}
    base="palace-only"
    text="The last building standing from that fair is the Palace of Fine Arts."
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
          <source type="image/avif" srcSet="/images/opt/Park-Lagoon-2-800.avif 800w, /images/opt/Park-Lagoon-2-1280.avif 1280w, /images/opt/Park-Lagoon-2-1672.avif 1672w" sizes="(max-width: 860px) 90vw, 760px" />
          <source type="image/webp" srcSet="/images/opt/Park-Lagoon-2-800.webp 800w, /images/opt/Park-Lagoon-2-1280.webp 1280w, /images/opt/Park-Lagoon-2-1672.webp 1672w" sizes="(max-width: 860px) 90vw, 760px" />
          <img
            src="/images/opt/Park-Lagoon-2-1280.jpg"
            srcSet="/images/opt/Park-Lagoon-2-800.jpg 800w, /images/opt/Park-Lagoon-2-1280.jpg 1280w, /images/opt/Park-Lagoon-2-1672.jpg 1672w"
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
  <ProsePanel
    key="7"
    idx={7}
    text="Modeled after the great pavilions of the 1915 Exposition, Tour into Tomorrow lets you walk through four visions of the future."
    follow="Each inspired by real breakthroughs happening across the Bay Area."
  />,
  <ImagePanel key="8" idx={8} base="exhibit-1" alt="Clean energy facility" dims={{ w: 1683, h: 934 }} />,
  <ImagePanel key="9" idx={9} base="exhibit-2" alt="Tour into Tomorrow exhibit" dims={{ w: 1672, h: 941 }} />,
  <ImagePanel key="10" idx={10} base="exhibit-3" alt="Tour into Tomorrow exhibit" dims={{ w: 1672, h: 941 }} />,
  <ImagePanel key="11" idx={11} base="exhibit-4" alt="Tour into Tomorrow exhibit" dims={{ w: 1672, h: 941 }} />,
  <ProsePanel key="12" idx={12} text="Future Lab is where inspiration becomes action. A hands-on STEM center where kids and adults alike can get involved in building the future." />,
  <ImagePanel key="13" idx={13} base="lab-1" alt="Future Lab hands-on STEM" dims={{ w: 1672, h: 941 }} />,
  <ImagePanel key="14" idx={14} base="lab-2" alt="Scientists at work in the Future Lab" dims={{ w: 1672, h: 941 }} />,
  <ImagePanel key="15" idx={15} base="lab-3" alt="Kids and adults learning with scientists" dims={{ w: 1672, h: 941 }} />,
  <ProsePanel key="16" idx={16} text="At the heart of it all, a beautiful space celebrating the history of the Exposition, with dining experiences showcasing the Bay Area’s global culinary culture and the future of food." />,
  <ImagePanel key="17" idx={17} base="fare-6" alt="World’s Fare food hall" dims={{ w: 1672, h: 941 }} />,
  <ImagePanel key="18" idx={18} base="fare-1" alt="Mezzanine dining at the Palace" dims={{ w: 1681, h: 936 }} />,
  <ImagePanel key="19" idx={19} base="fare-3" alt="Dining experience at the Palace" dims={{ w: 1672, h: 941 }} />,
  <ProsePanel key="20" idx={20} text="Every detail considered to create the most beautiful public space in the country. Open to all, from morning to night." />,
  <ImagePanel key="21" idx={21} base="grounds-4-pop" alt="Palace grounds at golden hour" dims={{ w: 1672, h: 941 }} />,
  <ImagePanel key="22" idx={22} base="grounds-1" alt="Wandering the Palace grounds" dims={{ w: 1672, h: 941 }} />,
  <ImagePanel key="23" idx={23} base="grounds-0" alt="Palace of Fine Arts grounds" dims={{ w: 1672, h: 941 }} />,
  <ImagePanel key="24" idx={24} base="grounds-3" alt="Evening fountain show on the lagoon" dims={{ w: 2750, h: 1536 }} />,
  // 25 — Impact
  <section className="panel panel--cream panel--impact" data-panel="25" key="25">
    <div className="impact__content">
      <p className="impact__text" data-animate="1">Every visit leaves you with a sense of wonder&nbsp;&mdash; and a reason to come back.</p>
    </div>
  </section>,
  // 26 — Call
  <section className="panel panel--cream panel--call" data-panel="26" key="26">
    <div className="call__content">
      <p className="call__text" data-animate="1">If you&rsquo;re reading this, we&rsquo;d love your help bringing it to life.</p>
    </div>
  </section>,
  // 27 — Letter
  <section className="panel panel--cream panel--letter" data-panel="27" key="27">
    <div className="letter__content">
      <h2 className="letter__heading" data-animate="1">Join us in writing the next chapter<br />in the story of San&nbsp;Francisco.</h2>
      <div className="letter__sign" data-animate="2">
        <img className="letter__signature" src="/images/cameron-wiese-signature.png" alt="Cameron Wiese" width={932} height={630} />
        <p className="letter__name">Cameron Wiese</p>
        <p className="letter__title">CEO, The World&rsquo;s Fair Company</p>
        <p className="letter__contact">
          <a href="tel:+13603184480">360-318-4480</a>
          <span className="letter__sep" aria-hidden="true">|</span>
          <a href="mailto:cam@worldsfair.co">cam@worldsfair.co</a>
        </p>
      </div>
    </div>
    <p className="letter__footer" data-animate="3">Confidential &middot; World&rsquo;s Fair Co.</p>
  </section>,
];

export const PANEL_COUNT = PANELS.length;

export default function DeckPanels({ start = 0, count = PANELS.length }) {
  const end = Math.min(PANELS.length, start + count);
  return (
    <>
      {start === 0 ? (
        <>
          <div className="hero-fixed" aria-hidden="true" />
          <div className="hero-fixed__blur" aria-hidden="true" />
        </>
      ) : null}
      {PANELS.slice(start, end)}
    </>
  );
}
