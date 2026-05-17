import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { createServiceClient } from "../../../lib/supabase/server";
import { parseUA, describeDevice } from "../../../lib/ua";
import { geoFromHeaders } from "../../../lib/geo";
import {
  signSessionCookie,
  verifySessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "../../../lib/sessionCookie";
import { notifyLinkOpened } from "../../../lib/notifications";
import DeckPanels from "../../../components/DeckPanels";
import Deck from "../../../components/Deck";
import TrackerMount from "../../../components/TrackerMount";
import "../../styles/deck.css";

export const dynamic = "force-dynamic";

async function resolveSession({ link, ua, hdrs, existingCookie }) {
  let service;
  try { service = createServiceClient(); } catch (err) {
    console.error("[d/token] service client failed:", err?.message);
    return { error: "service" };
  }

  if (existingCookie?.session_id && existingCookie.link_id === link.id) {
    const { data: row } = await service
      .from("sessions")
      .select("id, ended_at, fp_hash")
      .eq("id", existingCookie.session_id)
      .maybeSingle();
    if (row && !row.ended_at) {
      return { session: row, resumed: true, service };
    }
  }

  const device = describeDevice({
    ua,
    screen: null,
    tz: null,
  });
  const geo = geoFromHeaders(hdrs);
  const ipHash = hashIp(hdrs);
  const isBot = parseUA(ua).bot;

  const { data: inserted, error: insErr } = await service
    .from("sessions")
    .insert({
      link_id: link.id,
      viewer_email: null,
      device,
      geo,
      ip_hash: ipHash,
      is_bot: isBot,
    })
    .select("id, fp_hash")
    .single();

  if (insErr || !inserted) {
    console.error("[d/token] session insert failed:", insErr?.message);
    return { error: "insert" };
  }

  await service.from("events").insert({
    session_id: inserted.id,
    kind: "view_start",
    payload: { link_id: link.id, token: link.token },
  });

  await service
    .from("links")
    .update({ view_count: (link.view_count || 0) + 1, last_viewed_at: new Date().toISOString() })
    .eq("id", link.id);

  return { session: inserted, resumed: false, service };
}

export default async function PersonalLinkPage({ params }) {
  const { token } = await params;
  if (!token) redirect("/disabled");

  let service;
  try { service = createServiceClient(); } catch {
    redirect("/disabled");
  }

  const { data: link } = await service
    .from("links")
    .select("id, token, name, is_active, expires_at, view_count")
    .eq("token", token)
    .maybeSingle();

  if (!link) redirect("/disabled");
  if (!link.is_active) redirect("/disabled");
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    redirect("/disabled");
  }

  const ck = await cookies();
  const hdrs = await headers();
  const ua = hdrs.get("user-agent") || "";
  const existing = verifySessionCookie(ck.get(SESSION_COOKIE_NAME)?.value);

  const result = await resolveSession({ link, ua, hdrs, existingCookie: existing });
  if (result.error === "service") redirect("/disabled");

  if (!result.resumed && result.session) {
    const cookieValue = signSessionCookie({
      session_id: result.session.id,
      link_id: link.id,
      kind: "personal",
    });
    ck.set(SESSION_COOKIE_NAME, cookieValue, SESSION_COOKIE_OPTIONS);

    // Fire admin "link opened" email (best-effort, fire-and-forget).
    notifyLinkOpened({
      link,
      session: { ...result.session, geo: geoFromHeaders(hdrs) },
      firstSession: (link.view_count || 0) === 0,
    }).catch(() => {});
  }

  return (
    <>
      <main>
        <DeckPanels />
      </main>
      <Deck startIndex={0} />
      <TrackerMount
        initEndpoint={`/api/d/${encodeURIComponent(token)}/init`}
        trackEndpoint={`/api/d/${encodeURIComponent(token)}/track`}
      />
    </>
  );
}

function hashIp(hdrs) {
  try {
    const ip =
      hdrs.get("x-real-ip") ||
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
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
