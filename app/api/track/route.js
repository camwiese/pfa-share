import { NextResponse } from "next/server";
import { createServiceClient } from "../../../lib/supabase/server";
import { verifySessionCookie, SESSION_COOKIE_NAME } from "../../../lib/sessionCookie";
import { maybeLazyCloseIdle } from "../../../lib/closeIdle";

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
  const slideVisits = sanitizeVisits(body.slideVisits);
  if (seconds < 1 && Object.keys(slideVisits).length === 0) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let service;
  try { service = createServiceClient(); }
  catch (err) {
    console.error("[track] service client failed:", err?.message);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Upsert dwell. Use raw SQL via Postgres RPC if available; otherwise read-modify-write.
  const { data: existing, error: readErr } = await service
    .from("sessions")
    .select("id, slide_dwells, slide_visits, total_seconds, max_slide_reached, ended_at, link_id")
    .eq("id", parsed.session_id)
    .maybeSingle();

  if (readErr || !existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 410 });
  }
  if (existing.ended_at) {
    return NextResponse.json({ error: "Session ended" }, { status: 410 });
  }

  const dwells = { ...(existing.slide_dwells || {}) };
  const visits = { ...(existing.slide_visits || {}) };
  const key = String(slideIdx);
  if (seconds > 0) dwells[key] = (Number(dwells[key]) || 0) + seconds;
  for (const k of Object.keys(slideVisits)) {
    visits[k] = (Number(visits[k]) || 0) + slideVisits[k];
  }
  const total = (existing.total_seconds || 0) + seconds;
  const maxReached = Math.max(existing.max_slide_reached || 0, slideIdx);

  const { error: updErr } = await service
    .from("sessions")
    .update({
      slide_dwells: dwells,
      slide_visits: visits,
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

  // Lazy fallback: opportunistically close other idle sessions and fire
  // their summary emails. Throttled per-instance to once every 30s.
  maybeLazyCloseIdle(service);

  return NextResponse.json({ ok: true });
}

function clampInt(v, lo, hi) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.max(lo, Math.min(hi, n));
}

function sanitizeVisits(v) {
  if (!v || typeof v !== "object") return {};
  const out = {};
  for (const k of Object.keys(v)) {
    const idx = parseInt(k, 10);
    const count = parseInt(v[k], 10);
    if (Number.isFinite(idx) && idx >= 0 && idx < 200 && Number.isFinite(count) && count > 0 && count < 1000) {
      out[String(idx)] = count;
    }
  }
  return out;
}
