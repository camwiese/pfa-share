import { NextResponse } from "next/server";
import { createServiceClient } from "../../../../lib/supabase/server";
import { closeIdleSessions } from "../../../../lib/closeIdle";

// Closes any session whose last_tick_at slipped past 90 seconds ago, then
// fires a session-summary email for each newly-closed personal-link session.
// The actual work lives in lib/closeIdle so the track endpoints can also
// invoke it lazily between cron runs.
//
// Auth: Vercel sets `x-vercel-cron` on its cron requests. Locally / manually,
// pass `?secret=$CRON_SECRET` (only if the env var is set).

export async function GET(request) {
  const auth = checkAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 });

  let service;
  try { service = createServiceClient(); } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const result = await closeIdleSessions(service, { limit: 200 });
  return NextResponse.json(result);
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
