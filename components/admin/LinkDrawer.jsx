"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { formatDuration, formatRelative } from "../../lib/format";
import { sharingSignal } from "../../lib/sharingSignal";
import SharingDot from "./SharingDot";
import SlideBars from "./SlideBars";

export default function LinkDrawer({ linkId, onClose, onAfterChange }) {
  const [link, setLink] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessionId, setExpandedSessionId] = useState(null);

  // Close on Escape (collapses any open inline session first).
  useEffect(() => {
    if (!linkId) return;
    function onKey(e) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (expandedSessionId) setExpandedSessionId(null);
      else onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [linkId, expandedSessionId, onClose]);

  useEffect(() => {
    if (!linkId) return;
    setLoading(true);
    setExpandedSessionId(null);
    Promise.all([
      fetch(`/api/admin/links?status=all`).then((r) => r.json()),
      fetch(`/api/admin/sessions?link_id=${linkId}&days=365&limit=200`).then((r) => r.json()),
    ])
      .then(([linksRes, sRes]) => {
        const found = (linksRes.links || []).find((l) => l.id === linkId);
        setLink(found || null);
        setSessions(sRes.sessions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [linkId]);

  if (!linkId) return null;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const url = link ? `${baseUrl}/d/${link.token}` : "";

  // Sessions grouped by fingerprint = unique visitors.
  const groups = new Map();
  for (const s of sessions) {
    const key = s.fp_hash || "no-fp";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  const signal = sharingSignal(sessions);

  // Aggregate metrics for this link.
  const realSessions = sessions.filter((s) => !s.is_bot);
  const totalSeconds = realSessions.reduce((a, s) => a + (Number(s.total_seconds) || 0), 0);
  const maxSlide = realSessions.reduce((m, s) => Math.max(m, s.max_slide_reached || 0), 0);

  // Device breakdown
  const deviceBreakdown = { Mobile: 0, Desktop: 0 };
  for (const fpKey of groups.keys()) {
    const lastSession = [...groups.get(fpKey)].sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0];
    if (!lastSession || lastSession.is_bot) continue;
    if (lastSession.device?.mobile) deviceBreakdown.Mobile++;
    else deviceBreakdown.Desktop++;
  }

  // Aggregated per-slide dwell + visit counts across all sessions for this link.
  const aggDwells = {};
  const aggVisits = {};
  for (const s of realSessions) {
    const d = s.slide_dwells || {};
    for (const k of Object.keys(d)) {
      aggDwells[k] = (Number(aggDwells[k]) || 0) + Number(d[k]);
    }
    const v = s.slide_visits || {};
    for (const k of Object.keys(v)) {
      aggVisits[k] = (Number(aggVisits[k]) || 0) + Number(v[k]);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied");
    } catch {
      toast.error("Couldn't copy");
    }
  }

  async function toggleActive(next) {
    const res = await fetch(`/api/admin/links/${linkId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: next }),
    });
    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }
    setLink((prev) => prev ? { ...prev, is_active: next } : prev);
    onAfterChange?.();
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer__header drawer__header--sticky">
          <div>
            <h2 className="drawer__title">{link?.name || "Link"}</h2>
            {link?.token ? <div className="drawer__sub">/d/{link.token}</div> : null}
          </div>
          <button onClick={onClose} className="drawer__close">Close</button>
        </div>

        {loading || !link ? (
          <div className="empty-state">Loading…</div>
        ) : (
          <>
            <div className="link-summary">
              <div className="link-summary__row">
                <div>
                  <div className="metric__label">Visitors</div>
                  <div className="metric__value">{groups.size}</div>
                </div>
                <div>
                  <div className="metric__label">Sessions</div>
                  <div className="metric__value">{realSessions.length}</div>
                </div>
                <div>
                  <div className="metric__label">View-time</div>
                  <div className="metric__value">{formatDuration(totalSeconds)}</div>
                </div>
                <div>
                  <div className="metric__label">Furthest slide</div>
                  <div className="metric__value">{maxSlide}</div>
                </div>
              </div>
              <div className="link-summary__url">
                <code>{url}</code>
                <button onClick={copyUrl} className="btn btn--ghost btn--small">Copy</button>
                <label className="switch" style={{ marginLeft: "auto" }}>
                  <input
                    type="checkbox"
                    checked={!!link.is_active}
                    onChange={(e) => toggleActive(e.target.checked)}
                  />
                  <span className="switch__track"><span className="switch__thumb" /></span>
                  <span>{link.is_active ? "Active" : "Disabled"}</span>
                </label>
              </div>
              <div className="link-summary__meta">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <SharingDot signal={signal} />
                  <span className="row__muted">{signal.label}</span>
                </div>
                <DeviceBreakdown breakdown={deviceBreakdown} />
                <span className="row__muted">Created {formatRelative(link.created_at)}</span>
              </div>
              {link.note ? <div className="link-summary__note">{link.note}</div> : null}
            </div>

            <h3>Time per slide (all visitors)</h3>
            <SlideBars dwells={aggDwells} showRevisits={false} />

            <h3 style={{ marginTop: 22 }}>Visitors</h3>
            {sessions.length === 0 ? (
              <div className="empty-state">No sessions yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {Array.from(groups.entries()).map(([fp, group]) => {
                  const first = [...group].sort((a, b) => new Date(a.started_at) - new Date(b.started_at))[0];
                  const last = [...group].sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0];
                  const groupTotal = group.reduce((a, s) => a + (Number(s.total_seconds) || 0), 0);
                  const groupMax = group.reduce((m, s) => Math.max(m, s.max_slide_reached || 0), 0);
                  const device = last.device || {};
                  const browser = device.browser || "Unknown";
                  const os = device.os || "";
                  return (
                    <div key={fp} className="visitor-group">
                      <div className="visitor-group__header">
                        <div className="visitor-group__device">
                          <span aria-hidden>{device.mobile ? "📱" : "🖥"}</span>
                          <strong>{browser}</strong>
                          <span className="row__muted">{os}{device.mobile ? " · Mobile" : " · Desktop"}</span>
                        </div>
                        <div className="visitor-group__total">
                          {formatDuration(groupTotal)} · slide {groupMax}
                        </div>
                      </div>
                      <div className="visitor-group__meta">
                        <span>{first.geo?.city || "—"}{first.geo?.country ? ", " + first.geo.country : ""}</span>
                        <span className="row__muted">·</span>
                        <span className="row__muted">{group.length} session{group.length === 1 ? "" : "s"}</span>
                        <span className="row__muted">·</span>
                        <span className="row__muted">First {formatRelative(first.started_at)}</span>
                        {first.id !== last.id ? (
                          <>
                            <span className="row__muted">·</span>
                            <span className="row__muted">Last {formatRelative(last.started_at)}</span>
                          </>
                        ) : null}
                      </div>
                      <div className="row-list">
                        {[...group].sort((a, b) => new Date(b.started_at) - new Date(a.started_at)).map((s) => {
                          const isOpen = expandedSessionId === s.id;
                          return (
                            <div key={s.id}>
                              <button
                                onClick={() => setExpandedSessionId(isOpen ? null : s.id)}
                                className={`row sessions-row${isOpen ? " is-open" : ""}`}
                                style={{ "--cols": "1.4fr 1fr 70px 80px 12px" }}
                                aria-expanded={isOpen}
                              >
                                <span>{formatExact(s.started_at)}</span>
                                <span className="row__muted">{s.geo?.city || "—"}</span>
                                <span className="row__muted">slide {s.max_slide_reached}</span>
                                <span>{formatDuration(s.total_seconds || 0)}</span>
                                <span className="row__chevron" aria-hidden>{isOpen ? "▾" : "▸"}</span>
                              </button>
                              {isOpen ? (
                                <div className="visitor-session-detail">
                                  <SlideBars dwells={s.slide_dwells} visits={s.slide_visits} />
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

function DeviceBreakdown({ breakdown }) {
  const total = breakdown.Mobile + breakdown.Desktop;
  if (total === 0) return null;
  return (
    <span className="row__muted" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      {breakdown.Desktop > 0 ? <span>🖥 {breakdown.Desktop}</span> : null}
      {breakdown.Mobile > 0 ? <span>📱 {breakdown.Mobile}</span> : null}
    </span>
  );
}

function formatExact(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
