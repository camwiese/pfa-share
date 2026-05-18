import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient, createServiceClient } from "../../../../lib/supabase/server";
import { getAdminEmails } from "../../../../lib/admin";
import { describeDevice } from "../../../../lib/ua";
import { parseUA } from "../../../../lib/ua";
import { geoFromHeaders } from "../../../../lib/geo";
import { signSessionCookie, verifySessionCookie, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "../../../../lib/sessionCookie";
import { getDummyAuthEmail } from "../../../../lib/dummyAuth";

export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch {}

  // 1. Resolve viewer email. Three accepted sources:
  //    - LOCAL_DEV_ADMIN_BYPASS (dev only)
  //    - AUTH_DUMMY_MODE signed cookie (from the gate / admin sign-in flow)
  //    - Real Supabase session
  // Whichever wins becomes sessions.viewer_email so the visitor's email
  // shows up in analytics under their own identifier.
  let email = null;
  const bypass =
    process.env.NODE_ENV === "development" && process.env.LOCAL_DEV_ADMIN_BYPASS === "true";
  if (bypass) {
    email = (getAdminEmails()[0] || "dev@example.com").toLowerCase();
  } else {
    const dummyEmail = await getDummyAuthEmail();
    if (dummyEmail) {
      email = dummyEmail;
    } else {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        email = user?.email?.toLowerCase() || null;
      } catch {}
    }
  }
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1a. Admin preview — never tracked. Admins viewing /deck would otherwise
  // pollute analytics with their own previews. Return {skip: true} so the
  // TrackerMount client knows not to enable the heartbeat hook.
  if (getAdminEmails().includes(email)) {
    return NextResponse.json({ skip: true, reason: "admin_preview" });
  }

  // 2. Reuse existing valid session cookie if it matches this viewer.
  const existing = verifySessionCookie(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  let service;
  try {
    service = createServiceClient();
  } catch (err) {
    console.error("[track/init] service client failed:", err?.message);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (existing?.session_id && existing?.email === email && !existing?.link_id) {
    const { data: row } = await service
      .from("sessions")
      .select("id, ended_at")
      .eq("id", existing.session_id)
      .maybeSingle();
    if (row && !row.ended_at) {
      return NextResponse.json({ session_id: row.id, resumed: true });
    }
  }

  // 3. Otherwise create a new authed session.
  const ua = request.headers.get("user-agent") || "";
  const device = {
    ...describeDevice({ ua, screen: body.screen || null, tz: body.tz || null }),
  };
  const geo = geoFromHeaders(request.headers);
  const ipHash = hashIp(request);
  const isBot = parseUA(ua).bot;

  const { data: inserted, error: insErr } = await service
    .from("sessions")
    .insert({
      link_id: null,
      viewer_email: email,
      device,
      geo,
      ip_hash: ipHash,
      fp_hash: body.fp_hash || null,
      is_bot: isBot,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    console.error("[track/init] insert failed:", insErr?.message);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  await service.from("events").insert({
    session_id: inserted.id,
    kind: "view_start",
    payload: { source: "authed" },
  });

  const cookieValue = signSessionCookie({ session_id: inserted.id, email, kind: "authed" });
  const res = NextResponse.json({ session_id: inserted.id, resumed: false });
  res.cookies.set(SESSION_COOKIE_NAME, cookieValue, SESSION_COOKIE_OPTIONS);
  return res;
}

function hashIp(request) {
  try {
    const ip =
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "";
    if (!ip) return null;
    return crypto.createHash("sha256").update(ip + (process.env.SESSION_SECRET || "")).digest("hex").slice(0, 24);
  } catch {
    return null;
  }
}
