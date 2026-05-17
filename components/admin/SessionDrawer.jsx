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
            {link?.name || (s?.viewer_email ? `Organic · ${s.viewer_email}` : "Session")}
          </h2>
          <button onClick={onClose} style={closeBtn}>Close</button>
        </div>

        {loading || !s ? (
          <div style={{ color: "#7b8e80", fontSize: 13 }}>Loading…</div>
        ) : (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 18, fontSize: 13, color: "#33403a" }}>
              <div><strong>Total:</strong> {formatDuration(s.total_seconds)}</div>
              <div><strong>Max slide:</strong> {s.max_slide_reached}</div>
              <div><strong>Started:</strong> {formatRelative(s.started_at)}</div>
              <div><strong>Last tick:</strong> {formatRelative(s.last_tick_at)}</div>
              {s.ended_at ? <div><strong>Ended:</strong> {formatRelative(s.ended_at)}</div> : null}
            </div>

            <h3 style={sectionHeading}>Per-slide dwell</h3>
            <SlideDwellChart dwells={s.slide_dwells} />

            <h3 style={sectionHeading}>Where</h3>
            <div style={metaBlock}>
              <div><strong>City:</strong> {s.geo?.city || "—"}</div>
              <div><strong>Region:</strong> {s.geo?.region || "—"}</div>
              <div><strong>Country:</strong> {s.geo?.country || "—"}</div>
              {s.geo?.lat ? (
                <div><strong>Coords:</strong> {Number(s.geo.lat).toFixed(2)}, {Number(s.geo.lon).toFixed(2)}</div>
              ) : null}
            </div>

            <h3 style={sectionHeading}>Device</h3>
            <div style={metaBlock}>
              <div><strong>Browser:</strong> {s.device?.browser || "—"}</div>
              <div><strong>OS:</strong> {s.device?.os || "—"}</div>
              <div><strong>Form:</strong> {s.device?.mobile ? "Mobile" : "Desktop"}</div>
              {s.device?.screen ? <div><strong>Screen:</strong> {s.device.screen.w}×{s.device.screen.h}</div> : null}
              {s.device?.tz ? <div><strong>Timezone:</strong> {s.device.tz}</div> : null}
              {s.fp_hash ? (
                <div title={s.fp_hash}><strong>Fingerprint:</strong> {s.fp_hash.slice(-8)}</div>
              ) : null}
              {s.is_bot ? <div style={{ color: "#a84642" }}><strong>Bot detected</strong></div> : null}
            </div>

            {related.length > 0 ? (
              <>
                <h3 style={sectionHeading}>Also seen on this device</h3>
                <div style={{ display: "grid", gap: 6 }}>
                  {related.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => onOpenSession?.(r.id)}
                      style={relatedRow}
                    >
                      <span>{formatRelative(r.started_at)}</span>
                      <span style={{ color: "#7b8e80" }}>{r.geo?.city || ""}</span>
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

const closeBtn = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 12,
  padding: "6px 10px",
  border: "1px solid #dedad0",
  background: "#fff",
  borderRadius: 6,
  cursor: "pointer",
};
const sectionHeading = { fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, fontSize: 14, color: "#33403a", margin: "20px 0 8px" };
const metaBlock = { display: "grid", gap: 4, fontSize: 13, color: "#33403a", marginBottom: 8 };
const relatedRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 80px",
  gap: 8,
  padding: "8px 10px",
  border: "1px solid #dedad0",
  background: "#fff",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  textAlign: "left",
};
