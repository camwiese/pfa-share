import { NextResponse } from "next/server";
import { createServiceClient } from "../../../../../lib/supabase/server";
import { verifySessionCookie, SESSION_COOKIE_NAME } from "../../../../../lib/sessionCookie";

export async function POST(request, { params }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  let body = {};
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {}

  const cookie = verifySessionCookie(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!cookie?.session_id) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const slideIdx = clampInt(body.slideIdx, 0, 200);
  const seconds = clampInt(body.seconds, 0, 24 * 3600);
  if (seconds < 1) return NextResponse.json({ ok: true, skipped: true });

  let service;
  try { service = createServiceClient(); } catch (err) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Verify the link still exists + is active. Cheap, prevents revoked links
  // from continuing to write.
  const { data: link } = await service
    .from("links")
    .select("id, is_active")
    .eq("token", token)
    .maybeSingle();
  if (!link || !link.is_active) return NextResponse.json({ error: "Gone" }, { status: 410 });

  const { data: row } = await service
    .from("sessions")
    .select("id, slide_dwells, total_seconds, max_slide_reached, ended_at, link_id")
    .eq("id", cookie.session_id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Session not found" }, { status: 410 });
  if (row.ended_at) return NextResponse.json({ error: "Session ended" }, { status: 410 });
  if (row.link_id !== link.id) return NextResponse.json({ error: "Mismatch" }, { status: 403 });

  const dwells = { ...(row.slide_dwells || {}) };
  const key = String(slideIdx);
  dwells[key] = (Number(dwells[key]) || 0) + seconds;
  const total = (row.total_seconds || 0) + seconds;
  const maxReached = Math.max(row.max_slide_reached || 0, slideIdx);

  const { error: updErr } = await service
    .from("sessions")
    .update({
      slide_dwells: dwells,
      total_seconds: total,
      max_slide_reached: maxReached,
      last_tick_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (updErr) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function clampInt(v, lo, hi) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.max(lo, Math.min(hi, n));
}
