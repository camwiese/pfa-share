"use client";

import { formatDuration } from "../../lib/format";

// Inline SVG bar chart of sessions/day. No chart library — keeps the admin
// bundle small and matches the deck's hand-rolled aesthetic.

export default function ViewsByDayChart({ data = [], height = 90 }) {
  if (!data.length) return null;

  const max = Math.max(1, ...data.map((d) => d.sessions));
  const W = 100;                            // viewBox width units
  const H = height;
  const padTop = 4;
  const padBottom = 12;
  const innerH = H - padTop - padBottom;
  const barW = W / data.length;
  const gap = Math.min(0.8, barW * 0.18);

  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div className="metric__label" style={{ marginBottom: 0 }}>Sessions per day</div>
        <div style={{ fontSize: 11, color: "var(--admin-ink-faint)" }}>
          {data[0]?.date} → {data[data.length - 1]?.date}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={H}
        style={{ display: "block" }}
      >
        {/* baseline */}
        <line x1="0" y1={H - padBottom} x2={W} y2={H - padBottom} stroke="var(--admin-ink-ghost)" strokeWidth="0.15" />
        {data.map((d, i) => {
          const h = (d.sessions / max) * innerH;
          const x = i * barW + gap / 2;
          const y = H - padBottom - h;
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={barW - gap}
                height={h}
                fill={d.sessions ? "var(--admin-accent)" : "var(--admin-ink-ghost)"}
                opacity={d.sessions ? 1 : 0.4}
                rx={0.4}
              >
                <title>{d.date}: {d.sessions} session{d.sessions === 1 ? "" : "s"} · {formatDuration(d.seconds)}</title>
              </rect>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
