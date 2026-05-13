/* ============================================================
   Future Palace — scrollytelling
   ============================================================ */

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

  /* ============================================================
     Scene 2 — each line reveals on its own scroll beat. The two
     lines don't appear together; line 2 only joins as the user keeps
     scrolling. Both then linger, then both fade out cleanly.
     ============================================================ */
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
        scrub: 0.6,
      },
    });

    /* Line 1 reveals as the user begins to scroll */
    tl.to(lines[0], {
      opacity: 1, y: 0,
      duration: 0.25,
      ease: 'power2.out',
    }, 0.05);

    /* Line 2 holds back — only joins after the reader has had time
       to read line 1 (a meaningful scroll beat later) */
    if (lines[1]) {
      tl.to(lines[1], {
        opacity: 1, y: 0,
        duration: 0.25,
        ease: 'power2.out',
      }, 0.45);
    }

    /* Both lines hold across the middle of the section */
    tl.to(lines, { opacity: 1, duration: 0.8 }, 0.7);

    /* Fade out cleanly before Scene 3 */
    tl.to(lines, {
      opacity: 0,
      y: -8,
      duration: 0.4,
      ease: 'power2.in',
    }, 1.5);
  })();

  /* ============================================================
     Scene 3 — progressive line reveal w/ lingering climax
     Section scrolls 7 viewport-heights tall so each beat breathes.
     Timeline beats:
       0.0–2.0   setup lines 0..3 reveal (each at i*0.5),
                 previous fades to 0.35
       2.4       all setup lines fade to 0
       2.5–3.0   climax fades in + scales up
       3.0–5.0   climax lingers (no animation)
       5.0–5.6   climax fades out cleanly before Scene 4
     ============================================================ */
  (function scene3_reveal() {
    const section = document.getElementById('scene-reveal');
    if (!section) return;
    const lines = section.querySelectorAll('.reveal__line');
    if (!lines.length) return;

    const setup = Array.from(lines).filter(l => !l.classList.contains('reveal__line--climax'));
    const climax = section.querySelector('.reveal__line--climax');

    /* Tight total scroll — about 55vh per setup line plus handoff + climax linger */
    section.style.minHeight = (setup.length * 55 + 140) + 'vh';

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
      },
    });

    /* Innovation polaroid stack — appears as Bay Area lines are revealed */
    const innos = section.querySelectorAll('.reveal__inno');
    const innoRot = [-4, 4, -2];   /* final tilt per card (deg), three cards */

    /* Set initial state for each card so scrub interpolates cleanly */
    innos.forEach((inno, i) => {
      gsap.set(inno, { opacity: 0, rotation: innoRot[i] || 0, y: 22, scale: 0.96 });
    });

    /* Setup lines reveal sequentially, each dimming the previous */
    const SETUP_STEP = 0.4;
    setup.forEach((line, i) => {
      tl.to(line, {
        opacity: 1,
        y: 0,
        duration: 0.32,
        ease: 'power2.out',
      }, i * SETUP_STEP);
      if (i > 0) {
        tl.to(setup[i - 1], {
          opacity: 0.30,
          duration: 0.32,
        }, i * SETUP_STEP);
      }
    });

    /* Innovation cards drop in — staggered across the first two setup beats */
    innos.forEach((inno, i) => {
      tl.to(inno, {
        opacity: 1,
        y: 0,
        scale: 1,
        rotation: innoRot[i] || 0,
        duration: 0.5,
        ease: 'power2.out',
      }, i * 0.22 + 0.1);
    });

    /* Hand off — fade setup lines out first; the cards keep lingering */
    const setupEndsAt = (setup.length - 1) * SETUP_STEP + 0.4;          /* last setup fully shown */
    const handoffAt   = setupEndsAt + 0.4;                              /* text fade-out begins after dwell */
    tl.to(setup, { opacity: 0, y: -10, duration: 0.5, ease: 'power2.out' }, handoffAt);

    if (climax) {
      /* Breathing room before climax appears */
      tl.to(climax, {
        opacity: 1,
        y: 0,
        scale: 1.05,
        duration: 0.65,
        ease: 'power2.out',
      }, handoffAt + 0.9);
      /* Climax lingers */
      tl.to(climax, {
        opacity: 1,
        duration: 1.2,
      }, handoffAt + 1.6);
      /* Cards finally fade — after text climax has held; lets them linger */
      tl.to(innos, {
        opacity: 0,
        y: -10,
        duration: 0.7,
        ease: 'power2.in',
      }, handoffAt + 2.4);
      /* Clean exit before Scene 4 */
      tl.to(climax, {
        opacity: 0,
        y: -14,
        duration: 0.55,
        ease: 'power2.in',
      }, handoffAt + 2.9);
    }
  })();

  /* ============================================================
     Scene 5 — Welcome to the Future: fade IN as you scroll into the
     section, linger, then fade OUT before the day-flow images begin.
     ============================================================ */
  (function scene5_establish() {
    const section = document.querySelector('.scene--establish');
    if (!section) return;
    const h   = section.querySelector('.establish__h');
    const sub = section.querySelector('.establish__sub');
    const yr  = section.querySelector('.establish__year');
    if (!h) return;

    gsap.set([h, sub, yr], { y: 14 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.6,
      },
    });

    /* Reveal stack at start (0.0 – 0.6 of timeline) */
    tl.to(h,   { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, 0.0);
    tl.to(sub, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, 0.15);
    tl.to(yr,  { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, 0.30);

    /* Linger 0.6 – 1.4 — fully visible */
    tl.to([h, sub, yr], { opacity: 1, duration: 0.8 }, 0.6);

    /* Fade out cleanly before day-flow images begin */
    tl.to([h, sub, yr], { opacity: 0, y: -12, duration: 0.4, ease: 'power2.in' }, 1.5);
  })();

  /* ============================================================
     Scene 4 — PPIE: scrub-driven smooth reveal.
     Image stays pinned; text fades in/out as scroll passes each line.
     Reverse scroll reverses the reveal.
     ============================================================ */
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
        x: 100, y: 62, s: 1.5,
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

  /* ============================================================
     Scene 6 — Day flow crossfade
     ============================================================ */
  /* ============================================================
     Scene 6 — Day flow: cinematic sticky stage with integrated map.
     Beat 0 shows the site plan filling the stage. Between beats
     0 and 1 the map scales down + translates to the top-right corner
     and stays there as a spatial companion. For each of beats 1–6
     the corresponding zone highlights on the now-corner-sized map.
     ============================================================ */
  (function scene6_day() {
    const section = document.getElementById('scene-day');
    if (!section) return;
    const layers  = Array.from(section.querySelectorAll('.day__layer'));
    const map     = section.querySelector('.day__map');
    const overlay = section.querySelector('.day__map-overlay');
    const stage   = section.querySelector('.day__stage');
    const N = layers.length;
    if (!N || !map || !stage) return;

    /* Beat-to-zone mapping. Beat 0 = no zone (map is the hero). */
    const beatZones = ['', 'grounds', 'grounds', 'fare', 'tour', 'lab', 'lagoon'];

    /* Initial layer state — beat 0 visible, others invisible.
       No y-translation: pure opacity crossfade so beats dissolve. */
    gsap.set(layers[0], { opacity: 1 });
    for (let i = 1; i < N; i++) {
      gsap.set(layers[i], { opacity: 0 });
    }
    layers.forEach(layer => {
      const img = layer.querySelector('.day__image');
      if (img) gsap.set(img, { scale: 1 });
    });

    /* Map starts at hero size (transform identity) — CSS gives it
       width: 100% of stage. GSAP will scale + translate it to the
       bottom-right corner during the beat 0 → 1 handoff. */
    gsap.set(map, { x: 0, y: 0, scale: 1, transformOrigin: 'bottom right' });

    /* Corner-target values are recomputed on each ScrollTrigger refresh
       (init + window resize). Stored on a state object so the tween
       can read fresh values when re-evaluated. Bottom-right anchor:
       with transformOrigin: 'bottom right', x:0 y:0 keeps the bottom-right
       corner pinned through the scale — so the map shrinks INTO that corner. */
    const mapState = { scale: 0.3 };
    function refreshCornerTarget() {
      const stageW = stage.offsetWidth || 720;
      const cornerW = Math.max(120, Math.min(200, stageW * 0.26));
      mapState.scale = cornerW / stageW;
    }
    refreshCornerTarget();

    let lastZone = '__none__';
    function setZone(zone) {
      if (!overlay) return;
      if (zone === lastZone) return;
      lastZone = zone;
      overlay.querySelectorAll('.atlas__zone').forEach((el) => {
        el.classList.toggle('is-active', !!zone && el.dataset.zone === zone);
      });
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        invalidateOnRefresh: true,
        onRefresh: refreshCornerTarget,
        onUpdate: (self) => {
          /* Sync zone highlight to the active beat. */
          const i = Math.min(N - 1, Math.floor(self.progress * N));
          setZone(beatZones[i] || '');
        },
      },
    });

    const SLOT = 1 / N;
    /* Generous crossfade: ~65% of each slot is transition, so the
       previous beat is still partly visible as the next one arrives —
       a true dissolve, not a swap. */
    const FADE = SLOT * 0.65;
    const HOLD = SLOT - FADE;

    /* Map shrink-to-corner — smooth transition during beat 0 → 1 */
    const mapShrinkStart = SLOT - FADE;
    const mapShrinkDur   = FADE * 2;
    tl.to(map, {
      scale: () => mapState.scale,
      duration: mapShrinkDur,
      ease: 'power3.inOut',
    }, mapShrinkStart);

    /* Layer crossfade — pure opacity dissolve with a slow Ken Burns push-in.
       No y-translation; the previous beat fades out while the next fades in,
       overlapping inside the FADE window for a true cinematic dissolve. */
    layers.forEach((layer, i) => {
      const slotStart = i * SLOT;
      const img = layer.querySelector('.day__image');

      /* Enter: dissolve in (opacity only) */
      if (i > 0) {
        gsap.set(layer, { opacity: 0 });
        tl.to(layer, {
          opacity: 1,
          duration: FADE,
          ease: 'sine.inOut',
        }, slotStart);
      }

      /* Ken Burns: gentle slow push-in for the duration of the beat */
      if (img) {
        const kbStart = slotStart;
        const kbDur   = SLOT + FADE;     /* run through enter + hold */
        tl.fromTo(img,
          { scale: 1 },
          { scale: 1.04, duration: kbDur, ease: 'none' },
          kbStart
        );
      }

      /* Exit: dissolve out — overlaps with next beat's enter */
      if (i < N - 1) {
        tl.to(layer, {
          opacity: 0,
          duration: FADE,
          ease: 'sine.inOut',
        }, slotStart + HOLD);
      }
    });
  })();

  /* ============================================================
     Scene 7 — Impact: word-by-word reveal driven by scroll.
     Words stay hidden until the user is fully inside the section
     (so they don't bleed into Scene 6 below or Scene 8 above).
     ============================================================ */
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

  /* ============================================================
     Scene 9 — Letter: scrub-driven line-by-line reveal.
     Section is 220vh tall with a sticky stage. As the user scrolls
     into the section, each piece appears on its own beat — heading,
     each paragraph, signature, CTAs, then footer. When the cascade
     finishes the user is exactly at the page bottom (no further scroll).
     ============================================================ */
  (function scene9_letter() {
    const section = document.getElementById('scene-letter');
    if (!section) return;
    const heading    = section.querySelector('.letter__h');
    const paragraphs = section.querySelectorAll('.letter__p');
    const sign       = section.querySelector('.letter__sign');
    const ctas       = section.querySelector('.letter__ctas');
    const footer     = section.querySelector('.letter__footer');
    if (!heading || !paragraphs.length) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
      },
    });

    /* Cascade timing across the 0–1 scrub range. Each piece arrives
       on its own scroll beat; later pieces overlap slightly so the
       cascade flows rather than ticking. */
    tl.to(heading, { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' }, 0.00);

    paragraphs.forEach((p, i) => {
      tl.to(p, { opacity: 1, y: 0, duration: 0.14, ease: 'power2.out' },
        0.18 + i * 0.14);
    });

    if (sign) {
      tl.to(sign, { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out' }, 0.62);
    }
    if (ctas) {
      tl.to(ctas, { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out' }, 0.78);
    }
    if (footer) {
      tl.to(footer, { opacity: 1, duration: 0.12, ease: 'power2.out' }, 0.92);
    }
  })();

  /* ============================================================
     Refresh after fonts / load
     ============================================================ */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener('load', () => ScrollTrigger.refresh());

})();
