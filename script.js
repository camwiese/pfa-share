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

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;

  /* ── Lenis (skip on touch & reduced-motion) ───────────────── */
  let lenis = null;
  if (!isTouch && !prefersReduced && typeof Lenis !== 'undefined') {
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

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
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

  /* ── Reduced motion: show everything in its final state, skip animations ── */
  if (prefersReduced) {
    document.querySelectorAll(
      '.blur__line, .reveal__line, .reveal__inno, .letter__h, .letter__p, .letter__sign, .impact__line, .impact__w'
    ).forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    /* Climax-line is positioned but should remain visible too */
    document.querySelectorAll('.reveal__line--climax').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return; /* Do not initialise any scroll-driven scenes */
  }

  /* =============================================================
     SCENE 2 — "A place you can visit…"
     Each line reveals on its own scroll beat. The two lines never
     appear together; there's a real scroll gap before line 2 joins.
     Then both hold, then both fade out cleanly.
     Timeline (scrub-driven, 0–3.0):
       0.20–0.55  line 1 fades in
       0.55–1.10  hold line 1 alone (reader beat)
       1.10–1.45  line 2 fades in
       1.45–2.40  hold both
       2.40–2.80  both fade out
     ============================================================= */
  (function scene2_reveal() {
    const section = document.getElementById('scene-blur');
    if (!section) return;
    const lines = section.querySelectorAll('.blur__line');
    if (!lines.length) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.8,
      },
    });

    /* Line 1 fades in. */
    tl.fromTo(lines[0],
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
      0.20
    );

    /* Hold line 1 alone — meaningful scroll beat for the reader. */
    tl.to(lines[0], { opacity: 1, duration: 0.55 }, 0.55);

    /* Line 2 finally joins. */
    if (lines[1]) {
      tl.fromTo(lines[1],
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
        1.10
      );
    }

    /* Hold both. */
    tl.to(lines, { opacity: 1, duration: 0.95 }, 1.45);

    /* Fade out cleanly before Scene 3. */
    tl.to(lines, {
      opacity: 0, y: -8,
      duration: 0.4,
      ease: 'power2.in',
    }, 2.40);
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
    section.style.minHeight = (setup.length * 60 + 180) + 'vh';

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

    /* Cards drop in — staggered across the first couple of setup beats. */
    innos.forEach((inno, i) => {
      tl.to(inno, {
        opacity: 1, y: 0, scale: 1,
        rotation: innoRot[i] || 0,
        duration: 0.55,
        ease: 'power3.out',
      }, PREROLL + 0.1 + i * 0.22);
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
    if (!h) return;

    gsap.set([h, sub, yr], { y: 14 });

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

    /* Linger — fully visible */
    tl.to([h, sub, yr], { opacity: 1, duration: 0.7 }, 0.85);

    /* Fade text out before Scene 6; the plate keeps going (it
       continues into Scene 6 as the corner inset). */
    tl.to([h, sub, yr], { opacity: 0, y: -12, duration: 0.4, ease: 'power2.in' }, 1.55);
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

    /* ── Image pan + zoom: left → right, ending on the Palace rotunda ──
       The image (3393×1352) is a wide panorama. The Palace of Fine Arts
       sits in the right ~70–80% of the frame. We start at the far left
       (water/sailboats/Tower of Jewels), pan right across the fairgrounds,
       and finish zoomed on the Palace area. The pan resolves by ~65% of
       the timeline so the last text lines read against the held Palace shot. */
    if (image) {
      const panProxy = { x: 0, y: 50, s: 1 };
      tl.to(panProxy, {
        x: 100, y: 100, s: 1.5,
        duration: 0.65,             /* finishes early; image holds for the closing text */
        ease: 'power1.inOut',       /* gentle start, settled finish */
        onUpdate: function () {
          image.style.objectPosition = panProxy.x + '% ' + panProxy.y + '%';
          image.style.transform = 'scale(' + panProxy.s + ')';
        },
      }, 0);
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
    const map    = section.querySelector('.day__map');
    const stage  = section.querySelector('.day__stage');
    const N = layers.length;
    if (!N || !map || !stage) return;

    /* Split each caption into word spans so they can reveal one at a time. */
    layers.forEach((layer) => {
      const cap = layer.querySelector('.day__caption');
      if (!cap || cap.dataset.split === '1') return;
      const text = cap.getAttribute('data-caption') || cap.textContent;
      cap.innerHTML = '';
      const words = text.split(/\s+/);
      words.forEach((w, i) => {
        const span = document.createElement('span');
        span.className = 'day__caption-w';
        span.innerHTML = w;
        cap.appendChild(span);
        if (i < words.length - 1) cap.appendChild(document.createTextNode(' '));
      });
      cap.dataset.split = '1';
    });

    /* Initial layer state — beat 0 visible, others invisible.
       Pure opacity crossfade — no y-translate, so beats dissolve smoothly. */
    gsap.set(layers[0], { opacity: 1 });
    for (let i = 1; i < N; i++) gsap.set(layers[i], { opacity: 0 });

    /* Each layer's caption words start hidden — they'll reveal during the beat. */
    layers.forEach((layer) => {
      gsap.set(layer.querySelectorAll('.day__caption-w'), { opacity: 0, y: 4 });
    });

    /* Image Ken Burns reset. */
    layers.forEach(layer => {
      const img = layer.querySelector('.day__image');
      if (img) gsap.set(img, { scale: 1 });
    });

    /* Plate: starts hero-sized (transform identity). It will scale toward
       its TOP-RIGHT corner so the small inset sits flush at the top-right
       of the photo frame (same top-right point as the stage in this layout). */
    gsap.set(map, { x: 0, y: 0, scale: 1, transformOrigin: 'top right' });

    /* Corner-target scale: small inset that fits at the top-right of each
       photo. Recomputed on every ScrollTrigger refresh (resize). */
    const mapState = { scale: 0.18 };
    function refreshCornerTarget() {
      const stageW = stage.offsetWidth || 720;
      const cornerW = Math.max(100, Math.min(160, stageW * 0.20));
      mapState.scale = cornerW / stageW;
    }
    refreshCornerTarget();

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
        invalidateOnRefresh: true,
        onRefresh: refreshCornerTarget,
      },
    });

    const SLOT = 1 / N;
    /* Generous crossfade: previous beat dissolves into the next within
       a fade window that overlaps with the next beat's enter. */
    const FADE = SLOT * 0.55;
    const HOLD = SLOT - FADE;

    /* Plate shrink-to-corner during beat 0 → 1. */
    const mapShrinkStart = SLOT - FADE;
    const mapShrinkDur   = FADE * 1.8;
    tl.to(map, {
      scale: () => mapState.scale,
      duration: mapShrinkDur,
      ease: 'power3.inOut',
    }, mapShrinkStart);

    /* Per-layer choreography: enter (opacity) → word-by-word caption
       reveal during the hold → Ken Burns through the whole beat →
       gentle opacity exit overlapping with the next beat's enter. */
    layers.forEach((layer, i) => {
      const slotStart = i * SLOT;
      const img   = layer.querySelector('.day__image');
      const words = layer.querySelectorAll('.day__caption-w');

      /* Layer enter (opacity only). */
      if (i > 0) {
        tl.to(layer, {
          opacity: 1,
          duration: FADE,
          ease: 'sine.inOut',
        }, slotStart);
      }

      /* Caption words reveal one at a time across the hold window. */
      if (words.length) {
        const captionStart = slotStart + FADE * 0.85;
        const captionEnd   = slotStart + FADE + HOLD * 0.85;
        const captionDur   = Math.max(0.001, captionEnd - captionStart);
        const stepDur      = captionDur / words.length;
        words.forEach((w, wi) => {
          tl.to(w, {
            opacity: 1, y: 0,
            duration: Math.min(0.18, stepDur * 1.4),
            ease: 'power2.out',
          }, captionStart + wi * stepDur);
        });
      }

      /* Ken Burns push-in across the beat. */
      if (img) {
        tl.fromTo(img,
          { scale: 1 },
          { scale: 1.04, duration: SLOT + FADE, ease: 'none' },
          slotStart
        );
      }

      /* Layer exit — overlaps with the next beat's enter. */
      if (i < N - 1) {
        tl.to(layer, {
          opacity: 0,
          duration: FADE,
          ease: 'sine.inOut',
        }, slotStart + HOLD);
        /* Caption words exit with the layer. */
        if (words.length) {
          tl.to(words, {
            opacity: 0,
            duration: FADE,
            ease: 'sine.inOut',
          }, slotStart + HOLD);
        }
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
    section.style.minHeight = (Math.max(180, words.length * 8 + 80)) + 'vh';

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
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener('load', () => ScrollTrigger.refresh());

})();
