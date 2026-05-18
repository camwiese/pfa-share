"use client";

import { useEffect, useState } from "react";
import Deck from "./Deck";
import GateModal from "./GateModal";
import TrackerMount from "./TrackerMount";

export default function PublicDeck({ freeCount = 5 }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [gateBlocked, setGateBlocked] = useState(false);
  const [verified, setVerified] = useState(false);

  // On mount, check if the visitor is already verified (skip the gate).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then(async (d) => {
        if (cancelled) return;
        if (d?.verified) {
          await injectGatedPanels(freeCount);
          if (!cancelled) setVerified(true);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [freeCount]);

  async function handleGateRequest() {
    setGateBlocked(true);
    setModalOpen(true);
  }

  async function handleVerified() {
    const ok = await injectGatedPanels(freeCount);
    if (!ok) {
      // The cookie from /api/auth/verify-otp couldn't be read back in time.
      // A hard reload is the cleanest recovery — the auth-check on mount
      // will now see the cookie and inject panels normally.
      window.location.reload();
      return;
    }
    setVerified(true);
    setModalOpen(false);
    setGateBlocked(false);
    // Advance into the freshly-injected slide.
    setTimeout(() => {
      window.__pfaDeck?.setIndex(freeCount);
    }, 50);
  }

  function handleBack() {
    setModalOpen(false);
    setGateBlocked(false);
    window.__pfaDeck?.setIndex(Math.max(0, freeCount - 1));
  }

  return (
    <>
      <Deck
        startIndex={0}
        withGate={!verified}
        freeCount={freeCount}
        onGateRequest={handleGateRequest}
        gateBlocked={gateBlocked && !verified}
      />
      <GateModal open={modalOpen} onVerified={handleVerified} onBack={handleBack} />
      {verified ? (
        <TrackerMount initEndpoint="/api/track/init" trackEndpoint="/api/track" />
      ) : null}
    </>
  );
}

async function injectGatedPanels(start) {
  // The pfa_dummy_auth cookie set by verify-otp can lag a few ms before
  // it's readable by the next fetch (Safari + Firefox especially). Retry
  // a couple of times before giving up so the caller can decide to reload.
  let res = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      res = await fetch(`/api/deck/gated?start=${start}`, { cache: "no-store" });
      if (res.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!res || !res.ok) {
    console.warn("[public-deck] gated fetch failed:", res?.status);
    return false;
  }
  const data = await res.json();
  const mount = document.getElementById("gated-mount");
  if (mount && data.html) {
    mount.insertAdjacentHTML("beforeend", data.html);
  }
  // Tell the deck to re-scan panels and rebuild dots.
  if (window.__pfaDeck?.refresh) window.__pfaDeck.refresh();
  return true;
}
