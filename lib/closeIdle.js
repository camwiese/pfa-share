// Shared "close any session whose last_tick_at is older than 90s" sweep.
// Called from two places:
//   1. /api/cron/close-idle — once a day on Vercel Hobby
//   2. /api/track + /api/d/[token]/track — lazy fallback, throttled to
//      run at most once every 30s per server instance.
//
// The lazy path is what makes session-summary emails feel near-real-time
// on a Hobby cron schedule: the next time anyone tracks anything, we
// also close any orphan idle sessions and fire their summaries.

import { notifySessionSummary, maybeNotifyHeatingUp } from "./notifications";

const IDLE_AFTER_MS = 90_000;

/**
 * Sweep idle sessions, close them, fire summaries.
 *
 * @param {SupabaseClient} service — service-role client
 * @param {{ limit?: number }} opts
 * @returns {Promise<{closed: number, summariesSent: number}>}
 */
export async function closeIdleSessions(service, { limit = 50 } = {}) {
  const cutoff = new Date(Date.now() - IDLE_AFTER_MS).toISOString();
  const { data: idle, error } = await service
    .from("sessions")
    .select("id, link_id, last_tick_at, slide_dwells, total_seconds, viewer_email, geo, device, summary_sent_at")
    .is("ended_at", null)
    .lt("last_tick_at", cutoff)
    .limit(limit);

  if (error) {
    console.warn("[closeIdle] read failed:", error.message);
    return { closed: 0, summariesSent: 0 };
  }
  if (!idle || idle.length === 0) return { closed: 0, summariesSent: 0 };

  let closedCount = 0;
  let summariesSent = 0;

  for (const s of idle) {
    const endedAt = new Date(new Date(s.last_tick_at).getTime() + IDLE_AFTER_MS).toISOString();
    // Conditional update so two concurrent sweeps can't double-close.
    const { error: updErr } = await service
      .from("sessions")
      .update({ ended_at: endedAt })
      .eq("id", s.id)
      .is("ended_at", null);
    if (updErr) {
      console.warn("[closeIdle] update failed for", s.id, updErr.message);
      continue;
    }
    closedCount++;

    await service.from("events").insert({
      session_id: s.id,
      kind: "session_end",
      payload: { reason: "idle_close" },
    });

    if (s.link_id && !s.summary_sent_at) {
      let link = null;
      try {
        const { data: l } = await service
          .from("links")
          .select("id, token, name")
          .eq("id", s.link_id)
          .maybeSingle();
        link = l || null;
      } catch {}
      const res = await notifySessionSummary({ link, session: { ...s, ended_at: endedAt } });
      if (res && !res.error && !res.skipped && !res.alreadySent) summariesSent++;

      // Also check the heating-up threshold after closing a session — covers
      // the case where a viewer left before the track endpoint ran a final check.
      maybeNotifyHeatingUp(service, { link, linkId: s.link_id }).catch(() => {});
    }
  }

  return { closed: closedCount, summariesSent };
}

// Per-instance throttle for the lazy-close path. Each Vercel function
// instance gets its own counter, but since instances are warm for a
// few minutes and re-used across requests, this is enough to keep us
// from hammering the DB on every track tick.
let lastLazySweepAt = 0;
const LAZY_GAP_MS = 30_000;

/**
 * Fire-and-forget version for use inside track endpoints. Only runs if
 * it's been at least 30s since the last lazy sweep on this instance.
 * Errors are swallowed — this must never break the track request.
 */
export function maybeLazyCloseIdle(service) {
  const now = Date.now();
  if (now - lastLazySweepAt < LAZY_GAP_MS) return;
  lastLazySweepAt = now;
  // Don't await — return immediately so the track response isn't delayed.
  closeIdleSessions(service, { limit: 20 }).catch((err) => {
    console.warn("[closeIdle] lazy sweep failed:", err?.message);
  });
}
