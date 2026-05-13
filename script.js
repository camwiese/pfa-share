/* =============================================================
   Future Palace — scrollytelling
   -------------------------------------------------------------
   Each scene is its own IIFE below, prefixed with a banner.
   Scenes (top → bottom of page):
     SCENE 1  Hero            (CSS only)
     SCENE 2  Blur reveal     "A place you can visit..."
     SCENE 3  Innovations     Bay Area lines + 3 polaroids
     SCENE 4  PPIE history    1915 panorama pan + zoom
     SCENE 5  Establish       "Welcome to the Future" + plate
     SCENE 6  Day-flow        6 photo beats + plate corner inset
     SCENE 7  Impact          Word-by-word reveal
     SCENE 9  Letter          Closing CTA cascade
   ============================================================= */

(function () {
  'use strict';

  const html = document.documentElement;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;
  const blurCopyQuery = window.matchMedia('(max-width: 860px)');
  let viewportW = window.innerWidth;
  let viewportH = window.innerHeight;

  function setViewportVars() {
    viewportW = window.innerWidth;
    /* visualViewport excludes the iOS URL-bar area so sticky stages
       size to what the user actually sees, not what's hidden behind
       the chrome on first load. */
    viewportH = window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight;
    html.style.setProperty('--vh', `${viewportH * 0.01}px`);
  }

  function setResponsiveSceneHeights() {
    const reveal = document.getElementById('scene-reveal');
    if (reveal) {
      const setupCount = reveal.querySelectorAll('.reveal__line:not(.reveal__line--climax)').length;
      /* Mobile gets more runway per line — momentum scrolling burns
         through text-heavy scenes too quickly with desktop spacing. */
      const isMobile = window.matchMedia('(max-width: 860px)').matches;
      const perLine = isMobile ? 0.75 : 0.6;
      const padding = isMobile ? 2.2 : 1.8;
      reveal.style.minHeight = `${Math.round((setupCount * perLine + padding) * viewportH)}px`;
    }

    const impact = document.getElementById('scene-impact');
    if (impact) {
      const wordCount = impact.querySelectorAll('.impact__w').length;
      impact.style.minHeight = `${Math.round((Math.max(180, wordCount * 8 + 80) / 100) * viewportH)}px`;
    }
  }

  function updateBlurAccessibility() {
    const mobileVisible = blurCopyQuery.matches;
    document.querySelectorAll('.blur__text--desktop').forEach((el) => {
      el.setAttribute('aria-hidden', mobileVisible ? 'true' : 'false');
    });
    document.querySelectorAll('.blur__text--mobile').forEach((el) => {
      el.setAttribute('aria-hidden', mobileVisible ? 'false' : 'true');
    });
  }

  setViewportVars();
  setResponsiveSceneHeights();
  updateBlurAccessibility();

  /* Bail before adding .js-ready if we can't drive animations.
     CSS for `html:not(.js-ready)` reveals every initially-hidden
     element, collapses pinned-scene scroll heights, and shows just
     the primary beat per cycled scene — so the page is always
     readable when GSAP can't run (script blocked, CDN unreachable,
     reduced-motion preference, JS error during boot). */
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  if (prefersReduced) return;

  html.classList.add('js-ready');

  /* ── Lenis (skip on touch) ───────────────── */
  let lenis = null;
  if (!isTouch && typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  gsap.registerPlugin(ScrollTrigger);

  /* iOS Safari: ignore the URL-bar show/hide resize — otherwise every
     resize triggers a ScrollTrigger.refresh() which re-computes pin
     positions mid-scroll and visibly jumps the page. */
  ScrollTrigger.config({ ignoreMobileResize: true });

  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  let resizeTimer = null;
  function refreshAfterResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const widthDelta = Math.abs(window.innerWidth - viewportW);
      const heightDelta = Math.abs(window.innerHeight - viewportH);
      const meaningfulResize = !isTouch || widthDelta > 24 || heightDelta > 80;

      updateBlurAccessibility();
      if (!meaningfulResize) return;

      setViewportVars();
      setResponsiveSceneHeights();
      ScrollTrigger.refresh();
    }, 160);
  }
  window.addEventListener('resize', refreshAfterResize, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', refreshAfterResize, { passive: true });
  }
  if (blurCopyQuery.addEventListener) {
    blurCopyQuery.addEventListener('change', () => {
      updateBlurAccessibility();
      ScrollTrigger.refresh();
    });
  }

  /* =============================================================
     SCENE 2 — "A place you can visit…"
     Two flavours are in the DOM — a 2-line desktop copy and a
     4-line mobile copy. CSS shows whichever fits the viewport;
     we animate only the visible group. Each line reveals on its
     own scroll beat, the last line gets an extra-long hold so it
     can be read, then everything fades cleanly into Scene 3.
     ============================================================= */
  (function scene2_reveal() {
    const section = document.getElementById('scene-blur');
    if (!section) return;
    const groups = Array.from(section.querySelectorAll('.blur__text'));
    if (!groups.length) return;

    /* Timeline budget — total length scales with line count so each
       line gets the same reveal/hold cadence and the last line gets
       an extra-long hold before the group fades out. */
    const REVEAL_DUR = 0.35;          /* per-line fade-in duration */
    const STEP       = 0.55;          /* gap between successive reveals */
    const LAST_HOLD  = 1.50;          /* extra dwell on the last line */
    const FADE_OUT   = 0.45;

    groups.forEach((group) => {
      const lines = group.querySelectorAll('.blur__line');
      if (!lines.length) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.8,
        },
      });

      /* Pre-roll so the first line isn't already on-screen at scene start. */
      const PREROLL = 0.20;
      let cursor = PREROLL;

      lines.forEach((line) => {
        tl.fromTo(line,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: REVEAL_DUR, ease: 'power2.out' },
          cursor
        );
        cursor += STEP;
      });

      /* Hold the full block — extra dwell so the last line breathes. */
      const holdAt = cursor;
      tl.to(lines, { opacity: 1, duration: LAST_HOLD }, holdAt);

      /* Fade everything out before Scene 3. */
      tl.to(lines, {
        opacity: 0, y: -8,
        duration: FADE_OUT,
        ease: 'power2.in',
      }, holdAt + LAST_HOLD);
    });
  })();

  /* =============================================================
     SCENE 3 — "The future is already being built here"
     Setup lines reveal sequentially (each dimming the previous),
     three polaroid cards appear alongside, then everything hands
     off to the climax line. Cards linger past the text, then fade
     cleanly before Scene 4 begins.
     Timeline layout:
       0.0–0.6   breathing room (paper alone, anticipation)
       0.6+      setup lines arrive on a 0.4 cadence
       handoff   setup fades, climax appears with cards still on
       linger    climax holds; cards then fade out
       exit      climax fades cleanly before Scene 4
     ============================================================= */
  (function scene3_reveal() {
    const section = document.getElementById('scene-reveal');
    if (!section) return;
    const lines = section.querySelectorAll('.reveal__line');
    if (!lines.length) return;

    const setup = Array.from(lines).filter(l => !l.classList.contains('reveal__line--climax'));
    const climax = section.querySelector('.reveal__line--climax');

    /* Section length: a little more breathing room before & after the text. */
    setResponsiveSceneHeights();

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
      },
    });

    /* Innovation polaroid stack (no captions, just photos) */
    const innos = section.querySelectorAll('.reveal__inno');
    const innoRot = [-4, 4, -2];   /* final tilt per card (deg), three cards */

    /* Initial card state — hidden, slightly down, slightly small */
    innos.forEach((inno, i) => {
      gsap.set(inno, { opacity: 0, rotation: innoRot[i] || 0, y: 22, scale: 0.96 });
    });

    /* Pre-roll: breathing room so paper sits alone before text arrives. */
    const PREROLL = 0.6;

    /* Setup lines reveal sequentially, each dimming the previous. */
    const SETUP_STEP = 0.4;
    setup.forEach((line, i) => {
      tl.to(line, {
        opacity: 1, y: 0,
        duration: 0.36,
        ease: 'power3.out',
      }, PREROLL + i * SETUP_STEP);
      if (i > 0) {
        tl.to(setup[i - 1], {
          opacity: 0.30,
          duration: 0.32,
        }, PREROLL + i * SETUP_STEP);
      }
    });

    /* Cards drop in starting at line 2 ("Cures for blindness…") so the
       visuals arrive with the example, not with the setup line above it. */
    const CARDS_START = PREROLL + SETUP_STEP;   /* aligned to line index 1 */
    innos.forEach((inno, i) => {
      tl.to(inno, {
        opacity: 1, y: 0, scale: 1,
        rotation: innoRot[i] || 0,
        duration: 0.55,
        ease: 'power3.out',
      }, CARDS_START + i * 0.22);
    });

    /* Handoff: setup lines fade out first; cards keep lingering briefly. */
    const setupEndsAt = PREROLL + (setup.length - 1) * SETUP_STEP + 0.4;
    const handoffAt   = setupEndsAt + 0.4;
    tl.to(setup, { opacity: 0, y: -10, duration: 0.5, ease: 'power2.out' }, handoffAt);

    /* Cards fade out earlier than before — well before Scene 4 starts. */
    tl.to(innos, {
      opacity: 0, y: -10, scale: 0.97,
      duration: 0.55,
      ease: 'power2.in',
    }, handoffAt + 0.3);

    if (climax) {
      /* Breathing room, then climax appears. */
      tl.to(climax, {
        opacity: 1, y: 0, scale: 1.05,
        duration: 0.7,
        ease: 'power3.out',
      }, handoffAt + 0.95);
      /* Climax lingers. */
      tl.to(climax, { opacity: 1, duration: 1.3 }, handoffAt + 1.7);
      /* Clean exit well before Scene 4. */
      tl.to(climax, {
        opacity: 0, y: -14,
        duration: 0.55,
        ease: 'power2.in',
      }, handoffAt + 3.0);
    }
  })();

  /* =============================================================
     SCENE 5 — "Welcome to the Future"
     Fades in as the reader scrolls into the section, lingers,
     then fades out before the day-flow begins.
     ============================================================= */
  (function scene5_establish() {
    const section = document.querySelector('.scene--establish');
    if (!section) return;
    const h     = section.querySelector('.establish__h');
    const sub   = section.querySelector('.establish__sub');
    const yr    = section.querySelector('.establish__year');
    const art   = section.querySelector('.establish__art');
    if (!h) return;

    gsap.set([h, sub, yr], { y: 14 });
    if (art) gsap.set(art, { y: 18 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.8,
      },
    });

    tl.to(h,   { opacity: 1, y: 0, duration: 0.25, ease: 'power3.out' }, 0.00);
    tl.to(sub, { opacity: 1, y: 0, duration: 0.25, ease: 'power3.out' }, 0.18);
    tl.to(yr,  { opacity: 1, y: 0, duration: 0.25, ease: 'power3.out' }, 0.32);
    if (art) tl.to(art, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }, 0.48);

    /* Hold the welcome at full opacity for a real beat. */
    const linger = art ? [h, sub, yr, art] : [h, sub, yr];
    tl.to(linger, { opacity: 1, duration: 0.45 }, 0.95);

    /* Fade out while the sticky stage is still pinned — by the time
       the reader continues into Scene 6, the welcome is already gone
       and the stage scrolls away empty. */
    tl.to(linger, { opacity: 0, y: -12, duration: 0.4, ease: 'power2.in' }, 1.40);

    /* Pad the timeline tail with a no-op so the fade-out completes
       at ~40% of trigger progress (= ~72vh into the 180vh section,
       before the sticky unsticks at 80vh). The remaining ~60% of
       scroll is silent dead-space carrying the empty stage out. */
    tl.to({}, { duration: 2.7 }, 1.80);
  })();

  /* =============================================================
     SCENE 4 — PPIE history (1915 panorama)
     Image frame stays pinned. The wide panorama pans left → right
     and zooms gently, ending on the Palace rotunda. Five text
     lines cycle through, timed so the "Palace of Fine Arts" line
     lands as the rotunda settles, and the closing lines read
     against the held Palace shot.
     ============================================================= */
  (function scene4_ppie() {
    const section = document.getElementById('scene-ppie');
    if (!section) return;
    const lines = section.querySelectorAll('.ppie__line');
    const image = section.querySelector('.ppie__image');
    if (!lines.length) return;

    /* Set initial state */
    gsap.set(lines, { opacity: 0, y: 18 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
      },
    });

    /* ── Image stays static. The earlier pan/zoom proved too busy
       against the cycling captions; the panorama reads better held. */
    if (image) {
      image.style.objectPosition = '50% 50%';
      image.style.transform = 'none';
    }

    /* ── Text line cycling ──
       Pacing is hand-tuned so line 2 ("The last building standing… is the
       Palace of Fine Arts.") lands at the moment the pan settles on the
       rotunda. Lines 3–4 read against the held Palace shot. */
    const cues = [
      /* in,   out */
      [0.00, 0.15],   /* "In 1915..." */
      [0.18, 0.38],   /* "This World's Fair..." */
      [0.42, 0.68],   /* "The last building standing... Palace of Fine Arts." */
      [0.72, 0.86],   /* "It needs a new purpose..." */
      [0.90, null ],  /* "We imagine a home..." — last line, no fade-out */
    ];

    lines.forEach((line, i) => {
      const cue = cues[i];
      if (!cue) return;
      tl.to(line, {
        opacity: 1, y: 0,
        duration: 0.10,
        ease: 'power2.out',
      }, cue[0]);
      if (cue[1] !== null) {
        tl.to(line, {
          opacity: 0, y: -14,
          duration: 0.08,
          ease: 'power2.in',
        }, cue[1]);
      }
    });
  })();

  /* =============================================================
     SCENE 6 — A day at the Palace
     Cinematic sticky stage. Beat 0 shows the line-drawing plate
     filling the stage. Between beats 0 → 1 the plate shrinks and
     anchors flush at the TOP-RIGHT of each photo frame, riding
     along as a spatial companion. Beats 1–6 are the photo tour,
     crossfading on pure opacity. Captions reveal word-by-word
     as each beat scrolls into view.
     ============================================================= */
  (function scene6_day() {
    const section = document.getElementById('scene-day');
    if (!section) return;
    const layers = Array.from(section.querySelectorAll('.day__layer'));
    const N = layers.length;
    if (!N) return;

    /* Mobile keeps the sticky stage but drops Ken Burns scale and the
       caption y-translate — pure opacity crossfades, no GPU compositing
       work that judders on iOS Safari. */
    const isMobile = window.matchMedia('(max-width: 860px)').matches;

    /* Initial state — beat 0 visible, others invisible. Each caption
       starts hidden; it fades in as a whole sentence during its beat. */
    layers.forEach((layer, i) => {
      gsap.set(layer, { opacity: i === 0 ? 1 : 0 });
      const cap = layer.querySelector('.day__caption');
      if (cap) gsap.set(cap, isMobile ? { opacity: 0 } : { opacity: 0, y: 6 });
      if (!isMobile) {
        const img = layer.querySelector('.day__image');
        if (img) gsap.set(img, { scale: 1 });
      }
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: isMobile ? 0.4 : 0.8,
      },
    });

    const SLOT = 1 / N;
    /* Crossfade window between adjacent beats. Most of each slot is
       a still hold so the reader can sit with the image + caption;
       transitions are kept tight at either end. */
    const FADE     = SLOT * (isMobile ? 0.22 : 0.20);
    const CAP_IN   = SLOT * 0.14;
    const CAP_OUT  = SLOT * 0.14;
    const CAP_HOLD = SLOT - CAP_IN - CAP_OUT - FADE;

    layers.forEach((layer, i) => {
      const slotStart = i * SLOT;
      const img = layer.querySelector('.day__image');
      const cap = layer.querySelector('.day__caption');

      /* Layer enter — pure opacity crossfade. */
      if (i > 0) {
        tl.to(layer, { opacity: 1, duration: FADE, ease: 'sine.inOut' }, slotStart);
      }

      /* Caption fades in as a single sentence, holds, then fades out. */
      if (cap) {
        const capInAt  = slotStart + FADE * (isMobile ? 0.8 : 0.9);
        const capOutAt = capInAt + CAP_IN + Math.max(0, CAP_HOLD);
        const capInVars = isMobile
          ? { opacity: 1, duration: CAP_IN, ease: 'power2.out' }
          : { opacity: 1, y: 0, duration: CAP_IN, ease: 'power2.out' };
        const capOutVars = isMobile
          ? { opacity: 0, duration: CAP_OUT, ease: 'power2.in' }
          : { opacity: 0, y: -4, duration: CAP_OUT, ease: 'power2.in' };
        tl.to(cap, capInVars, capInAt);
        if (i < N - 1) tl.to(cap, capOutVars, capOutAt);
      }

      /* Ken Burns push-in across the beat — desktop only. */
      if (img && !isMobile) {
        tl.fromTo(img,
          { scale: 1 },
          { scale: 1.04, duration: SLOT + FADE, ease: 'none' },
          slotStart
        );
      }

      /* Layer exit — overlaps the next beat's enter. */
      if (i < N - 1) {
        tl.to(layer, { opacity: 0, duration: FADE, ease: 'sine.inOut' }, slotStart + SLOT - FADE);
      }
    });
  })();

  /* =============================================================
     SCENE 7 — Impact statement
     Word-by-word reveal as the reader scrolls through. Words stay
     hidden until fully inside the section, then resolve one at a
     time and fade out cleanly before the closing letter.
     ============================================================= */
  (function scene7_impact() {
    const section = document.getElementById('scene-impact');
    if (!section) return;
    const words = section.querySelectorAll('.impact__w');
    if (!words.length) return;

    /* Section is tall enough that:
       - First viewport-height: empty (user just arrived; previous scene is fully gone)
       - Middle: words resolve one by one
       - Last viewport-height: words fade out before the site plan enters */
    /* Shorter scroll — tighter pacing, less empty space */
    setResponsiveSceneHeights();

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.4,
      },
    });

    /* 0.0 – 0.10: breathing room after Scene 6 */

    /* 0.10 – 0.75: words resolve one by one */
    const REVEAL_START = 0.10;
    const REVEAL_END   = 0.75;
    const REVEAL_DUR   = REVEAL_END - REVEAL_START;
    words.forEach((w, i) => {
      const at = REVEAL_START + (i / (words.length - 1)) * REVEAL_DUR;
      tl.to(w, { opacity: 1, duration: 0.06, ease: 'none' }, at);
    });

    /* 0.75 – 0.90: all words stay visible (linger) */
    tl.to(words, { opacity: 1, duration: 0.15 }, 0.75);

    /* 0.90 – 1.0: gentle fade out into the letter section */
    tl.to(words, { opacity: 0, y: -8, duration: 0.10, ease: 'power2.in' }, 0.90);
  })();

  /* Scene 8 has been folded into Scene 6 — the site plan now rides
     alongside the day-flow as a corner companion. */

  /* =============================================================
     SCENE 9 — Closing letter
     Scrub-driven cascade across a 220vh sticky section. As the
     reader scrolls in, each element flows in on its own beat:
     heading → 3 paragraphs → signature/name/phone → 2 text CTAs
     → HR rule → footer. When the cascade completes the user is
     at the page bottom (no further scroll possible).
     ============================================================= */
  (function scene9_letter() {
    const section = document.getElementById('scene-letter');
    if (!section) return;
    const heading    = section.querySelector('.letter__h');
    const paragraphs = section.querySelectorAll('.letter__p');
    const sign       = section.querySelector('.letter__sign');
    const ctas       = section.querySelector('.letter__ctas');
    const rule       = section.querySelector('.letter__rule');
    const footer     = section.querySelector('.letter__footer');
    if (!heading || !paragraphs.length) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.1,           /* generous scrub for a flowing cascade */
      },
    });

    const E = 'power3.out';
    const D = 0.22;            /* per-piece reveal duration */

    /* Cascade — each element overlaps the next so motion never stops. */
    tl.to(heading, { opacity: 1, y: 0, duration: D, ease: E }, 0.00);
    paragraphs.forEach((p, i) => {
      tl.to(p, { opacity: 1, y: 0, duration: D, ease: E }, 0.16 + i * 0.12);
    });

    if (sign)   tl.to(sign,   { opacity: 1, y: 0, duration: D + 0.05, ease: E }, 0.60);
    if (ctas)   tl.to(ctas,   { opacity: 1, y: 0, duration: D,        ease: E }, 0.74);
    if (rule)   tl.to(rule,   { opacity: 1,        duration: 0.16,    ease: E }, 0.85);
    if (footer) tl.to(footer, { opacity: 1,        duration: 0.16,    ease: E }, 0.90);
  })();

  /* ============================================================
     Refresh after fonts / load
     ============================================================ */
  function refreshScrollTriggers() {
    setViewportVars();
    setResponsiveSceneHeights();
    updateBlurAccessibility();
    ScrollTrigger.refresh();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refreshScrollTriggers);
  }
  window.addEventListener('load', refreshScrollTriggers);

})();
