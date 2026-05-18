"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { formatDuration, formatRelative } from "../../lib/format";
import { sharingSignal } from "../../lib/sharingSignal";
import SharingDot from "./SharingDot";
import SessionDrawer from "./SessionDrawer";

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
      fetch(`/api/admin/sessions?link_id=${linkId}&days=365&limit=100`).then((r) => r.json()),
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

  const groups = new Map();
  for (const s of sessions) {
    const key = s.fp_hash || "no-fp";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  const signal = sharingSignal(sessions);

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
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 10 }}>
              <code style={{ background: "var(--admin-paper-2)", padding: "4px 8px", borderRadius: 4, fontFamily: "ui-monospace, monospace" }}>{url}</code>
              <button onClick={copyUrl} className="btn btn--ghost btn--small">Copy</button>
            </div>
            {link.note ? <div className="row__muted" style={{ fontSize: 13, marginBottom: 12 }}>{link.note}</div> : null}

            <div className="meta-grid">
              <div><strong>Visits:</strong>{link.view_count || 0}</div>
              <div><strong>Last seen:</strong>{formatRelative(link.last_viewed_at)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <SharingDot signal={signal} />
                <span className="row__muted">{signal.label}</span>
              </div>
              <label style={{ marginLeft: "auto", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={!!link.is_active}
                  onChange={(e) => toggleActive(e.target.checked)}
                />
                {" "}{link.is_active ? "Active" : "Disabled"}
              </label>
            </div>

            <h3>Sessions by device</h3>
            {sessions.length === 0 ? (
              <div className="empty-state">No sessions yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {Array.from(groups.entries()).map(([fp, group]) => (
                  <div key={fp} className="card" style={{ padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 12, color: "var(--admin-ink-muted)" }}>
                      <SharingDot signal={{ level: "green", label: fp }} />
                      <span style={{ fontFamily: "ui-monospace, monospace" }}>
                        {fp === "no-fp" ? "No fingerprint" : fp.slice(-8)}
                      </span>
                      <span>· {group.length} session{group.length === 1 ? "" : "s"}</span>
                    </div>
                    <div className="row-list">
                      {group.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setOpenSessionId(s.id)}
                          className="row"
                          style={{ gridTemplateColumns: "1fr 1fr 1fr 80px" }}
                        >
                          <span>{formatRelative(s.started_at)}</span>
                          <span className="row__muted">{s.geo?.city || ""}</span>
                          <span className="row__muted">{s.device?.mobile ? "Mobile" : s.device?.browser || ""}</span>
                          <span>{formatDuration(s.total_seconds || 0)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
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
