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
     Scene 2 — lines reveal as user scrolls in, then fade out.
     Section is 200vh tall with a sticky stage. Timeline:
       0.0–0.4   line 0 fades in
       0.4–0.8   line 1 fades in
       0.8–1.6   dwell (both visible)
       1.6–2.2   both fade out
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

    /* Reveal each line */
    lines.forEach((line, i) => {
      tl.to(line, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: 'power2.out',
      }, i * 0.4);
    });

    /* Longer dwell so both lines stay visible across most of the scroll */
    tl.to(lines, { opacity: 1, duration: 1.2 }, 0.8);

    /* Fade out cleanly before Scene 3 */
    tl.to(lines, {
      opacity: 0,
      y: -8,
      duration: 0.6,
      ease: 'power2.in',
    }, 2.0);
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
    const innoRot = [-5, 3, -3, 4];   /* final tilt per card (deg) */

    /* Set initial state for each card so scrub interpolates cleanly */
    innos.forEach((inno, i) => {
      gsap.set(inno, { opacity: 0, rotation: innoRot[i], y: 22, scale: 0.96 });
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
        rotation: innoRot[i],
        duration: 0.5,
        ease: 'power2.out',
      }, i * 0.22 + 0.1);
    });

    /* Hand off — fade ALL setup lines + innovations out (breathing room) before climax */
    const setupEndsAt = (setup.length - 1) * SETUP_STEP + 0.4;          /* last setup fully shown */
    const handoffAt   = setupEndsAt + 0.4;                              /* fade-out begins after dwell */
    tl.to(setup, { opacity: 0, y: -10, duration: 0.5, ease: 'power2.out' }, handoffAt);
    tl.to(innos, { opacity: 0, y: -10, duration: 0.5, ease: 'power2.out' }, handoffAt);

    if (climax) {
      /* Breathing room: 0.4 timeline-units of empty screen before climax appears */
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

    /* ── Image pan + zoom: left → right, ending on the Palace rotunda ── */
    if (image) {
      /* Pan the object-position from left-center to right-center (the Palace).
         We use a proxy object because GSAP can't directly tween object-position
         with two independent values cleanly. */
      const panProxy = { x: 10, y: 40, s: 1 };
      tl.to(panProxy, {
        x: 82, y: 62, s: 1.35,
        duration: 1,
        ease: 'none',
        onUpdate: function () {
          image.style.objectPosition = panProxy.x + '% ' + panProxy.y + '%';
          image.style.transform = 'scale(' + panProxy.s + ')';
        },
      }, 0);
    }

    /* ── Text line cycling ── */
    const N = lines.length;
    const SLOT = 1 / N;
    const FADE = SLOT * 0.3;
    const HOLD = SLOT * 0.4;

    lines.forEach((line, i) => {
      const start = i * SLOT;
      tl.to(line, {
        opacity: 1, y: 0,
        duration: FADE,
        ease: 'power2.out',
      }, start);
      if (i < N - 1) {
        tl.to(line, {
          opacity: 0, y: -14,
          duration: FADE,
          ease: 'power2.in',
        }, start + FADE + HOLD);
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
    const layers = Array.from(section.querySelectorAll('.day__layer'));
    const map    = section.querySelector('.day__map');
    const svg    = section.querySelector('.day__map-svg');
    const stage  = section.querySelector('.day__stage');
    const N = layers.length;
    if (!N || !map || !stage) return;

    /* Beat-to-zone mapping. Beat 0 = no zone (map is the hero). */
    const beatZones = ['', '', 'grounds', 'fare', 'tour', 'lab', 'lagoon'];

    /* Initial layer state — beat 0 visible, others below + invisible. */
    gsap.set(layers[0], { y: 0, opacity: 1 });
    for (let i = 1; i < N; i++) {
      gsap.set(layers[i], { y: 50, opacity: 0 });
    }
    layers.forEach(layer => {
      const img = layer.querySelector('.day__image');
      if (img) gsap.set(img, { scale: 1 });
    });

    /* Map starts at hero size (transform identity) — CSS gives it
       width: 100% of stage. GSAP will scale + translate it to the
       corner during the beat 0 → 1 handoff. */
    gsap.set(map, { x: 0, y: 0, scale: 1, transformOrigin: 'top left' });

    /* Corner-target values are recomputed on each ScrollTrigger refresh
       (init + window resize). Stored on a state object so the tween
       can read fresh values when re-evaluated. */
    const mapState = { scale: 0.3, x: 250, y: 16 };
    function refreshCornerTarget() {
      const stageW = stage.offsetWidth || 720;
      const cornerW = Math.max(110, Math.min(180, stageW * 0.22));
      const margin = 16;
      mapState.scale = cornerW / stageW;
      mapState.x = stageW - cornerW - margin;
      mapState.y = margin;
    }
    refreshCornerTarget();

    let lastZone = '__none__';
    function setZone(zone) {
      if (!svg) return;
      if (zone === lastZone) return;
      lastZone = zone;
      svg.querySelectorAll('.atlas__zone').forEach((el) => {
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
          /* Sync zone highlight to the active beat. Use floor +
             clamp so the zone changes cleanly at slot boundaries. */
          const i = Math.min(N - 1, Math.floor(self.progress * N));
          setZone(beatZones[i] || '');
        },
      },
    });

    const SLOT = 1 / N;
    /* Generous crossfade: 45% of each slot is transition, creating
       a cinematic dissolve where outgoing and incoming overlap. */
    const FADE = SLOT * 0.45;
    const HOLD = SLOT - FADE;

    /* Map shrink-to-corner — smooth transition during beat 0 → 1 */
    const mapShrinkStart = SLOT - FADE;
    const mapShrinkDur   = FADE * 2;
    tl.to(map, {
      scale: () => mapState.scale,
      x:     () => mapState.x,
      y:     () => mapState.y,
      duration: mapShrinkDur,
      ease: 'power3.inOut',
    }, mapShrinkStart);

    /* Layer crossfade — cinematic dissolve with gentle Ken Burns drift. */
    layers.forEach((layer, i) => {
      const slotStart = i * SLOT;
      const img = layer.querySelector('.day__image');

      /* Enter: dissolve in with a slow upward drift */
      if (i > 0) {
        gsap.set(layer, { y: 30, opacity: 0 });
        tl.to(layer, {
          y: 0, opacity: 1,
          duration: FADE,
          ease: 'power2.out',
        }, slotStart);
      }

      /* Ken Burns: very slow push-in while the beat is visible */
      if (img) {
        const kbStart = slotStart + (i > 0 ? FADE * 0.5 : 0);
        const kbDur   = HOLD + FADE * 0.5;
        tl.fromTo(img,
          { scale: 1 },
          { scale: 1.06, duration: kbDur, ease: 'none' },
          kbStart
        );
      }

      /* Exit: dissolve out gently — overlaps with next beat's enter */
      if (i < N - 1) {
        tl.to(layer, {
          y: -20, opacity: 0,
          duration: FADE,
          ease: 'power2.inOut',
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
     Scene 9 — Letter: scrub-driven progressive reveal.
     Section is taller than 1 viewport; sticky frame stays pinned.
     Title appears first, then body lines, then signature/CTA.
     ============================================================ */
  (function scene9_letter() {
    const section = document.getElementById('scene-letter');
    if (!section) return;
    const heading = section.querySelector('.letter__h');
    const paragraphs = section.querySelectorAll('.letter__p');
    const sign = section.querySelector('.letter__sign');
    if (!heading || !paragraphs.length) return;

    /* Trigger-based staggered reveal — plays once when section enters view.
       No scrub needed; the section is exactly 100vh so there's nothing to scroll
       past. Content reveals in a smooth cascade and stays visible. */
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
    });

    tl.to(heading, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
    }, 0);

    paragraphs.forEach((p, i) => {
      tl.to(p, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power2.out',
      }, 0.3 + i * 0.35);
    });

    if (sign) {
      tl.to(sign, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out',
      }, 0.3 + paragraphs.length * 0.35 + 0.2);
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
