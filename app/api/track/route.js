import { NextResponse } from "next/server";
import { createServiceClient } from "../../../lib/supabase/server";
import { verifySessionCookie, SESSION_COOKIE_NAME } from "../../../lib/sessionCookie";

export async function POST(request) {
  let body = {};
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {}

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const parsed = verifySessionCookie(cookie);
  if (!parsed?.session_id) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const slideIdx = clampInt(body.slideIdx, 0, 200);
  const seconds = clampInt(body.seconds, 0, 24 * 3600);
  if (seconds < 1) return NextResponse.json({ ok: true, skipped: true });

  let service;
  try { service = createServiceClient(); }
  catch (err) {
    console.error("[track] service client failed:", err?.message);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Upsert dwell. Use raw SQL via Postgres RPC if available; otherwise read-modify-write.
  const { data: existing, error: readErr } = await service
    .from("sessions")
    .select("id, slide_dwells, total_seconds, max_slide_reached, ended_at, link_id")
    .eq("id", parsed.session_id)
    .maybeSingle();

  if (readErr || !existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 410 });
  }
  if (existing.ended_at) {
    return NextResponse.json({ error: "Session ended" }, { status: 410 });
  }

  const dwells = { ...(existing.slide_dwells || {}) };
  const key = String(slideIdx);
  dwells[key] = (Number(dwells[key]) || 0) + seconds;
  const total = (existing.total_seconds || 0) + seconds;
  const maxReached = Math.max(existing.max_slide_reached || 0, slideIdx);

  const { error: updErr } = await service
    .from("sessions")
    .update({
      slide_dwells: dwells,
      total_seconds: total,
      max_slide_reached: maxReached,
      last_tick_at: new Date().toISOString(),
    })
    .eq("id", parsed.session_id);

  if (updErr) {
    console.error("[track] update failed:", updErr?.message);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  await service.from("events").insert({
    session_id: parsed.session_id,
    kind: "tick",
    payload: { slideIdx, seconds },
  });

  return NextResponse.json({ ok: true });
}

function clampInt(v, lo, hi) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.max(lo, Math.min(hi, n));
}
