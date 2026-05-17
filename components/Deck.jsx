"use client";

import { useEffect, useRef } from "react";
import { emit as emitSlideChange } from "../lib/deckNav";

// Client component that runs the original script.js logic against the panels
// rendered by <DeckPanels />. Emits to lib/deckNav so the slide tracker hook
// can subscribe. When `withGate` is true, transitions past `freeCount - 1`
// are blocked and the caller's onGateRequest() is fired instead so the
// gate modal can open.

export default function Deck({ startIndex = 0, withGate = false, freeCount = 5, onGateRequest, gateBlocked = false }) {
  const onGateRequestRef = useRef(onGateRequest);
  const gateBlockedRef = useRef(gateBlocked);

  useEffect(() => { onGateRequestRef.current = onGateRequest; }, [onGateRequest]);
  useEffect(() => { gateBlockedRef.current = gateBlocked; }, [gateBlocked]);

  useEffect(() => {
    function setVH() {
      const vh = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
      document.documentElement.style.setProperty("--vh", vh + "px");
    }
    setVH();
    window.addEventListener("resize", setVH, { passive: true });
    if (window.visualViewport) window.visualViewport.addEventListener("resize", setVH, { passive: true });

    let panels = Array.from(document.querySelectorAll(".panel[data-panel]"));
    const progressNav = document.querySelector(".progress");
    const heroFixed = document.querySelector(".hero-fixed");
    const heroBlur = document.querySelector(".hero-fixed__blur");
    const tapHint = document.querySelector(".tap-hint");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("reduced-motion");
    }

    // Build progress dots
    let dots = [];
    function rebuildDots() {
      if (!progressNav) return;
      progressNav.innerHTML = "";
      dots = [];
      panels.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "progress__dot";
        dot.setAttribute("aria-label", "Go to slide " + (i + 1));
        dot.addEventListener("click", (e) => {
          e.stopPropagation();
          setIndex(i);
        });
        if (i === currentIndex) dot.classList.add("is-current");
        progressNav.appendChild(dot);
        dots.push(dot);
      });
    }

    let currentIndex = Math.min(Math.max(0, startIndex), panels.length - 1);

    function applyClasses(target) {
      panels.forEach((p, i) => {
        p.classList.remove("is-active", "is-past");
        if (i < target) p.classList.add("is-past");
        else if (i === target) p.classList.add("is-active");
      });
    }

    function applyBackgroundForIndex(i) {
      if (!heroFixed || !heroBlur) return;
      if (i === 0) {
        heroFixed.classList.remove("is-hidden");
        heroBlur.classList.remove("is-hidden", "is-blurred");
      } else if (i === 1) {
        heroFixed.classList.remove("is-hidden");
        heroBlur.classList.remove("is-hidden");
        heroBlur.classList.add("is-blurred");
      } else {
        heroFixed.classList.add("is-hidden");
        heroBlur.classList.add("is-hidden");
      }
    }

    function preloadNearby(i) {
      panels.forEach((p, idx) => {
        if (Math.abs(idx - i) > 2) return;
        p.querySelectorAll("img").forEach((img) => {
          if (img.getAttribute("loading") === "lazy") img.setAttribute("loading", "eager");
        });
      });
    }

    function setIndex(target) {
      if (target < 0) target = 0;
      if (target >= panels.length) target = panels.length - 1;
      if (target === currentIndex) return;

      // Gate check: block forward transition past the free preview.
      if (withGate && target >= freeCount && currentIndex < freeCount && !gateBlockedRef.current) {
        if (onGateRequestRef.current) onGateRequestRef.current(target);
        return;
      }
      if (gateBlockedRef.current && target >= freeCount) return;

      const direction = target > currentIndex ? "forward" : "backward";
      document.body.dataset.direction = direction;

      currentIndex = target;
      applyClasses(target);

      dots.forEach((d, i) => d.classList.toggle("is-current", i === currentIndex));

      if (progressNav) {
        progressNav.classList.toggle("on-dark", panels[currentIndex].hasAttribute("data-dark"));
        progressNav.classList.add("is-visible");
      }

      if (tapHint) tapHint.classList.add("is-gone");

      applyBackgroundForIndex(currentIndex);
      preloadNearby(currentIndex);
      emitSlideChange(currentIndex);
    }

    // Initial state
    applyClasses(currentIndex);
    applyBackgroundForIndex(currentIndex);
    if (progressNav) progressNav.classList.toggle("on-dark", panels[currentIndex].hasAttribute("data-dark"));
    preloadNearby(currentIndex);
    rebuildDots();
    emitSlideChange(currentIndex);

    // Expose for the gate flow to add panels and re-init.
    window.__pfaDeck = {
      refresh() {
        panels = Array.from(document.querySelectorAll(".panel[data-panel]"));
        rebuildDots();
      },
      setIndex,
      getIndex() { return currentIndex; },
    };

    function next() { setIndex(currentIndex + 1); }
    function prev() { setIndex(currentIndex - 1); }

    function isInteractive(el) {
      while (el && el !== document.body) {
        if (el.matches && el.matches('a, button, input, textarea, [role="button"], .progress')) {
          return true;
        }
        el = el.parentElement;
      }
      return false;
    }

    let swallowNextClick = false;
    function handleTap(x) {
      const w = window.innerWidth;
      if (x < w * 0.2) prev();
      else next();
    }
    function onClick(e) {
      if (swallowNextClick) { swallowNextClick = false; return; }
      if (isInteractive(e.target)) return;
      handleTap(e.clientX);
    }
    document.addEventListener("click", onClick);

    function onKey(e) {
      if (e.target && e.target.matches && e.target.matches("input, textarea")) return;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
        case "Enter":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
        case "Backspace":
          e.preventDefault();
          prev();
          break;
        case "Home":
          e.preventDefault();
          setIndex(0);
          break;
        case "End":
          e.preventDefault();
          setIndex(panels.length - 1);
          break;
      }
    }
    document.addEventListener("keydown", onKey);

    let wheelLock = false;
    function onWheel(e) {
      if (wheelLock) return;
      if (Math.abs(e.deltaY) < 12) return;
      wheelLock = true;
      setTimeout(() => { wheelLock = false; }, 600);
      if (e.deltaY > 0) next(); else prev();
    }
    document.addEventListener("wheel", onWheel, { passive: true });

    let touchStartY = 0, touchStartX = 0, touchStartT = 0;
    function onTouchStart(e) {
      if (!e.touches[0]) return;
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      touchStartT = Date.now();
    }
    function onTouchEnd(e) {
      if (!e.changedTouches[0]) return;
      if (isInteractive(e.target)) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - touchStartX;
      const dy = endY - touchStartY;
      const dt = Date.now() - touchStartT;
      const absX = Math.abs(dx), absY = Math.abs(dy);
      if (absX < 12 && absY < 12 && dt < 500) {
        swallowNextClick = true;
        handleTap(endX);
        return;
      }
      if (absY > absX) {
        if (dy < -40) next();
        else if (dy > 40) prev();
      } else {
        if (dx < -40) next();
        else if (dx > 40) prev();
      }
    }
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("resize", setVH);
      if (window.visualViewport) window.visualViewport.removeEventListener("resize", setVH);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("wheel", onWheel);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
      if (progressNav) progressNav.innerHTML = "";
      delete window.__pfaDeck;
    };
    // We intentionally re-run only on mount; startIndex is read once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="tap-hint" aria-hidden="true">Tap to continue</div>
      <nav className="progress" aria-label="Slide progress" aria-hidden="true" />
    </>
  );
}
