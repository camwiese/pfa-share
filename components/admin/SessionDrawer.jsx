"use client";

import { useEffect, useState } from "react";
import { formatDuration, formatRelative } from "../../lib/format";
import SlideBars from "./SlideBars";

export default function SessionDrawer({ sessionId, onClose, onOpenSession }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    fetch(`/api/admin/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sessionId]);

  // Close on Escape.
  useEffect(() => {
    if (!sessionId) return;
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sessionId, onClose]);

  if (!sessionId) return null;

  const s = data?.session;
  const link = data?.link;
  const linkStats = data?.linkStats;
  const related = data?.related || [];

  const isLive = s && !s.ended_at && Date.now() - new Date(s.last_tick_at).getTime() < 90_000;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer__header drawer__header--sticky">
          <div>
            <h2 className="drawer__title">
              {link?.name || s?.viewer_email || "Session"}
            </h2>
            {link?.token ? <div className="drawer__sub">/d/{link.token}</div> : null}
          </div>
          <button onClick={onClose} className="drawer__close">Close</button>
        </div>

        {loading || !s ? (
          <div className="empty-state">Loading…</div>
        ) : (
          <>
            {link && linkStats ? (
              <div className="link-context">
                <div className="link-context__label">Across this link</div>
                <div className="link-context__stats">
                  <span><strong>{linkStats.visitors}</strong> visitor{linkStats.visitors === 1 ? "" : "s"}</span>
                  <span className="row__muted">·</span>
                  <span><strong>{linkStats.sessions}</strong> session{linkStats.sessions === 1 ? "" : "s"}</span>
                  <span className="row__muted">·</span>
                  <span><strong>{formatDuration(linkStats.totalSeconds)}</strong> total time</span>
                  <span className="row__muted" style={{ marginLeft: "auto" }}>Created {formatRelative(link.created_at)}</span>
                </div>
              </div>
            ) : null}

            <SessionSummary session={s} link={link} isLive={isLive} />

            <h3>Time per slide</h3>
            <SlideBars dwells={s.slide_dwells} visits={s.slide_visits} />

            {related.length > 0 ? (
              <>
                <h3 style={{ marginTop: 22 }}>Other sessions from this device</h3>
                <div className="row-list">
                  {related.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => onOpenSession?.(r.id)}
                      className="row"
                      style={{ gridTemplateColumns: "1fr 1fr 80px" }}
                    >
                      <span>{formatRelative(r.started_at)}</span>
                      <span className="row__muted">{r.geo?.city || "—"}</span>
                      <span>{formatDuration(r.total_seconds || 0)}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </>
        )}
      </aside>
    </div>
  );
}

function SessionSummary({ session, link, isLive }) {
  const device = session.device || {};
  const formFactor = device.mobile ? "Mobile" : "Desktop";
  const browser = device.browser || "Unknown browser";
  const os = device.os || "";
  const cityLine = session.geo?.city
    ? `${session.geo.city}${session.geo.country ? ", " + session.geo.country : ""}`
    : "Location unknown";
  const fp = session.fp_hash ? session.fp_hash.slice(-8) : null;
  const tz = device.tz || null;

  return (
    <div className="session-summary">
      <div className="session-summary__row">
        <div className="session-summary__stat">
          <div className="metric__label">Total time</div>
          <div className="metric__value">{formatDuration(session.total_seconds)}</div>
        </div>
        <div className="session-summary__stat">
          <div className="metric__label">Furthest slide</div>
          <div className="metric__value">{session.max_slide_reached}</div>
        </div>
        <div className="session-summary__stat">
          <div className="metric__label">{isLive ? "Status" : session.ended_at ? "Ended" : "Last seen"}</div>
          <div className="metric__value" style={isLive ? { color: "var(--admin-accent)", fontSize: 18 } : { fontSize: 18 }}>
            {isLive ? <><span className="live-dot" />Live</> : formatRelative(session.ended_at || session.last_tick_at)}
          </div>
        </div>
      </div>

      <div className="session-summary__detail">
        <div>
          <span className="session-summary__icon" aria-hidden>{device.mobile ? "📱" : "🖥"}</span>
          <strong>{browser}</strong>{os ? ` · ${os}` : ""}{` · ${formFactor}`}
          {device.screen ? <span className="row__muted"> · {device.screen.w}×{device.screen.h}</span> : null}
        </div>
        <div>
          <span className="session-summary__icon" aria-hidden>📍</span>
          {cityLine}
          {session.geo?.region ? <span className="row__muted"> · {session.geo.region}</span> : null}
          {tz ? <span className="row__muted"> · {tz}</span> : null}
        </div>
        <div>
          <span className="session-summary__icon" aria-hidden>🆔</span>
          <span className="row__muted">Visitor </span>
          <code style={{ fontFamily: "ui-monospace, monospace" }}>{fp || "unknown"}</code>
        </div>
        <div className="row__muted" style={{ fontSize: 12 }}>
          Started {formatRelative(session.started_at)}
        </div>
      </div>

      {session.is_bot ? (
        <div className="session-summary__bot">⚠︎ Bot detected — excluded from headline counts.</div>
      ) : null}
    </div>
  );
}
