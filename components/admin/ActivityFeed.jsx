"use client";

import { useEffect, useState } from "react";
import { formatDuration, formatRelative } from "../../lib/format";
import SharingDot from "./SharingDot";
import SessionDrawer from "./SessionDrawer";

const WINDOWS = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

export default function ActivityFeed() {
  const [days, setDays] = useState(30);
  const [metrics, setMetrics] = useState(null);
  const [liveNow, setLiveNow] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/activity?days=${days}`).then((r) => r.json()),
      fetch(`/api/admin/sessions?days=${days}&limit=50`).then((r) => r.json()),
    ])
      .then(([m, s]) => {
        setMetrics(m);
        setSessions(s.sessions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    let mounted = true;
    function poll() {
      if (document.visibilityState !== "visible") return;
      fetch("/api/admin/activity?live=1")
        .then((r) => r.json())
        .then((d) => { if (mounted) setLiveNow(d.liveNowCount || 0); })
        .catch(() => {});
    }
    poll();
    const handle = setInterval(poll, 5000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      mounted = false;
      clearInterval(handle);
      document.removeEventListener("visibilitychange", poll);
    };
  }, []);

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {WINDOWS.map((w) => (
          <button
            key={w.days}
            onClick={() => setDays(w.days)}
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 12,
              padding: "6px 10px",
              border: `1px solid ${days === w.days ? "#3a473f" : "#dedad0"}`,
              background: days === w.days ? "#3a473f" : "#fff",
              color: days === w.days ? "#fcfbf8" : "#33403a",
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            {w.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 22 }}>
        <Metric label="Total sessions" value={metrics?.totalSessions ?? "—"} />
        <Metric label="View-time" value={metrics ? formatDuration(metrics.totalSeconds) : "—"} />
        <Metric label="Unique fingerprints" value={metrics?.uniqueFingerprints ?? "—"} />
        <Metric label="Live now" value={liveNow} highlight={liveNow > 0} />
      </div>

      <h2 style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, fontSize: 16, margin: "0 0 8px" }}>Recent sessions</h2>
      {loading ? (
        <div style={{ color: "#7b8e80", fontSize: 13 }}>Loading…</div>
      ) : sessions.length === 0 ? (
        <div style={{ color: "#7b8e80", fontSize: 13 }}>No sessions in this window yet.</div>
      ) : (
        <div className="admin-sessions-list" style={{ display: "grid", gap: 4 }}>
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setOpenId(s.id)}
              className="admin-session-row"
              style={sessionRow}
            >
              <SharingDot
                signal={{ level: "green", label: s.fp_hash ? "Fingerprint " + s.fp_hash.slice(-6) : "No fingerprint" }}
              />
              <span style={{ fontWeight: 500 }}>
                {s.link?.name || (s.viewer_email ? `Organic · ${s.viewer_email}` : "Session")}
              </span>
              <span style={{ color: "#7b8e80" }}>{s.geo?.city || ""}</span>
              <span style={{ color: "#7b8e80" }}>{s.device?.mobile ? "Mobile" : s.device?.browser || ""}</span>
              <span style={{ color: "#7b8e80" }}>{formatRelative(s.started_at)}</span>
              <span style={{ textAlign: "right" }}>{formatDuration(s.total_seconds)}</span>
            </button>
          ))}
        </div>
      )}

      <SessionDrawer
        sessionId={openId}
        onClose={() => setOpenId(null)}
        onOpenSession={(id) => setOpenId(id)}
      />
    </div>
  );
}

function Metric({ label, value, highlight }) {
  return (
    <div
      style={{
        padding: 14,
        border: "1px solid #dedad0",
        borderRadius: 10,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7b8e80", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 24, color: highlight ? "#3a8a4d" : "#33403a" }}>
        {value}
      </div>
    </div>
  );
}

const sessionRow = {
  display: "grid",
  gridTemplateColumns: "16px 1.6fr 1fr 1fr 1fr 80px",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  border: "1px solid #eee9dc",
  background: "#fff",
  borderRadius: 6,
  cursor: "pointer",
  textAlign: "left",
  fontSize: 13,
  fontFamily: "Inter, system-ui, sans-serif",
};
