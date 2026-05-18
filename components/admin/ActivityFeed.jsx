"use client";

import { useEffect, useState } from "react";
import { formatDuration, formatRelative } from "../../lib/format";
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
    <div>
      <div className="chip-group">
        {WINDOWS.map((w) => (
          <button
            key={w.days}
            onClick={() => setDays(w.days)}
            className={`chip${days === w.days ? " is-active" : ""}`}
          >
            {w.label}
          </button>
        ))}
      </div>

      <div className="metrics">
        <Metric label="Total sessions" value={metrics?.totalSessions ?? "—"} />
        <Metric label="View-time" value={metrics ? formatDuration(metrics.totalSeconds) : "—"} />
        <Metric label="Unique fingerprints" value={metrics?.uniqueFingerprints ?? "—"} />
        <Metric label="Live now" value={liveNow} highlight={liveNow > 0} />
      </div>

      <h2>Recent sessions</h2>
      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">No sessions in this window yet.</div>
      ) : (
        <div className="row-list">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setOpenId(s.id)}
              className="row"
              style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr 80px" }}
            >
              <span className="row__primary">
                {s.link?.name || (s.viewer_email ? `Organic · ${s.viewer_email}` : "Session")}
              </span>
              <span className="row__muted">{s.geo?.city || ""}</span>
              <span className="row__muted">{s.device?.mobile ? "Mobile" : s.device?.browser || ""}</span>
              <span className="row__muted">{formatRelative(s.started_at)}</span>
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
    <div className="metric">
      <div className="metric__label">{label}</div>
      <div className={`metric__value${highlight ? " metric__value--highlight" : ""}`}>{value}</div>
    </div>
  );
}
