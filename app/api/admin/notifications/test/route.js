import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/requireAdmin";
import { getAdminEmails } from "../../../../../lib/admin";

// Admin-only diagnostic: surfaces the entire notification pipeline so we
// can see exactly where mail delivery is failing. Hit it from a browser
// while logged in as an admin and read the JSON.
//
// /api/admin/notifications/test?kind=link_open
//   kinds: ping | access_request | new_email | link_open | session_summary
//
// Returns:
//   env: which secrets are present (presence only — no values)
//   settings: the flags read from the settings row
//   recipients: who the email would go to
//   resend: status code + body from Resend
//   guards: whether throttle/already-sent guards would skip the send
//
// "ping" skips all the guards and just hits Resend with a hello-world
// email — fastest way to confirm Resend itself is wired correctly.

export async function GET(request) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") || "ping";

  const env = {
    has_RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
    AUTH_SENDER_EMAIL: process.env.AUTH_SENDER_EMAIL || "(unset → defaults to hello@mail.worldsfair.co)",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "(unset)",
    NODE_ENV: process.env.NODE_ENV,
  };

  const adminEmails = getAdminEmails();

  // Read settings flags directly so we can show the user which guards are off.
  let settings = null;
  if (auth.service) {
    try {
      const { data } = await auth.service.from("settings").select("*").eq("id", 1).maybeSingle();
      settings = data || null;
    } catch (err) {
      settings = { error: err?.message };
    }
  }

  // For "ping", just hit Resend directly with a minimal payload and bypass
  // all the notification-wrapper guards. This is the fastest way to confirm
  // RESEND_API_KEY + sender domain are wired correctly.
  if (kind === "ping") {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        kind,
        env,
        settings,
        sent: false,
        reason: "RESEND_API_KEY env var is not set in this environment.",
      });
    }
    const from = `World's Fair Co. <${process.env.AUTH_SENDER_EMAIL || "hello@mail.worldsfair.co"}>`;
    let resp;
    let bodyText;
    try {
      resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: adminEmails,
          subject: "PFA deck — test ping",
          html: `<p>Ping at ${new Date().toISOString()}.</p><p>From: <code>${from}</code></p><p>To: <code>${adminEmails.join(", ")}</code></p>`,
        }),
      });
      bodyText = await resp.text();
    } catch (err) {
      return NextResponse.json({
        kind,
        env,
        from,
        to: adminEmails,
        sent: false,
        fetchError: err?.message,
      });
    }
    let parsed = null;
    try { parsed = JSON.parse(bodyText); } catch {}
    return NextResponse.json({
      kind,
      env,
      from,
      to: adminEmails,
      sent: resp.ok,
      status: resp.status,
      response: parsed || bodyText,
    });
  }

  // For the named kinds, invoke the real notification path so we can see
  // what skipped/throttled/sent reports back.
  const {
    notifyAccessRequest,
    notifyNewEmail,
    notifyLinkOpened,
    notifySessionSummary,
    maybeNotifyHeatingUp,
  } = await import("../../../../../lib/notifications");

  let result;
  if (kind === "access_request") {
    result = await notifyAccessRequest({ email: "test-access@example.com", geo: { city: "San Francisco" } });
  } else if (kind === "new_email") {
    result = await notifyNewEmail({ email: `test-new-${Date.now()}@example.com`, geo: { city: "San Francisco" } });
  } else if (kind === "link_open") {
    result = await notifyLinkOpened({
      link: { id: "test-link", token: "TESTTK", name: "Diagnostic Link" },
      session: { id: "test-session", geo: { city: "San Francisco", country: "US" } },
      firstSession: true,
    });
  } else if (kind === "heating_up") {
    // Direct call to the real notify path with a guaranteed-fresh
    // dedup key (random link id), so the test bypasses the
    // already-sent check. The wired heating-up flow lives in
    // /api/d/[token]/track + closeIdle and dedupes per real link id.
    result = await maybeNotifyHeatingUp(auth.service, {
      link: { id: `test-${Date.now()}`, token: "PREVIEW", name: "Diagnostic Link (heating up)" },
    });
    result = {
      ...result,
      note: "Real flow needs sessions in the DB to cross the threshold; this preview won't find any and will return underThreshold. To see the email, spend 5 min on a real /d/<token>.",
    };
  } else if (kind === "session_summary") {
    const dwells = { "0": 8, "1": 12, "2": 30, "3": 18, "4": 22, "5": 6 };
    result = await notifySessionSummary({
      link: { id: "test-link", token: "TESTTK", name: "Diagnostic Link" },
      session: {
        id: "test-session",
        total_seconds: 96,
        slide_dwells: dwells,
        device: { browser: "Chrome", os: "macOS" },
        geo: { city: "San Francisco", country: "US" },
      },
    });
  } else {
    return NextResponse.json({ error: `Unknown kind: ${kind}` }, { status: 400 });
  }

  return NextResponse.json({
    kind,
    env,
    settings: settings && {
      email_on_request: settings.email_on_request,
      email_on_new_email: settings.email_on_new_email,
      email_on_link_open: settings.email_on_link_open,
      email_on_link_open_every: settings.email_on_link_open_every,
      email_on_session_end: settings.email_on_session_end,
      notification_min_gap_seconds: settings.notification_min_gap_seconds,
    },
    recipients: adminEmails,
    result,
  });
}
