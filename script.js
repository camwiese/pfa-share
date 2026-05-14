/* =============================================================
   Future Palace v2 — Cinematic panels
   No GSAP. No ScrollTrigger. No Lenis.
   Viewport fix + IntersectionObserver + progress dots.
   ============================================================= */

(function () {
  'use strict';

  /* ── Viewport height fix (iOS address bar) ──────────── */
  function setVH() {
    var vh = (window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight) * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }

  setVH();
  window.addEventListener('resize', setVH, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setVH, { passive: true });
  }

  /* ── Reduced motion: show everything, skip observer ─── */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.panel').forEach(function (p) {
      p.classList.add('is-active');
    });
    return;
  }

  /* ── Build progress dots ────────────────────────────── */
  var panels = Array.from(document.querySelectorAll('.panel[data-panel]'));
  var progressNav = document.querySelector('.progress');
  var dots = [];

  panels.forEach(function (_, i) {
    var dot = document.createElement('div');
    dot.className = 'progress__dot';
    if (i === 0) dot.classList.add('is-current');
    progressNav.appendChild(dot);
    dots.push(dot);
  });

  var hasScrolled = false;
  function showProgress() {
    if (!hasScrolled) {
      hasScrolled = true;
      progressNav.classList.add('is-visible');
    }
  }

  /* ── Panel observer ─────────────────────────────────── */
  var currentIndex = 0;
  var heroFixed = document.querySelector('.hero-fixed');
  var heroBlur = document.querySelector('.hero-fixed__blur');

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var panel = entry.target;
      var idx = parseInt(panel.getAttribute('data-panel'), 10);

      if (entry.intersectionRatio >= 0.4) {
        panel.classList.add('is-active');
        currentIndex = idx;
        showProgress();

        /* Update progress dots */
        dots.forEach(function (d, i) {
          d.classList.toggle('is-current', i === idx);
        });

        /* Dark/light dot color */
        var isDark = panel.hasAttribute('data-dark');
        progressNav.classList.toggle('on-dark', isDark);

        /* Fixed hero image: show on hero+tagline, hide on cream panels.
           Blur amount is driven by scroll progress (see below). */
        if (idx === 0 || idx === 1) {
          heroFixed.classList.remove('is-hidden');
          heroBlur.classList.remove('is-hidden');
        } else {
          heroFixed.classList.add('is-hidden');
          heroBlur.classList.add('is-hidden');
        }

      } else if (entry.intersectionRatio < 0.1) {
        /* Don't deactivate hero on initial load */
        if (panel.classList.contains('panel--hero') && window.scrollY < 10) return;
        panel.classList.remove('is-active');
      }
    });
  }, {
    threshold: [0, 0.1, 0.4, 0.6, 1.0]
  });

  panels.forEach(function (panel) { observer.observe(panel); });

  /* ── Scroll-driven scene 1 → scene 2 blur ─────────────
     Progress goes 0 (hero in view) → 1 (hero fully scrolled
     out / tagline in view), driving a smooth backdrop-blur
     ramp on the shared hero background. */
  var heroPanel = document.querySelector('.panel--hero');
  function updateSceneBlur() {
    var rect = heroPanel.getBoundingClientRect();
    var winH = window.innerHeight || 1;
    var p = -rect.top / winH;
    if (p < 0) p = 0; else if (p > 1) p = 1;
    document.documentElement.style.setProperty('--scene-blur', p.toFixed(3));
  }
  window.addEventListener('scroll', updateSceneBlur, { passive: true });
  window.addEventListener('resize', updateSceneBlur, { passive: true });
  updateSceneBlur();

})();
