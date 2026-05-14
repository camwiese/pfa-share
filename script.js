/* =============================================================
   Future Palace v2 — Deck mode
   Tap / arrow / wheel / swipe → next panel. One panel visible
   at a time. No native scrolling. Direction-aware slide+fade.
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

  var panels = Array.from(document.querySelectorAll('.panel[data-panel]'));
  var progressNav = document.querySelector('.progress');
  var heroFixed = document.querySelector('.hero-fixed');
  var heroBlur = document.querySelector('.hero-fixed__blur');
  var tapHint = document.querySelector('.tap-hint');

  /* ── Reduced motion: fall back to a stacked scroll layout ──
     Class goes on <html> so we can override its overflow/height. */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('reduced-motion');
    panels.forEach(function (p) { p.classList.add('is-active'); });
    return;
  }

  /* ── Build progress dots (clickable) ─────────────────── */
  var dots = [];
  panels.forEach(function (_, i) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'progress__dot';
    dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
    dot.addEventListener('click', function (e) {
      e.stopPropagation();
      setIndex(i);
    });
    if (i === 0) dot.classList.add('is-current');
    progressNav.appendChild(dot);
    dots.push(dot);
  });

  /* ── Initial state ───────────────────────────────────── */
  var currentIndex = 0;
  applyClasses(0);
  applyBackgroundForIndex(0);
  progressNav.classList.toggle('on-dark', panels[0].hasAttribute('data-dark'));
  preloadNearby(0);

  function applyClasses(target) {
    panels.forEach(function (p, i) {
      p.classList.remove('is-active', 'is-past');
      if (i < target) p.classList.add('is-past');
      else if (i === target) p.classList.add('is-active');
      /* i > target: default state (off to the right, opacity 0) */
    });
  }

  function applyBackgroundForIndex(i) {
    if (i === 0) {
      heroFixed.classList.remove('is-hidden');
      heroBlur.classList.remove('is-hidden');
      document.documentElement.style.setProperty('--scene-blur', '0');
    } else if (i === 1) {
      heroFixed.classList.remove('is-hidden');
      heroBlur.classList.remove('is-hidden');
      document.documentElement.style.setProperty('--scene-blur', '1');
    } else {
      heroFixed.classList.add('is-hidden');
      heroBlur.classList.add('is-hidden');
    }
  }

  /* Eagerly load images on the current panel and its two neighbors
     in each direction, so the next tap never waits on the network. */
  function preloadNearby(i) {
    panels.forEach(function (p, idx) {
      if (Math.abs(idx - i) > 2) return;
      p.querySelectorAll('img').forEach(function (img) {
        if (img.getAttribute('loading') === 'lazy') {
          img.setAttribute('loading', 'eager');
        }
      });
    });
  }

  function setIndex(target) {
    if (target < 0) target = 0;
    if (target >= panels.length) target = panels.length - 1;
    if (target === currentIndex) return;

    var direction = target > currentIndex ? 'forward' : 'backward';
    document.body.dataset.direction = direction;

    currentIndex = target;
    applyClasses(target);

    dots.forEach(function (d, i) {
      d.classList.toggle('is-current', i === currentIndex);
    });

    progressNav.classList.toggle('on-dark', panels[currentIndex].hasAttribute('data-dark'));
    progressNav.classList.add('is-visible');

    if (tapHint) tapHint.classList.add('is-gone');

    applyBackgroundForIndex(currentIndex);
    preloadNearby(currentIndex);
  }

  function next() { setIndex(currentIndex + 1); }
  function prev() { setIndex(currentIndex - 1); }

  /* ── Interactive-element guard ───────────────────────── */
  function isInteractive(el) {
    while (el && el !== document.body) {
      if (el.matches && el.matches('a, button, input, textarea, [role="button"], .progress')) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  /* ── Tap: left 20% = prev, right 80% = next ──────────── */
  /* iOS Safari can drop synthetic click events under certain
     touch-action / overflow combinations, so we handle taps on
     touchend (see below) and skip the click that would follow. */
  var swallowNextClick = false;
  function handleTap(x) {
    var w = window.innerWidth;
    if (x < w * 0.2) prev();
    else next();
  }
  document.addEventListener('click', function (e) {
    if (swallowNextClick) {
      swallowNextClick = false;
      return;
    }
    if (isInteractive(e.target)) return;
    handleTap(e.clientX);
  });

  /* ── Keyboard ────────────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.target && e.target.matches && e.target.matches('input, textarea')) return;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
      case 'Enter':
        e.preventDefault();
        next();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
      case 'Backspace':
        e.preventDefault();
        prev();
        break;
      case 'Home':
        e.preventDefault();
        setIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setIndex(panels.length - 1);
        break;
    }
  });

  /* ── Mouse wheel / trackpad (debounced) ──────────────── */
  var wheelLock = false;
  document.addEventListener('wheel', function (e) {
    if (wheelLock) return;
    if (Math.abs(e.deltaY) < 12) return;
    wheelLock = true;
    setTimeout(function () { wheelLock = false; }, 600);
    if (e.deltaY > 0) next();
    else prev();
  }, { passive: true });

  /* ── Touch: tap (handled by click) + swipe ───────────── */
  var touchStartY = 0, touchStartX = 0, touchStartT = 0;
  document.addEventListener('touchstart', function (e) {
    if (!e.touches[0]) return;
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    touchStartT = Date.now();
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (!e.changedTouches[0]) return;
    if (isInteractive(e.target)) return;
    var endX = e.changedTouches[0].clientX;
    var endY = e.changedTouches[0].clientY;
    var dx = endX - touchStartX;
    var dy = endY - touchStartY;
    var dt = Date.now() - touchStartT;
    var absX = Math.abs(dx), absY = Math.abs(dy);
    /* Tap (no significant drag): advance directly. Swallow the click
       event iOS will fire next so we don't double-advance. */
    if (absX < 12 && absY < 12 && dt < 500) {
      swallowNextClick = true;
      handleTap(endX);
      return;
    }
    /* Swipe: vertical or horizontal beyond 40px = nav. */
    if (absY > absX) {
      if (dy < -40) next();
      else if (dy > 40) prev();
    } else {
      if (dx < -40) next();
      else if (dx > 40) prev();
    }
  }, { passive: true });

})();
