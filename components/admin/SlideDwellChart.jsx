"use client";

import { SLIDE_TITLES, SLIDE_COUNT } from "../../constants/slides";
import { formatDuration } from "../../lib/format";

export default function SlideDwellChart({ dwells }) {
  const data = dwells || {};
  let max = 0;
  for (let i = 0; i < SLIDE_COUNT; i++) {
    const s = Number(data[String(i)]) || 0;
    if (s > max) max = s;
  }
  if (max === 0) max = 1;

  return (
    <div style={{ display: "grid", gap: 6, fontFamily: "Inter, system-ui, sans-serif" }}>
      {Array.from({ length: SLIDE_COUNT }, (_, i) => {
        const seconds = Number(data[String(i)]) || 0;
        const pct = (seconds / max) * 100;
        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr 60px",
              gap: 10,
              alignItems: "center",
              fontSize: 12,
              color: "#33403a",
            }}
          >
            <div style={{ color: "#7b8e80", textAlign: "right" }}>{i}</div>
            <div title={SLIDE_TITLES[i] || `Slide ${i}`}>
              <div style={{ fontSize: 12, marginBottom: 2 }}>{SLIDE_TITLES[i] || `Slide ${i}`}</div>
              <div style={{ width: "100%", height: 6, background: "#eee9dc", borderRadius: 3 }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #c4a355, #b39345)",
                    borderRadius: 3,
                    transition: "width 200ms",
                  }}
                />
              </div>
            </div>
            <div style={{ textAlign: "right", color: seconds ? "#33403a" : "#9e9d92" }}>
              {seconds ? formatDuration(seconds) : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
