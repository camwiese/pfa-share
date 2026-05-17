import { NextResponse } from "next/server";
import { createServiceClient } from "../../../../lib/supabase/server";
import { notifySessionSummary } from "../../../../lib/notifications";

// Closes any session whose last_tick_at slipped past 90 seconds ago, then
// fires a session-summary email for each newly-closed personal-link session.
//
// Auth: Vercel sets `x-vercel-cron` on its cron requests. Locally / manually,
// pass `?secret=$CRON_SECRET` (only if the env var is set).

export async function GET(request) {
  const auth = checkAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  let service;
  try { service = createServiceClient(); } catch (err) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Step 1: find idle sessions (no end yet, last tick > 90s ago).
  const cutoff = new Date(Date.now() - 90_000).toISOString();
  const { data: idle, error: readErr } = await service
    .from("sessions")
    .select("id, link_id, last_tick_at, slide_dwells, total_seconds, viewer_email, geo, device, summary_sent_at")
    .is("ended_at", null)
    .lt("last_tick_at", cutoff)
    .limit(200);
  if (readErr) {
    console.error("[cron/close-idle] read failed:", readErr.message);
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  if (!idle || idle.length === 0) return NextResponse.json({ closed: 0 });

  let closedCount = 0;
  let summariesSent = 0;

  for (const s of idle) {
    const endedAt = new Date(new Date(s.last_tick_at).getTime() + 90_000).toISOString();
    const { error: updErr } = await service
      .from("sessions")
      .update({ ended_at: endedAt })
      .eq("id", s.id)
      .is("ended_at", null);
    if (updErr) {
      console.warn("[cron] update failed for", s.id, updErr.message);
      continue;
    }
    closedCount++;

    await service.from("events").insert({
      session_id: s.id,
      kind: "session_end",
      payload: { reason: "idle_close" },
    });

    // Fire summary email for personal-link sessions that haven't had one yet.
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
    }
  }

  return NextResponse.json({ closed: closedCount, summariesSent });
}

function checkAuth(request) {
  if (request.headers.get("x-vercel-cron") === "1") return { ok: true };
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Allow in dev when nothing is configured so the user can invoke it
    // manually without a token.
    if (process.env.NODE_ENV === "development") return { ok: true };
    return { ok: false, reason: "CRON_SECRET not configured" };
  }
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return { ok: true };
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return { ok: true };
  return { ok: false, reason: "Unauthorized" };
}
