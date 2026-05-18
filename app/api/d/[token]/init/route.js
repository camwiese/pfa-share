import { NextResponse } from "next/server";
import { createServiceClient } from "../../../../../lib/supabase/server";
import { describeDevice } from "../../../../../lib/ua";
import { geoFromHeaders } from "../../../../../lib/geo";
import {
  signSessionCookie,
  verifySessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "../../../../../lib/sessionCookie";

export async function POST(request, { params }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  let body = {};
  try { body = await request.json(); } catch {}

  let service;
  try { service = createServiceClient(); } catch (err) {
    console.error("[d/init] service client failed:", err?.message);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { data: link } = await service
    .from("links")
    .select("id, is_active, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!link || !link.is_active) return NextResponse.json({ error: "Gone" }, { status: 410 });
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Gone" }, { status: 410 });
  }

  const cookie = verifySessionCookie(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!cookie?.session_id || cookie.link_id !== link.id) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const { data: row } = await service
    .from("sessions")
    .select("id, fp_hash, ended_at, device, geo")
    .eq("id", cookie.session_id)
    .maybeSingle();
  if (!row || row.ended_at) return NextResponse.json({ error: "Session gone" }, { status: 410 });

  const incoming = body.fp_hash || null;

  // If we already have a fp_hash and it doesn't match, the device differs:
  // create a new session row instead of clobbering the existing one.
  if (row.fp_hash && incoming && row.fp_hash !== incoming) {
    const ua = request.headers.get("user-agent") || "";
    const device = describeDevice({ ua, screen: body.screen, tz: body.tz });
    const geo = geoFromHeaders(request.headers);

    const { data: fresh, error: insErr } = await service
      .from("sessions")
      .insert({
        link_id: link.id,
        viewer_email: null,
        device,
        geo,
        fp_hash: incoming,
      })
      .select("id")
      .single();
    if (insErr || !fresh) {
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }
    await service.from("events").insert({
      session_id: fresh.id,
      kind: "view_start",
      payload: { link_id: link.id, token, reason: "fingerprint_mismatch" },
    });

    const res = NextResponse.json({ session_id: fresh.id, switched: true });
    res.cookies.set(
      SESSION_COOKIE_NAME,
      signSessionCookie({ session_id: fresh.id, link_id: link.id, kind: "personal" }),
      SESSION_COOKIE_OPTIONS
    );
    return res;
  }

  // Patch the device/fp on the existing session.
  const patch = {};
  if (incoming && !row.fp_hash) patch.fp_hash = incoming;
  if (body.screen || body.tz) {
    const ua = request.headers.get("user-agent") || "";
    patch.device = describeDevice({ ua, screen: body.screen, tz: body.tz });
  }
  if (Object.keys(patch).length > 0) {
    await service.from("sessions").update(patch).eq("id", row.id);
  }

  return NextResponse.json({ session_id: row.id });
}
