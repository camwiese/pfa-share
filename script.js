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
         through text-heavy scenes too quickly with desktop spacing.
         Bumped to give each line a longer dwell at full opacity —
         the new reveal timeline (slower line-0 entry, longer hold
         before fade) needs more scroll runway to feel deliberate. */
      const isMobile = window.matchMedia('(max-width: 860px)').matches;
      const perLine = isMobile ? 1.05 : 0.85;
      const padding = isMobile ? 2.6 : 2.2;
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
    const LAST_HOLD  = 2.60;          /* extra dwell on the last line — readers should sit with "hope for the future" */
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
     HERO TITLE — page-load fade-in, then scroll-driven fade-out as
     Scene 1 hands off to Scene 2. Both transitions run through GSAP
     so they share one inline-style writer (no CSS-animation override
     fighting GSAP's opacity tween).
     ============================================================= */
  (function heroTitleFade() {
    const title = document.querySelector('.hero__title');
    const chevron = document.querySelector('.hero__chevron');
    const heroSection = document.querySelector('.scene--hero');
    if (!title || !heroSection) return;

    /* Page-load entrance (was a CSS @keyframes; now GSAP). */
    gsap.to(title, { opacity: 1, y: 0, duration: 1.4, delay: 0.4, ease: 'power2.out' });
    if (chevron) gsap.to(chevron, { opacity: 1, duration: 1.0, delay: 1.2, ease: 'power2.out' });

    /* Scroll-driven exit. `immediateRender: false` keeps GSAP from
       clobbering the entrance tween's starting state at progress 0. */
    const targets = chevron ? [title, chevron] : [title];
    gsap.to(targets, {
      opacity: 0,
      y: '-=20',
      ease: 'none',
      immediateRender: false,
      scrollTrigger: {
        trigger: heroSection,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.4,
      },
    });
  })();

  /* =============================================================
     SCENE 2 VEIL — ramp up the backdrop blur as the copy reveals
     so the image stays crisp at first, then softly recedes behind
     Scene 2's text. The image itself never moves; only the blur on
     the image grows.
     ============================================================= */
  (function scene2VeilBlur() {
    const veil = document.querySelector('.blur__veil');
    const section = document.getElementById('scene-blur');
    if (!veil || !section) return;
    /* Scrub a numeric proxy and write it into the CSS variable each
       frame; GSAP can't directly tween calc()/var() unit strings on
       backdrop-filter cleanly across browsers, so we go through the
       custom property instead. */
    const state = { v: 0 };
    gsap.to(state, {
      v: 16,
      ease: 'none',
      onUpdate: () => veil.style.setProperty('--blur-px', state.v + 'px'),
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',        /* begin ramping as Scene 2 enters viewport */
        end: 'top top',             /* fully blurred by the time it pins */
        scrub: 0.6,
      },
    });
  })();

  /* =============================================================
     HERO BACKGROUND — fade out as Scene 2 exits
     The hero image is position:fixed (see .hero__image in CSS), so
     it stays pinned to the viewport across Scenes 1+2 while the
     text scrolls over it. Once we transition into Scene 3 (cream
     paper) we fade it out — without this it would still be pinned
     in the viewport behind any later scene whose background is
     transparent (e.g. Scene 6's day-flow, which overlaps Scene 5).
     ============================================================= */
  (function heroBgFade() {
    const heroImage = document.querySelector('.hero__image');
    const blurSection = document.getElementById('scene-blur');
    if (!heroImage || !blurSection) return;
    gsap.to(heroImage, {
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: blurSection,
        /* Start once Scene 2's sticky has released (its bottom
           reaches viewport bottom) — i.e. as the section begins
           scrolling out. End when its bottom hits viewport top, the
           moment Scene 3 fully takes over. */
        start: 'bottom bottom',
        end: 'bottom top',
        scrub: 0.5,
      },
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

    /* Pre-roll: breathing room so paper sits alone before text arrives.
       Long pause before "Here in the Bay Area…" — the reader should
       arrive on cream paper and have a moment to settle. */
    const PREROLL = 1.5;

    /* Setup lines reveal sequentially, each dimming the previous —
       but slowly. Line 0's entry in particular is deliberate (twice
       as long as the others). SETUP_STEP is wide so each line holds
       at full opacity for a real beat before the next arrives. */
    const SETUP_STEP   = 0.85;
    const LINE_0_DUR   = 0.70;   /* slower, deliberate entry for the opening line */
    const LINE_N_DUR   = 0.40;
    const DIM_DELAY    = 0.35;   /* don't dim the previous line until the new one is well underway */
    setup.forEach((line, i) => {
      const at = PREROLL + i * SETUP_STEP;
      tl.to(line, {
        opacity: 1, y: 0,
        duration: i === 0 ? LINE_0_DUR : LINE_N_DUR,
        ease: 'power3.out',
      }, at);
      if (i > 0) {
        tl.to(setup[i - 1], {
          opacity: 0.30,
          duration: 0.40,
        }, at + DIM_DELAY);
      }
    });

    /* Cards drop in after line 0 has finished revealing, so the
       reader sees the sentence first, then the example imagery. */
    const CARDS_START = PREROLL + LINE_0_DUR * 0.5;
    innos.forEach((inno, i) => {
      tl.to(inno, {
        opacity: 1, y: 0, scale: 1,
        rotation: innoRot[i] || 0,
        duration: 0.60,
        ease: 'power3.out',
      }, CARDS_START + i * 0.28);
    });

    /* Handoff: lines hold at their final state for a real dwell so
       the reader has time to sit with all three sentences before the
       section starts fading toward the climax. */
    const setupEndsAt = PREROLL + (setup.length - 1) * SETUP_STEP + LINE_N_DUR;
    const handoffAt   = setupEndsAt + 1.10;     /* generous hold */
    tl.to(setup, { opacity: 0, y: -10, duration: 0.6, ease: 'power2.out' }, handoffAt);

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
    tl.to(linger, { opacity: 1, duration: 0.55 }, 0.95);

    /* Exit — the welcome scrolls UP and fades as Scene 6's first
       beat arrives. The text and the lagoon art lift visibly (not
       just a token nudge) so the handoff reads as "this scene
       moves out of the way" rather than a simple fade. */
    tl.to([h, sub, yr], { opacity: 0, y: -60, duration: 0.6, ease: 'power2.in' }, 1.50);
    if (art) tl.to(art, { opacity: 0, y: -120, duration: 0.65, ease: 'power2.in' }, 1.48);

    /* Pad the timeline tail so fade-out completes at ~50% of trigger
       progress (= scroll 100vh into the 200vh section). Scene 6 is
       pulled up by -100vh via margin-top, so its sticky takes over
       the viewport at exactly that scroll position — welcome fade-out
       lands just as the first vision beat arrives, no empty cream
       paper in between. */
    tl.to({}, { duration: 2.10 }, 2.10);
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
    const section   = document.getElementById('scene-ppie');
    if (!section) return;
    const linesWrap = section.querySelector('.ppie__lines');
    const text      = section.querySelector('.ppie__text');
    const image     = section.querySelector('.ppie__image');
    const frame     = section.querySelector('.ppie__frame');
    const lastLine  = section.querySelector('.ppie__line[data-line="3"]');
    if (!linesWrap || !text || !lastLine) return;

    if (image) {
      image.style.objectPosition = '50% 50%';
      image.style.transform = 'none';
    }

    /* Phase 1 endpoint: park linesWrap so line 4 sits centered in the
       masked strip. Function-valued so it recomputes on refresh. */
    const linesEndY = () =>
      (text.offsetHeight / 2) - (lastLine.offsetTop + lastLine.offsetHeight / 2);

    /* Phase 2 endpoint: translate the strip up so its center lands at
       viewport center (where the image used to be). The grid (image +
       gap + strip) is centered vertically in the 100vh sticky, so the
       strip sits below the grid's center by (imageHeight + gap) / 2.
       Computed from stable element heights — NOT
       getBoundingClientRect, which would return wrong values when
       GSAP samples the function before the section is scrolled into
       sticky-pinned position. */
    const grid = section.querySelector('.ppie__grid');
    const stripRiseY = () => {
      const imgH = image ? image.offsetHeight : 0;
      const gap = grid ? parseFloat(getComputedStyle(grid).rowGap) || 0 : 0;
      return -(imgH + gap) / 2;
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });

    /* Phase 1 — lines scroll until line 4 lands centered in the strip. */
    tl.fromTo(linesWrap,
      { y: () => text.offsetHeight },
      { y: linesEndY, ease: 'none', duration: 0.68 },
      0
    );

    /* Phase 2 — image slides up + fades; strip rises to viewport
       center; mask edges open so line 4 reads clean on paper. */
    if (frame) {
      tl.to(frame, { yPercent: -110, opacity: 0, ease: 'power2.in', duration: 0.12 }, 0.68);
    }
    tl.to(text, { y: stripRiseY, ease: 'power2.inOut', duration: 0.12 }, 0.68);
    tl.to(text, { '--ppie-mask-fade': '0%', ease: 'none', duration: 0.12 }, 0.68);

    /* Phase 3 — hold (no tweens, just timeline length). */
    tl.to({}, { duration: 0.12 }, 0.80);

    /* Phase 4 — closing line fades out before Scene 5. */
    tl.to(text, { opacity: 0, ease: 'power2.in', duration: 0.08 }, 0.92);
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

    /* Continuous-scroll feel: each beat rises up into the frame from
       below, holds at center, then continues upward out the top as
       the next beat rises in behind it. Adjacent beats overlap during
       their respective entrance/exit so the motion is uninterrupted —
       the eye reads one continuous vertical stream of images. */
    const RISE = isMobile ? 80 : 140;   /* px the layer travels from entry to centered */

    layers.forEach((layer, i) => {
      gsap.set(layer, { opacity: 0, y: RISE });
      const cap = layer.querySelector('.day__caption');
      if (cap) gsap.set(cap, isMobile ? { opacity: 0 } : { opacity: 0, y: 12 });
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
    /* Each beat's exit OVERLAPS the next beat's entry by FADE/2 so
       the reader always sees an image moving smoothly up the frame —
       one is sliding out the top while the next is already rising
       in below. */
    const FADE     = SLOT * (isMobile ? 0.34 : 0.32);
    const OVERLAP  = FADE * 0.55;  /* how much the exit precedes the next entry */
    const CAP_IN   = SLOT * 0.14;
    const CAP_OUT  = SLOT * 0.14;
    const CAP_HOLD = Math.max(0, SLOT - CAP_IN - CAP_OUT - FADE);

    layers.forEach((layer, i) => {
      const slotStart = i * SLOT;
      const cap = layer.querySelector('.day__caption');

      /* Enter: rise from below the centre while fading in. */
      tl.to(layer, {
        opacity: 1, y: 0,
        duration: FADE,
        ease: 'power2.out',
      }, slotStart);

      /* Caption rides in slightly after the image so the photo
         settles first and the words follow. */
      if (cap) {
        const capInAt  = slotStart + FADE * (isMobile ? 0.85 : 0.95);
        const capOutAt = capInAt + CAP_IN + CAP_HOLD;
        const capInVars = isMobile
          ? { opacity: 1, duration: CAP_IN, ease: 'power2.out' }
          : { opacity: 1, y: 0, duration: CAP_IN, ease: 'power2.out' };
        const capOutVars = isMobile
          ? { opacity: 0, duration: CAP_OUT, ease: 'power2.in' }
          : { opacity: 0, y: -10, duration: CAP_OUT, ease: 'power2.in' };
        tl.to(cap, capInVars, capInAt);
        if (i < N - 1) tl.to(cap, capOutVars, capOutAt);
      }

      /* Exit: continue rising and fading. Starts OVERLAP before the
         next beat's slot, so the next image is already rising into
         frame while this one is still on its way out. The motion is
         continuous — there's never a fully-still moment between
         beats. */
      if (i < N - 1) {
        tl.to(layer, {
          opacity: 0, y: -RISE,
          duration: FADE,
          ease: 'power2.in',
        }, (i + 1) * SLOT - OVERLAP);
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
        scrub: 1.4,           /* generous scrub for a flowing cascade */
      },
    });

    const E = 'power2.out';   /* gentler easing — less abrupt arrival */
    const D = 0.40;            /* per-piece reveal duration */

    /* Cascade — each element overlaps the next so motion never stops.
       Spaced wider than the earlier draft so the closing letter
       reads with room to breathe rather than rushing the reader. */
    tl.to(heading, { opacity: 1, y: 0, duration: D, ease: E }, 0.00);
    paragraphs.forEach((p, i) => {
      tl.to(p, { opacity: 1, y: 0, duration: D, ease: E }, 0.30 + i * 0.22);
    });

    if (sign)   tl.to(sign,   { opacity: 1, y: 0, duration: D + 0.10, ease: E }, 1.10);
    if (ctas)   tl.to(ctas,   { opacity: 1, y: 0, duration: D,        ease: E }, 1.45);
    if (rule)   tl.to(rule,   { opacity: 1,        duration: 0.30,    ease: E }, 1.75);
    if (footer) tl.to(footer, { opacity: 1,        duration: 0.30,    ease: E }, 1.95);

    /* A real beat at the end — the closing letter sits, breathes,
       and the reader lands at the bottom of the page in stillness
       rather than mid-cascade. */
    tl.to({}, { duration: 1.30 }, 2.30);
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
