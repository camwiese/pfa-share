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

  // Group sessions by fp_hash for the "by device" view.
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(20,30,25,0.32)",
      }}
      onClick={onClose}
    >
      <aside
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(720px, 80vw)",
          background: "#fcfbf8",
          borderLeft: "1px solid #dedad0",
          boxShadow: "-12px 0 36px rgba(60,58,52,0.12)",
          overflowY: "auto",
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 20, margin: 0 }}>
            {link?.name || "Link"}
          </h2>
          <button onClick={onClose} style={closeBtn}>Close</button>
        </div>

        {loading || !link ? (
          <div style={{ color: "#7b8e80", fontSize: 13 }}>Loading…</div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 8 }}>
              <code style={{ background: "#eee9dc", padding: "4px 8px", borderRadius: 4 }}>{url}</code>
              <button onClick={copyUrl} style={smallBtn}>Copy</button>
            </div>
            {link.note ? <div style={{ color: "#7b8e80", fontSize: 13, marginBottom: 12 }}>{link.note}</div> : null}

            <div style={{ display: "flex", gap: 16, marginBottom: 18, fontSize: 13 }}>
              <div><strong>Visits:</strong> {link.view_count || 0}</div>
              <div><strong>Last seen:</strong> {formatRelative(link.last_viewed_at)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <SharingDot signal={signal} />
                <span style={{ color: "#7b8e80" }}>{signal.label}</span>
              </div>
              <label style={{ marginLeft: "auto", fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={!!link.is_active}
                  onChange={(e) => toggleActive(e.target.checked)}
                />
                {" "}{link.is_active ? "Active" : "Disabled"}
              </label>
            </div>

            <h3 style={sectionHeading}>Sessions by device</h3>
            {sessions.length === 0 ? (
              <div style={{ color: "#7b8e80", fontSize: 13 }}>No sessions yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {Array.from(groups.entries()).map(([fp, group]) => (
                  <div key={fp} style={{ border: "1px solid #eee9dc", borderRadius: 8, padding: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 12, color: "#7b8e80" }}>
                      <SharingDot signal={{ level: "green", label: fp }} />
                      <span style={{ fontFamily: "monospace" }}>{fp === "no-fp" ? "No fingerprint" : fp.slice(-8)}</span>
                      <span>· {group.length} session{group.length === 1 ? "" : "s"}</span>
                    </div>
                    <div style={{ display: "grid", gap: 4 }}>
                      {group.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setOpenSessionId(s.id)}
                          style={sessionRow}
                        >
                          <span>{formatRelative(s.started_at)}</span>
                          <span style={{ color: "#7b8e80" }}>{s.geo?.city || ""}</span>
                          <span style={{ color: "#7b8e80" }}>{s.device?.mobile ? "Mobile" : s.device?.browser || ""}</span>
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

const closeBtn = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 12,
  padding: "6px 10px",
  border: "1px solid #dedad0",
  background: "#fff",
  borderRadius: 6,
  cursor: "pointer",
};
const smallBtn = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 12,
  padding: "4px 8px",
  border: "1px solid #dedad0",
  background: "#fff",
  borderRadius: 6,
  cursor: "pointer",
};
const sectionHeading = { fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, fontSize: 14, color: "#33403a", margin: "12px 0 8px" };
const sessionRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 80px",
  gap: 10,
  padding: "8px 10px",
  border: "1px solid #eee9dc",
  background: "#fff",
  borderRadius: 4,
  cursor: "pointer",
  textAlign: "left",
  fontSize: 13,
};
