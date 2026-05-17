"use client";

import { useEffect, useRef } from "react";
import { subscribe } from "../lib/deckNav";

// Aggressive per-slide dwell tracker.
//   - 10s heartbeat while visible + active
//   - 90s idle timeout (snaps accumulator to last-activity ts)
//   - 1s minimum recorded dwell
//   - flush-on-slide-change
//   - flush-on-pagehide / visibilitychange-hidden
//
// `endpoint` is the POST target ("/api/track" for authed viewers,
// "/api/d/<token>/track" for personal-link viewers). The body shape is
// {slideIdx: number, seconds: number}.

export default function useSlideTracker({ endpoint, enabled = true }) {
  const stateRef = useRef({
    currentSlide: 0,
    slideEnteredAt: typeof performance !== "undefined" ? performance.now() : Date.now(),
    visibleMsThisSlide: 0,
    lastActivityAt: Date.now(),
    isVisible: typeof document !== "undefined" ? document.visibilityState === "visible" : true,
  });

  useEffect(() => {
    if (!enabled || !endpoint) return;
    const st = stateRef.current;

    function now() {
      return typeof performance !== "undefined" ? performance.now() : Date.now();
    }

    function accumulateUntil(ts) {
      if (st.isVisible) st.visibleMsThisSlide += Math.max(0, ts - st.slideEnteredAt);
      st.slideEnteredAt = ts;
    }

    function flush() {
      const t = now();
      // If we went idle, cap accumulator at last activity, not now.
      const idleSince = Date.now() - st.lastActivityAt;
      if (!st.isVisible || idleSince > 90_000) {
        // Snap based on real wall-clock idle vs perf delta.
        const allowedMs = Math.max(0, t - st.slideEnteredAt - Math.max(0, idleSince - 90_000));
        if (st.isVisible) st.visibleMsThisSlide += allowedMs;
        st.slideEnteredAt = t;
      } else {
        accumulateUntil(t);
      }

      const seconds = Math.round(st.visibleMsThisSlide / 1000);
      if (seconds < 1) return;
      st.visibleMsThisSlide = 0;

      const payload = JSON.stringify({ slideIdx: st.currentSlide, seconds });
      try {
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          const blob = new Blob([payload], { type: "application/json" });
          const ok = navigator.sendBeacon(endpoint, blob);
          if (ok) return;
        }
      } catch {
        // fall through to fetch
      }
      try {
        fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
      } catch (err) {
        console.warn("[tracker] flush failed:", err?.message);
      }
    }

    function onActivity() {
      st.lastActivityAt = Date.now();
    }

    let activityRaf = null;
    function onActivityThrottled() {
      if (activityRaf != null) return;
      activityRaf = setTimeout(() => {
        activityRaf = null;
        onActivity();
      }, 250);
    }

    function onVisibilityChange() {
      const visible = document.visibilityState === "visible";
      if (st.isVisible && !visible) {
        accumulateUntil(now());
        flush();
      }
      st.isVisible = visible;
      st.slideEnteredAt = now();
    }

    function onPageHide() {
      accumulateUntil(now());
      flush();
    }

    const unsubscribe = subscribe((slideIdx) => {
      // Flush time on the slide we're leaving.
      accumulateUntil(now());
      flush();
      st.currentSlide = slideIdx;
      st.slideEnteredAt = now();
      st.visibleMsThisSlide = 0;
      st.lastActivityAt = Date.now();
    });

    const interval = setInterval(flush, 10_000);

    const activityEvents = ["mousemove", "scroll", "keydown", "touchstart", "wheel", "pointermove"];
    activityEvents.forEach((evt) => window.addEventListener(evt, onActivityThrottled, { passive: true }));
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      unsubscribe();
      clearInterval(interval);
      if (activityRaf) clearTimeout(activityRaf);
      activityEvents.forEach((evt) => window.removeEventListener(evt, onActivityThrottled));
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      // Final flush on unmount.
      accumulateUntil(now());
      flush();
    };
  }, [endpoint, enabled]);
}
