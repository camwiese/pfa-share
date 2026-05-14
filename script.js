/* =============================================================
   Future Palace v2 — Deck mode
   Tap / arrow / wheel / swipe → next panel. One panel visible
   at a time. No native scrolling.
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

  /* ── Reduced motion: fall back to a stacked scroll layout ── */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('reduced-motion');
    panels.forEach(function (p) { p.classList.add('is-active'); });
    return;
  }

  /* ── Build progress dots (clickable) ─────────────────── */
  var dots = [];
  panels.forEach(function (_, i) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'progress__dot';
    dot.setAttribute('aria-label', 'Go to panel ' + (i + 1));
    dot.addEventListener('click', function (e) {
      e.stopPropagation();
      setIndex(i);
    });
    if (i === 0) dot.classList.add('is-current');
    progressNav.appendChild(dot);
    dots.push(dot);
  });

  /* ── Deck state ──────────────────────────────────────── */
  var currentIndex = 0;
  panels[0].classList.add('is-active');
  applyBackgroundForIndex(0);
  progressNav.classList.toggle('on-dark', panels[0].hasAttribute('data-dark'));

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

  function setIndex(target) {
    if (target < 0) target = 0;
    if (target >= panels.length) target = panels.length - 1;
    if (target === currentIndex) return;

    panels[currentIndex].classList.remove('is-active');
    panels[target].classList.add('is-active');

    currentIndex = target;

    dots.forEach(function (d, i) {
      d.classList.toggle('is-current', i === currentIndex);
    });

    progressNav.classList.toggle('on-dark', panels[currentIndex].hasAttribute('data-dark'));
    progressNav.classList.add('is-visible');

    applyBackgroundForIndex(currentIndex);
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

  /* ── Tap: left 25% = prev, right 75% = next ──────────── */
  document.addEventListener('click', function (e) {
    if (isInteractive(e.target)) return;
    var w = window.innerWidth;
    if (e.clientX < w * 0.25) prev();
    else next();
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
    setTimeout(function () { wheelLock = false; }, 650);
    if (e.deltaY > 0) next();
    else prev();
  }, { passive: true });

  /* ── Touch: tap (handled by click) + swipe ───────────── */
  var touchStartY = 0;
  var touchStartX = 0;
  var touchStartT = 0;
  document.addEventListener('touchstart', function (e) {
    if (!e.touches[0]) return;
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    touchStartT = Date.now();
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (!e.changedTouches[0]) return;
    if (isInteractive(e.target)) return;
    var dy = e.changedTouches[0].clientY - touchStartY;
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dt = Date.now() - touchStartT;
    var absX = Math.abs(dx), absY = Math.abs(dy);
    // Anything under 40px in 700ms is a tap — let the click handler take it.
    if (absX < 40 && absY < 40 && dt < 700) return;
    if (absY > absX) {
      if (dy < -40) next();
      else if (dy > 40) prev();
    } else {
      if (dx < -40) next();
      else if (dx > 40) prev();
    }
  }, { passive: true });

})();
