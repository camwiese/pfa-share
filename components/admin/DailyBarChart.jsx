"use client";

import { useState } from "react";
import { formatDuration } from "../../lib/format";

// Vertical bar chart of sessions/day. Hover any bar for a tooltip; click a
// bar to filter the recent sessions list to that day. Date labels show at
// reasonable intervals along the bottom axis.

export default function DailyBarChart({ data = [], selected = null, onDayClick }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  if (!data.length) return null;

  const max = Math.max(1, ...data.map((d) => d.sessions));
  const hover = hoverIdx != null ? data[hoverIdx] : null;

  // Decide which date labels to show: about 4-6 ticks.
  const tickIndices = pickTickIndices(data.length, 5);

  return (
    <div className="card chart">
      <div className="chart__header">
        <div className="metric__label" style={{ marginBottom: 0 }}>Sessions per day</div>
        <div className="chart__legend">
          {hover ? (
            <>
              <strong>{formatDateLabel(hover.date)}</strong>
              <span>· {hover.sessions} session{hover.sessions === 1 ? "" : "s"}</span>
              <span>· {formatDuration(hover.seconds)}</span>
            </>
          ) : (
            <span className="row__muted">Hover for details · click to filter</span>
          )}
        </div>
      </div>

      <div className="chart__plot">
        {data.map((d, i) => {
          const h = (d.sessions / max) * 100;
          const isSelected = selected === d.date;
          const isHover = hoverIdx === i;
          return (
            <button
              key={d.date}
              type="button"
              className={`chart__bar${isSelected ? " is-selected" : ""}${isHover ? " is-hover" : ""}`}
              style={{ height: `${Math.max(h, d.sessions ? 3 : 1.5)}%` }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              onFocus={() => setHoverIdx(i)}
              onBlur={() => setHoverIdx(null)}
              onClick={() => onDayClick?.(d.date)}
              aria-label={`${formatDateLabel(d.date)}: ${d.sessions} sessions, ${formatDuration(d.seconds)}`}
            />
          );
        })}
      </div>

      <div className="chart__xaxis">
        {data.map((d, i) =>
          tickIndices.includes(i) ? (
            <span key={d.date} className="chart__xtick" style={{ left: `${((i + 0.5) / data.length) * 100}%` }}>
              {formatTick(d.date)}
            </span>
          ) : null
        )}
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

function pickTickIndices(len, count) {
  if (len <= count) return Array.from({ length: len }, (_, i) => i);
  const step = (len - 1) / (count - 1);
  const out = [];
  for (let i = 0; i < count; i++) out.push(Math.round(i * step));
  return out;
}

function formatDateLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function formatTick(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
