"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { formatDuration, formatRelative } from "../../lib/format";
import { sharingSignal } from "../../lib/sharingSignal";
import SharingDot from "./SharingDot";
import SessionDrawer from "./SessionDrawer";
import SlideDwellChart from "./SlideDwellChart";

export default function LinkDrawer({ linkId, onClose, onAfterChange }) {
  const [link, setLink] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openSessionId, setOpenSessionId] = useState(null);

  useEffect(() => {
    if (!linkId) return;
    setLoading(true);
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

  // Sessions grouped by fingerprint = unique visitors
  const groups = new Map();
  for (const s of sessions) {
    const key = s.fp_hash || "no-fp";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  const signal = sharingSignal(sessions);

  // Aggregate metrics for this link
  const realSessions = sessions.filter((s) => !s.is_bot);
  const totalSeconds = realSessions.reduce((a, s) => a + (Number(s.total_seconds) || 0), 0);
  const maxSlide = realSessions.reduce((m, s) => Math.max(m, s.max_slide_reached || 0), 0);
  const visitors = groups.size - (groups.has("no-fp") ? 1 : 0) + (groups.has("no-fp") ? 1 : 0);

  // Aggregated per-slide dwell across all sessions for this link.
  const aggDwells = {};
  for (const s of realSessions) {
    const d = s.slide_dwells || {};
    for (const k of Object.keys(d)) {
      aggDwells[k] = (Number(aggDwells[k]) || 0) + Number(d[k]);
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
        <div className="drawer__header">
          <h2 className="drawer__title">{link?.name || "Link"}</h2>
          <button onClick={onClose} className="drawer__close">Close</button>
        </div>

        {loading || !link ? (
          <div className="empty-state">Loading…</div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 12 }}>
              <code style={{ background: "var(--admin-paper-2)", padding: "4px 8px", borderRadius: 4, fontFamily: "ui-monospace, monospace" }}>{url}</code>
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
            {link.note ? <div className="row__muted" style={{ fontSize: 13, marginBottom: 12 }}>{link.note}</div> : null}

            <div className="metrics" style={{ marginBottom: 18 }}>
              <Metric label="Visitors" value={groups.size} />
              <Metric label="Sessions" value={realSessions.length} />
              <Metric label="View-time" value={formatDuration(totalSeconds)} />
              <Metric label="Furthest slide" value={maxSlide} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 14 }}>
              <SharingDot signal={signal} />
              <span className="row__muted">{signal.label}</span>
              <span style={{ marginLeft: "auto" }} className="row__muted">
                Created {formatRelative(link.created_at)}
              </span>
            </div>

            <h3>Per-slide dwell (aggregated)</h3>
            <SlideDwellChart dwells={aggDwells} />

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
                  return (
                    <div key={fp} className="card" style={{ padding: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <SharingDot signal={{ level: "green", label: fp }} />
                        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "var(--admin-ink-muted)" }}>
                          {fp === "no-fp" ? "No fingerprint" : fp.slice(-8)}
                        </span>
                        <span className="row__muted" style={{ fontSize: 12 }}>
                          · {group.length} session{group.length === 1 ? "" : "s"} · {formatDuration(groupTotal)} · slide {groupMax}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--admin-ink-muted)", marginBottom: 8 }}>
                        <span>{first.geo?.city || ""}{first.geo?.country ? ", " + first.geo.country : ""}</span>
                        <span>{first.device?.browser} · {first.device?.os}{first.device?.mobile ? " (mobile)" : ""}</span>
                        <span style={{ marginLeft: "auto" }}>
                          First {formatRelative(first.started_at)} · Last {formatRelative(last.started_at)}
                        </span>
                      </div>
                      <div className="row-list">
                        {[...group].sort((a, b) => new Date(b.started_at) - new Date(a.started_at)).map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setOpenSessionId(s.id)}
                            className="row"
                            style={{ gridTemplateColumns: "1.2fr 1fr 60px 80px" }}
                          >
                            <span>{new Date(s.started_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                            <span className="row__muted">{s.geo?.city || ""}</span>
                            <span className="row__muted">slide {s.max_slide_reached}</span>
                            <span style={{ textAlign: "right" }}>{formatDuration(s.total_seconds || 0)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </aside>

      <SessionDrawer
        sessionId={openSessionId}
        onClose={() => setOpenSessionId(null)}
        onOpenSession={(id) => setOpenSessionId(id)}
      />
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <div className="metric__label">{label}</div>
      <div className="metric__value">{value}</div>
    </div>
  );
}
