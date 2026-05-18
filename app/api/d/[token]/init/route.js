import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient, createServiceClient } from "../../../../../lib/supabase/server";
import { getAdminEmails } from "../../../../../lib/admin";
import { getDummyAuthEmail } from "../../../../../lib/dummyAuth";
import { describeDevice, parseUA } from "../../../../../lib/ua";
import { geoFromHeaders } from "../../../../../lib/geo";
import {
  signSessionCookie,
  verifySessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "../../../../../lib/sessionCookie";
import { notifyLinkOpened } from "../../../../../lib/notifications";

// Bootstraps a personal-link session.
//   - validates the token, returns 410 if missing / inactive / expired
//   - resumes an existing valid session if the cookie matches this link
//   - otherwise creates a fresh sessions row, signs a cookie, bumps the
//     link's view_count, fires the "link opened" admin email
//   - if a different fp_hash shows up on a session that already had one,
//     splits off a new session row (different device on same link)

export async function POST(request, { params }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  let body = {};
  try { body = await request.json(); } catch {}

  // Admin previewing one of their own links — skip the whole session
  // bootstrap so we don't pollute analytics with our own opens. Checks both
  // the dummy-auth cookie (current production state) and any real Supabase
  // session (post-Resend).
  if (await isAdminVisitor()) {
    return NextResponse.json({ skip: true, reason: "admin_preview" });
  }

  let service;
  try {
    service = createServiceClient();
  } catch (err) {
    console.error("[d/init] service client failed:", err?.message);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { data: link } = await service
    .from("links")
    .select("id, token, name, is_active, expires_at, view_count")
    .eq("token", token)
    .maybeSingle();
  if (!link || !link.is_active) return NextResponse.json({ error: "Gone" }, { status: 410 });
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Gone" }, { status: 410 });
  }

  const ua = request.headers.get("user-agent") || "";
  const incomingFp = body.fp_hash || null;
  const existingCookie = verifySessionCookie(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  // ---- Resume path: cookie present + bound to this link + session still open
  if (existingCookie?.session_id && existingCookie.link_id === link.id) {
    const { data: row } = await service
      .from("sessions")
      .select("id, fp_hash, ended_at")
      .eq("id", existingCookie.session_id)
      .maybeSingle();

    if (row && !row.ended_at) {
      // Fingerprint mismatch → branch a new session row (different device).
      if (row.fp_hash && incomingFp && row.fp_hash !== incomingFp) {
        return createSession({
          service, link, request, ua, incomingFp, body,
          reason: "fingerprint_mismatch", isResume: false,
        });
      }
      // Patch fp / device on the existing row.
      const patch = {};
      if (incomingFp && !row.fp_hash) patch.fp_hash = incomingFp;
      if (body.screen || body.tz) {
        patch.device = describeDevice({ ua, screen: body.screen, tz: body.tz });
      }
      if (Object.keys(patch).length > 0) {
        await service.from("sessions").update(patch).eq("id", row.id);
      }
      return NextResponse.json({ session_id: row.id, resumed: true });
    }
  }

  // ---- Fresh session path: no cookie / cookie stale / session closed.
  return createSession({ service, link, request, ua, incomingFp, body, reason: "view_start", isResume: false });
}

async function createSession({ service, link, request, ua, incomingFp, body, reason }) {
  const device = describeDevice({ ua, screen: body.screen, tz: body.tz });
  const geo = geoFromHeaders(request.headers);
  const ipHash = hashIp(request);
  const isBot = parseUA(ua).bot;
  const firstSession = (link.view_count || 0) === 0;

  const { data: inserted, error: insErr } = await service
    .from("sessions")
    .insert({
      link_id: link.id,
      viewer_email: null,
      device,
      geo,
      ip_hash: ipHash,
      fp_hash: incomingFp,
      is_bot: isBot,
    })
    .select("id, fp_hash")
    .single();
  if (insErr || !inserted) {
    console.error("[d/init] insert session failed:", insErr?.message);
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  await service.from("events").insert({
    session_id: inserted.id,
    kind: "view_start",
    payload: { link_id: link.id, token: link.token, reason },
  });

  await service
    .from("links")
    .update({
      view_count: (link.view_count || 0) + 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq("id", link.id);

  // Fire admin "link opened" email (best-effort, fire-and-forget).
  notifyLinkOpened({
    link,
    session: { ...inserted, geo },
    firstSession,
  }).catch(() => {});

  const res = NextResponse.json({ session_id: inserted.id, resumed: false });
  res.cookies.set(
    SESSION_COOKIE_NAME,
    signSessionCookie({ session_id: inserted.id, link_id: link.id, kind: "personal" }),
    SESSION_COOKIE_OPTIONS
  );
  return res;
}

async function isAdminVisitor() {
  const admins = getAdminEmails();
  if (admins.length === 0) return false;
  const dummy = await getDummyAuthEmail();
  if (dummy && admins.includes(dummy)) return true;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email?.toLowerCase();
    if (email && admins.includes(email)) return true;
  } catch {}
  return false;
}

function hashIp(request) {
  try {
    const ip =
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "";
    if (!ip) return null;
    return crypto
      .createHash("sha256")
      .update(ip + (process.env.SESSION_SECRET || ""))
      .digest("hex")
      .slice(0, 24);
  } catch {
    return null;
  }
}
