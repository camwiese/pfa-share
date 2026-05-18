"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDuration, formatRelative } from "../../lib/format";
import SessionDrawer from "./SessionDrawer";
import ViewsLineChart from "./ViewsLineChart";

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
  const [dayFilter, setDayFilter] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/activity?days=${days}`).then((r) => r.json()),
      fetch(`/api/admin/sessions?days=${days}&limit=100`).then((r) => r.json()),
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

  // Reset filter when the window changes.
  useEffect(() => { setDayFilter(null); }, [days]);

  const filteredSessions = useMemo(() => {
    if (!dayFilter) return sessions;
    return sessions.filter((s) => s.started_at?.slice(0, 10) === dayFilter);
  }, [sessions, dayFilter]);

  // Device split by unique visitor (fingerprint), taking each visitor's most
  // recent session as their device.
  const deviceSplit = useMemo(() => {
    const lastByFp = new Map();
    for (const s of sessions) {
      if (s.is_bot) continue;
      if (!s.fp_hash) continue;
      const prev = lastByFp.get(s.fp_hash);
      if (!prev || new Date(s.started_at) > new Date(prev.started_at)) {
        lastByFp.set(s.fp_hash, s);
      }
    }
    const out = { Mobile: 0, Desktop: 0 };
    for (const s of lastByFp.values()) {
      if (s.device?.mobile) out.Mobile++;
      else out.Desktop++;
    }
    return out;
  }, [sessions]);

  return (
    <div>
      <div className="chip-group" style={{ marginBottom: 16 }}>
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
        <Metric label="Visitors" value={metrics?.visitors ?? "—"} tooltip="Unique people, by browser fingerprint." />
        <Metric label="Sessions" value={metrics?.totalSessions ?? "—"} tooltip="Distinct engagement periods. One visitor may have several." />
        <Metric label="View-time" value={metrics ? formatDuration(metrics.totalSeconds) : "—"} tooltip="Total active seconds across all sessions." />
        <Metric label="Live now" value={liveNow} highlight={liveNow > 0} tooltip="Sessions that ticked in the last 90 seconds." />
      </div>

      {metrics?.daily?.length ? (
        <div style={{ marginBottom: 22 }}>
          <ViewsLineChart
            data={metrics.daily}
            selected={dayFilter}
            onDayClick={(d) => setDayFilter((prev) => (prev === d ? null : d))}
          />
        </div>
      ) : null}

      {deviceSplit.Mobile + deviceSplit.Desktop > 0 ? (
        <div className="device-split">
          <div className="device-split__label">Visitors by device</div>
          <div className="device-split__bar">
            <div
              className="device-split__seg device-split__seg--desktop"
              style={{ flex: deviceSplit.Desktop }}
            >
              <span>🖥 Desktop · {deviceSplit.Desktop}</span>
            </div>
            <div
              className="device-split__seg device-split__seg--mobile"
              style={{ flex: deviceSplit.Mobile }}
            >
              <span>📱 Mobile · {deviceSplit.Mobile}</span>
            </div>
          </div>
        </div>
      ) : null}

      <h2>Recent sessions {dayFilter ? <span className="row__muted" style={{ fontSize: 13, fontFamily: "var(--admin-font-sans)", fontWeight: 400 }}>· filtered</span> : null}</h2>
      <div className="table-head sessions-row" style={{ "--cols": "1.4fr 1fr 1fr 1fr" }}>
        <span>Visitor</span>
        <span>Location</span>
        <span>Visit time</span>
        <span>Date / time</span>
      </div>
      {loading ? (
        <div className="empty-state empty-state--inline">Loading…</div>
      ) : filteredSessions.length === 0 ? (
        <div className="empty-state empty-state--inline">
          {dayFilter ? "No sessions on this day." : "No sessions in this window yet."}
        </div>
      ) : (
        <div className="row-list">
          {filteredSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setOpenId(s.id)}
                className="row sessions-row"
                style={{ "--cols": "1.4fr 1fr 1fr 1fr", textAlign: "left" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span className="row__primary" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.link?.name || s.viewer_email || "Anonymous visitor"}
                  </span>
                  <span className="row__muted" style={{ fontSize: 11 }}>
                    {s.device?.browser || "—"}{s.device?.mobile ? " · Mobile" : ""}
                  </span>
                </div>
                <span className="row__muted" style={{ whiteSpace: "nowrap" }}>{s.geo?.city || "—"}</span>
                <span style={{ whiteSpace: "nowrap" }}>{formatDuration(s.total_seconds)}</span>
                <span className="row__muted" style={{ whiteSpace: "nowrap" }}>{formatExact(s.started_at)}</span>
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

function formatExact(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Metric({ label, value, highlight, tooltip }) {
  return (
    <div className="metric" title={tooltip || ""}>
      <div className="metric__label">{label}</div>
      <div className={`metric__value${highlight ? " metric__value--highlight" : ""}`}>{value}</div>
    </div>
  );
}
