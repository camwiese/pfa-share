"use client";

import { useState } from "react";
import { formatDuration } from "../../lib/format";

// DocSend-style line chart of sessions/day.
//   - Y-axis with tick labels at 0 and max
//   - Gridlines + every-day X labels (rotated for compactness)
//   - Maroon line over light-pink filled area
//   - Filled dot at every data point; on hover, the dot grows and a tooltip
//     pins above showing day + sessions + view-time
//   - Click a dot to filter the recent sessions list to that day

export default function ViewsLineChart({ data = [], selected = null, onDayClick }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  if (!data.length) return null;

  const W = 1000;            // viewBox width
  const H = 220;             // viewBox height
  const padLeft = 28;
  const padRight = 12;
  const padTop = 18;
  const padBottom = 56;
  const innerW = W - padLeft - padRight;
  const innerH = H - padTop - padBottom;

  const max = Math.max(2, ...data.map((d) => d.sessions));
  const yTicks = niceTicks(max);
  const xStep = data.length > 1 ? innerW / (data.length - 1) : 0;

  function xAt(i) { return padLeft + i * xStep; }
  function yAt(v) { return padTop + innerH - (v / yTicks[yTicks.length - 1]) * innerH; }

  // Build the line path
  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(2)} ${yAt(d.sessions).toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${xAt(data.length - 1).toFixed(2)} ${(padTop + innerH).toFixed(2)} L ${xAt(0).toFixed(2)} ${(padTop + innerH).toFixed(2)} Z`;

  const hover = hoverIdx != null ? data[hoverIdx] : null;

  // Show X labels for ~10 ticks max (or all if shorter)
  const labelStep = Math.max(1, Math.ceil(data.length / 14));

  return (
    <div className="card chart">
      <div className="chart__header">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="chart__legend-chip">
            <span className="chart__legend-dot" style={{ background: "var(--admin-accent)" }} />
            Sessions
          </span>
          <span className="metric__label" style={{ marginBottom: 0 }}>per day</span>
        </div>
        <div className="chart__legend">
          {hover ? (
            <>
              <strong>{formatDateLabel(hover.date)}</strong>
              <span>· {hover.sessions} session{hover.sessions === 1 ? "" : "s"}</span>
              <span>· {formatDuration(hover.seconds)}</span>
            </>
          ) : (
            <span className="row__muted">Hover for detail · click to filter</span>
          )}
        </div>
      </div>

      <div className="line-chart">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{ display: "block" }}>
          {/* gridlines + y labels */}
          {yTicks.map((y) => (
            <g key={y}>
              <line x1={padLeft} x2={W - padRight} y1={yAt(y)} y2={yAt(y)} stroke="var(--admin-ink-ghost)" strokeWidth="0.6" />
              <text x={padLeft - 6} y={yAt(y) + 3} textAnchor="end" fontSize="9" fill="var(--admin-ink-muted)">
                {y}
              </text>
            </g>
          ))}

          {/* area + line */}
          <path d={areaPath} fill="var(--admin-accent)" opacity="0.08" />
          <path d={linePath} stroke="var(--admin-accent)" strokeWidth="1.6" fill="none" strokeLinejoin="round" strokeLinecap="round" />

          {/* dots */}
          {data.map((d, i) => {
            const cx = xAt(i);
            const cy = yAt(d.sessions);
            const isHover = hoverIdx === i;
            const isSelected = selected === d.date;
            const hasData = d.sessions > 0;
            return (
              <g key={d.date}>
                {/* invisible wider hit-box */}
                <rect
                  x={cx - xStep / 2}
                  y={padTop}
                  width={xStep || 4}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  onClick={() => onDayClick?.(d.date)}
                  style={{ cursor: "pointer" }}
                />
                {hasData || isHover || isSelected ? (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHover || isSelected ? 4 : 2.6}
                    fill={isSelected ? "var(--admin-ink)" : "var(--admin-accent)"}
                    stroke="#fff"
                    strokeWidth="1.4"
                  />
                ) : null}
              </g>
            );
          })}

          {/* x labels */}
          {data.map((d, i) =>
            i % labelStep === 0 || i === data.length - 1 ? (
              <text
                key={`xl-${d.date}`}
                x={xAt(i)}
                y={padTop + innerH + 14}
                textAnchor="end"
                transform={`rotate(-58, ${xAt(i)}, ${padTop + innerH + 14})`}
                fontSize="9"
                fill={hoverIdx === i || selected === d.date ? "var(--admin-ink)" : "var(--admin-ink-muted)"}
              >
                {formatTick(d.date)}
              </text>
            ) : null
          )}
        </svg>
      </div>

      {selected ? (
        <div className="chart__filter-strip">
          Showing <strong>{formatDateLabel(selected)}</strong>
          <button type="button" className="btn--text" onClick={() => onDayClick?.(null)}>Clear</button>
        </div>
      ) : null}
    </div>
  );
}

function niceTicks(max) {
  // Returns array of tick values [0, ..., niceMax]
  const niceMax = max <= 5 ? 5 : max <= 10 ? 10 : max <= 20 ? 20 : Math.ceil(max / 10) * 10;
  const step = niceMax / 4;
  return Array.from({ length: 5 }, (_, i) => Math.round(i * step));
}

function formatDateLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatTick(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase();
}
