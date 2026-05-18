"use client";

import { useEffect, useState } from "react";
import { formatDuration, formatRelative } from "../../lib/format";
import SlideDwellChart from "./SlideDwellChart";

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

  if (!sessionId) return null;

  const s = data?.session;
  const link = data?.link;
  const related = data?.related || [];

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer__header">
          <h2 className="drawer__title">
            {link?.name || (s?.viewer_email ? `Organic · ${s.viewer_email}` : "Session")}
          </h2>
          <button onClick={onClose} className="drawer__close">Close</button>
        </div>

        {loading || !s ? (
          <div className="empty-state">Loading…</div>
        ) : (
          <>
            <div className="meta-grid">
              <div><strong>Total:</strong>{formatDuration(s.total_seconds)}</div>
              <div><strong>Max slide:</strong>{s.max_slide_reached}</div>
              <div><strong>Started:</strong>{formatRelative(s.started_at)}</div>
              <div><strong>Last tick:</strong>{formatRelative(s.last_tick_at)}</div>
              {s.ended_at ? <div><strong>Ended:</strong>{formatRelative(s.ended_at)}</div> : null}
            </div>

            <h3>Per-slide dwell</h3>
            <SlideDwellChart dwells={s.slide_dwells} />

            <h3>Where</h3>
            <div className="meta-grid">
              <div><strong>City:</strong>{s.geo?.city || "—"}</div>
              <div><strong>Region:</strong>{s.geo?.region || "—"}</div>
              <div><strong>Country:</strong>{s.geo?.country || "—"}</div>
            </div>

            <h3>Device</h3>
            <div className="meta-grid">
              <div><strong>Browser:</strong>{s.device?.browser || "—"}</div>
              <div><strong>OS:</strong>{s.device?.os || "—"}</div>
              <div><strong>Form:</strong>{s.device?.mobile ? "Mobile" : "Desktop"}</div>
              {s.device?.screen ? <div><strong>Screen:</strong>{s.device.screen.w}×{s.device.screen.h}</div> : null}
              {s.device?.tz ? <div><strong>Timezone:</strong>{s.device.tz}</div> : null}
              {s.fp_hash ? <div title={s.fp_hash}><strong>Fingerprint:</strong><code style={{ fontFamily: "monospace" }}>{s.fp_hash.slice(-8)}</code></div> : null}
              {s.is_bot ? <div style={{ color: "var(--admin-accent)" }}><strong>Bot detected</strong></div> : null}
            </div>

            {related.length > 0 ? (
              <>
                <h3>Also seen on this device</h3>
                <div className="row-list">
                  {related.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => onOpenSession?.(r.id)}
                      className="row"
                      style={{ gridTemplateColumns: "1fr 1fr 80px" }}
                    >
                      <span>{formatRelative(r.started_at)}</span>
                      <span className="row__muted">{r.geo?.city || ""}</span>
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
