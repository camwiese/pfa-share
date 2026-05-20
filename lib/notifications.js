// Admin notification emails via Resend HTTP API. Each kind has its own
// trigger guard (settings flag + dedup window via events log). On success,
// inserts an `events` row tagging the trigger so we can throttle next time.

import { createServiceClient } from "./supabase/server";
import { getAdminEmails } from "./admin";
import { getNotificationRecipientsForInvestor } from "./adminAuth";
import { SLIDE_TITLES, SLIDE_COUNT } from "../constants/slides";
import { formatDuration } from "./format";

// The Resend HTTP API requires the FROM address to be on a verified
// domain. We use `mail.worldsfair.co` (Gmail Workspace runs the apex,
// so we sit Resend on the subdomain). Override via AUTH_SENDER_EMAIL.
//
// Defensive: if AUTH_SENDER_EMAIL was set to a bare domain (no @), we
// fall back to a sensible default and log a warning. This guards
// against the misconfiguration that silently 422'd every notification
// for days before being caught by the diagnostic endpoint.
function resolveFromAddress() {
  const fallback = "hello@mail.worldsfair.co";
  const raw = process.env.AUTH_SENDER_EMAIL;
  if (!raw) return fallback;
  if (!raw.includes("@")) {
    console.warn(
      `[notifications] AUTH_SENDER_EMAIL "${raw}" is missing the local part ` +
      `(needs name@domain.tld). Falling back to ${fallback}.`
    );
    // If they passed just a domain, assume the same local part as the default.
    return `hello@${raw}`;
  }
  return raw;
}
const FROM = resolveFromAddress();
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

async function sendViaResend({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[notifications] RESEND_API_KEY missing — dry-run", { to, subject });
    return { dryRun: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `World's Fair Co. <${FROM}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[notifications] Resend error", res.status, text);
      return { error: text };
    }
    return await res.json();
  } catch (err) {
    console.error("[notifications] send failed", err?.message);
    return { error: err?.message };
  }
}

async function getSettings(service) {
  const { data } = await service
    .from("settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return data || {};
}

// Returns true if we should send (no recent matching event in throttle window).
async function shouldSend(service, { triggerKey, gapSeconds }) {
  if (!gapSeconds) return true;
  const since = new Date(Date.now() - gapSeconds * 1000).toISOString();
  const { count } = await service
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("kind", "notify_sent")
    .gte("created_at", since)
    .filter("payload->>triggerKey", "eq", triggerKey);
  return (count || 0) === 0;
}

async function recordSent(service, { triggerKey, kind, meta }) {
  await service.from("events").insert({
    session_id: null,
    kind: "notify_sent",
    payload: { triggerKey, notificationKind: kind, ...meta },
  });
}

// -------- Email templates --------

function dashboardLink(path = "/admin") {
  return `${APP_URL}${path}`;
}

function shellHtml(bodyHtml) {
  return `<!doctype html><html><body style="font-family: -apple-system, system-ui, Helvetica, Arial, sans-serif; color: #33403a; background: #fcfbf8; padding: 20px;">
    ${bodyHtml}
    <p style="margin-top: 30px; color: #9e9d92; font-size: 12px;">— PFA deck admin</p>
  </body></html>`;
}

function accessRequestEmail({ email, city }) {
  return {
    subject: `New access request: ${email}`,
    html: shellHtml(`
      <p><strong>${email}</strong> requested access to the deck${city ? ` from ${city}` : ""}.</p>
      <p><a href="${dashboardLink("/admin/approvals")}">Open approvals →</a></p>
    `),
  };
}

function newEmailVerifiedEmail({ email, city }) {
  return {
    subject: `New viewer: ${email}`,
    html: shellHtml(`
      <p><strong>${email}</strong> just verified their email and viewed the deck${city ? ` from ${city}` : ""}.</p>
      <p><a href="${dashboardLink("/admin")}">Open dashboard →</a></p>
    `),
  };
}

function linkOpenedEmail({ link, session }) {
  const where = session?.geo?.city ? ` from ${session.geo.city}${session.geo.country ? ", " + session.geo.country : ""}` : "";
  return {
    subject: `${link.name} just opened the deck`,
    html: shellHtml(`
      <p><strong>${link.name}</strong> opened <code>${APP_URL}/d/${link.token}</code>${where}.</p>
      <p><a href="${dashboardLink("/admin")}">Open dashboard →</a></p>
    `),
  };
}

function heatingUpEmail({ link, totalSeconds, sessionCount, trigger }) {
  const minutes = Math.round(totalSeconds / 60);
  const reason =
    trigger === "time" ? `${minutes} minute${minutes === 1 ? "" : "s"} of view-time`
    : trigger === "sessions" ? `${sessionCount} session${sessionCount === 1 ? "" : "s"}`
    : `${minutes} minutes across ${sessionCount} sessions`;
  return {
    subject: `🔥 ${link.name} is heating up`,
    html: shellHtml(`
      <p><strong>${link.name}</strong> is engaged — ${reason}.</p>
      <p><a href="${dashboardLink("/admin/links")}">Open this link in the dashboard →</a></p>
      <p style="margin-top:14px;color:#7b8e80;font-size:12px;">Threshold crossed. You'll only get one of these per link.</p>
    `),
  };
}

function sessionSummaryEmail({ link, session, slideDwells }) {
  const dwells = slideDwells || session?.slide_dwells || {};
  const rows = [];
  let max = 0;
  for (let i = 0; i < SLIDE_COUNT; i++) {
    const s = Number(dwells[String(i)]) || 0;
    if (s > max) max = s;
  }
  if (max === 0) max = 1;

  const ranked = [];
  for (let i = 0; i < SLIDE_COUNT; i++) {
    const s = Number(dwells[String(i)]) || 0;
    ranked.push({ idx: i, seconds: s });
  }
  const top3 = [...ranked].sort((a, b) => b.seconds - a.seconds).filter((r) => r.seconds > 0).slice(0, 3);

  function bar(seconds) {
    const pct = (seconds / max) * 100;
    return `<div style="background:#eee9dc;width:100%;height:8px;border-radius:4px;"><div style="width:${pct.toFixed(0)}%;height:100%;background:#c4a355;border-radius:4px;"></div></div>`;
  }

  for (const r of ranked) {
    rows.push(`<tr>
      <td style="padding:4px 8px;font-size:12px;color:#7b8e80;width:24px;text-align:right">${r.idx}</td>
      <td style="padding:4px 8px;font-size:12px;color:#33403a">${SLIDE_TITLES[r.idx] || "Slide " + r.idx}</td>
      <td style="padding:4px 8px;width:140px">${r.seconds ? bar(r.seconds) : ""}</td>
      <td style="padding:4px 8px;font-size:12px;color:${r.seconds ? "#33403a" : "#9e9d92"};text-align:right;width:60px">${r.seconds ? formatDuration(r.seconds) : "—"}</td>
    </tr>`);
  }

  const recipientName = link?.name || (session?.viewer_email ? `Organic · ${session.viewer_email}` : "Visitor");
  const totalLabel = formatDuration(session?.total_seconds || 0);
  const deviceBits = [session?.device?.browser, session?.device?.os].filter(Boolean).join(" · ");
  const cityBits = session?.geo?.city ? `${session.geo.city}${session.geo.country ? ", " + session.geo.country : ""}` : "";

  return {
    subject: `${recipientName} spent ${totalLabel} on the deck`,
    html: shellHtml(`
      <h2 style="font-family: 'Fraunces', Georgia, serif; font-weight: 500; margin: 0 0 6px;">${recipientName}</h2>
      ${link ? `<p style="margin:0 0 12px;color:#7b8e80;">${APP_URL}/d/${link.token}</p>` : ""}
      <p style="margin:0 0 8px"><strong>${totalLabel}</strong>${cityBits ? ` · ${cityBits}` : ""}${deviceBits ? ` · ${deviceBits}` : ""}</p>

      <h3 style="font-family: 'Fraunces', Georgia, serif; font-size: 14px; margin: 18px 0 6px;">Top slides</h3>
      <table style="border-collapse:collapse;width:100%;">
        ${top3.length === 0 ? `<tr><td style="font-size:12px;color:#7b8e80">No measurable dwell.</td></tr>` : top3.map((r) => `<tr>
          <td style="padding:4px 8px;font-size:12px;color:#7b8e80;width:24px;text-align:right">${r.idx}</td>
          <td style="padding:4px 8px;font-size:12px;color:#33403a">${SLIDE_TITLES[r.idx] || "Slide " + r.idx}</td>
          <td style="padding:4px 8px;width:140px">${bar(r.seconds)}</td>
          <td style="padding:4px 8px;font-size:12px;text-align:right;width:60px">${formatDuration(r.seconds)}</td>
        </tr>`).join("")}
      </table>

      <h3 style="font-family: 'Fraunces', Georgia, serif; font-size: 14px; margin: 18px 0 6px;">All slides</h3>
      <table style="border-collapse:collapse;width:100%;">${rows.join("")}</table>

      <p style="margin-top:24px"><a href="${dashboardLink("/admin")}#session-${session.id}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#3a473f;color:#fcfbf8;text-decoration:none;">View full session →</a></p>
    `),
  };
}

// -------- Public entry points --------

async function recipients(service, email) {
  try {
    if (email) {
      const list = await getNotificationRecipientsForInvestor(email, service);
      return list?.length ? list : getAdminEmails();
    }
  } catch {}
  return getAdminEmails();
}

export async function notifyAccessRequest({ email, geo }) {
  try {
    const service = createServiceClient();
    const settings = await getSettings(service);
    if (!settings.email_on_request) return { skipped: true };
    const triggerKey = `request:${email}`;
    if (!(await shouldSend(service, { triggerKey, gapSeconds: settings.notification_min_gap_seconds || 60 }))) {
      return { throttled: true };
    }
    const tmpl = accessRequestEmail({ email, city: geo?.city });
    const result = await sendViaResend({ to: await recipients(service, email), ...tmpl });
    await recordSent(service, { triggerKey, kind: "access_request", meta: { email } });
    return result;
  } catch (err) {
    console.error("[notifyAccessRequest] failed", err?.message);
    return { error: err?.message };
  }
}

export async function notifyNewEmail({ email, geo }) {
  try {
    const service = createServiceClient();
    const settings = await getSettings(service);
    if (!settings.email_on_new_email) return { skipped: true };
    const triggerKey = `new-email:${email}`;
    // Once per email ever — gap = forever => check unconditionally.
    const { count } = await service
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("kind", "notify_sent")
      .filter("payload->>triggerKey", "eq", triggerKey);
    if ((count || 0) > 0) return { alreadySent: true };

    const tmpl = newEmailVerifiedEmail({ email, city: geo?.city });
    const result = await sendViaResend({ to: await recipients(service, email), ...tmpl });
    await recordSent(service, { triggerKey, kind: "new_email", meta: { email } });
    return result;
  } catch (err) {
    console.error("[notifyNewEmail] failed", err?.message);
    return { error: err?.message };
  }
}

export async function notifyLinkOpened({ link, session, firstSession = false }) {
  try {
    const service = createServiceClient();
    const settings = await getSettings(service);
    if (!settings.email_on_link_open) return { skipped: true };
    if (!settings.email_on_link_open_every && !firstSession) return { skipped: true };
    const triggerKey = `link-open:${link.id}`;
    if (!(await shouldSend(service, { triggerKey, gapSeconds: settings.notification_min_gap_seconds || 60 }))) {
      return { throttled: true };
    }
    const tmpl = linkOpenedEmail({ link, session });
    const result = await sendViaResend({ to: await recipients(service), ...tmpl });
    await recordSent(service, { triggerKey, kind: "link_open", meta: { link_id: link.id, session_id: session?.id } });
    return result;
  } catch (err) {
    console.error("[notifyLinkOpened] failed", err?.message);
    return { error: err?.message };
  }
}

// Heating-up notification — fires once per link when cumulative engagement
// crosses the threshold (default: 5 min total view-time OR 5 sessions).
// Dedup is by `triggerKey = "heating-up:<linkId>"` in the events table, so
// once it's been sent for a link it never fires again for that link.
//
// The track endpoints invoke this after every successful update; we keep it
// cheap by guarding behind a quick aggregate query and an existing-event
// check before doing any work.
const HEATING_TIME_THRESHOLD = 300;   // 5 minutes of cumulative view-time
const HEATING_SESSION_COUNT = 5;      // 5 sessions on the same link

export async function maybeNotifyHeatingUp(service, { link, linkId }) {
  try {
    const targetLinkId = link?.id || linkId;
    if (!targetLinkId) return { skipped: true };

    const triggerKey = `heating-up:${targetLinkId}`;

    // Quick dedup check — once-per-link forever.
    const { count: already } = await service
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("kind", "notify_sent")
      .filter("payload->>triggerKey", "eq", triggerKey);
    if ((already || 0) > 0) return { alreadySent: true };

    const settings = await getSettings(service);
    if (settings.email_on_heating_up === false) return { skipped: true };

    // Aggregate the link's stats. Cheap query, indexed on link_id.
    const { data: sessions } = await service
      .from("sessions")
      .select("total_seconds, is_bot")
      .eq("link_id", targetLinkId);
    if (!sessions || sessions.length === 0) return { notReady: true };

    const real = sessions.filter((s) => !s.is_bot);
    const totalSeconds = real.reduce((a, s) => a + (Number(s.total_seconds) || 0), 0);
    const sessionCount = real.length;

    const timeCross = totalSeconds >= (settings.heating_up_time_seconds || HEATING_TIME_THRESHOLD);
    const countCross = sessionCount >= (settings.heating_up_session_count || HEATING_SESSION_COUNT);
    if (!timeCross && !countCross) return { underThreshold: true };

    // Resolve the link record if the caller only gave us an id.
    let resolvedLink = link;
    if (!resolvedLink) {
      const { data: l } = await service.from("links").select("id, token, name").eq("id", targetLinkId).maybeSingle();
      resolvedLink = l || null;
    }
    if (!resolvedLink) return { skipped: true };

    const trigger = timeCross && countCross ? "both" : timeCross ? "time" : "sessions";
    const tmpl = heatingUpEmail({ link: resolvedLink, totalSeconds, sessionCount, trigger });
    const result = await sendViaResend({ to: await recipients(service), ...tmpl });
    await recordSent(service, {
      triggerKey,
      kind: "heating_up",
      meta: { link_id: targetLinkId, totalSeconds, sessionCount, trigger },
    });
    return result;
  } catch (err) {
    console.error("[maybeNotifyHeatingUp] failed", err?.message);
    return { error: err?.message };
  }
}

export async function notifySessionSummary({ link, session }) {
  try {
    const service = createServiceClient();
    const settings = await getSettings(service);
    if (!settings.email_on_session_end) return { skipped: true };
    if (session?.summary_sent_at) return { alreadySent: true };

    const tmpl = sessionSummaryEmail({ link, session, slideDwells: session?.slide_dwells });
    const result = await sendViaResend({ to: await recipients(service), ...tmpl });
    await service.from("sessions").update({ summary_sent_at: new Date().toISOString() }).eq("id", session.id);
    return result;
  } catch (err) {
    console.error("[notifySessionSummary] failed", err?.message);
    return { error: err?.message };
  }
}
