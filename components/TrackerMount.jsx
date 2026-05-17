"use client";

import { useEffect, useState } from "react";
import useSlideTracker from "../hooks/useSlideTracker";
import { computeFingerprint } from "../lib/fingerprint";

export default function TrackerMount({ initEndpoint, trackEndpoint }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fp = await computeFingerprint();
        const body = {
          fp_hash: fp,
          screen: { w: window.screen?.width, h: window.screen?.height },
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        const res = await fetch(initEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (cancelled) return;
        if (res.ok) setReady(true);
        else console.warn("[tracker] init failed:", res.status);
      } catch (err) {
        console.warn("[tracker] init error:", err?.message);
      }
    })();
    return () => { cancelled = true; };
  }, [initEndpoint]);

  useSlideTracker({ endpoint: trackEndpoint, enabled: ready });
  return null;
}
