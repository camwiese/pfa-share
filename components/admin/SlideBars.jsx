"use client";

import { useState } from "react";
import { SLIDE_TITLES, SLIDE_COUNT } from "../../constants/slides";
import { formatDuration } from "../../lib/format";

// Vertical bar chart of time-per-slide across all 28 slides. DocSend-style:
// slides on the X axis, time on the Y axis. Hover a bar for the slide title
// and duration. When slide_visits is supplied, slides revisited (visits > 1)
// get a small "×N" badge above the bar to flag the revisit.

export default function SlideBars({ dwells, visits, showRevisits = true }) {
  const data = dwells || {};
  const visitCounts = visits || {};
  const [hoverIdx, setHoverIdx] = useState(null);

  let max = 0;
  for (let i = 0; i < SLIDE_COUNT; i++) {
    const s = Number(data[String(i)]) || 0;
    if (s > max) max = s;
  }
  if (max === 0) max = 1;

  const hoverSeconds = hoverIdx != null ? (Number(data[String(hoverIdx)]) || 0) : 0;
  const hoverVisits = hoverIdx != null ? (Number(visitCounts[String(hoverIdx)]) || 0) : 0;
  const hoverTitle = hoverIdx != null ? (SLIDE_TITLES[hoverIdx] || `Slide ${hoverIdx}`) : null;

  const tickEvery = 5;

  return (
    <div className="card chart">
      <div className="chart__header">
        <div className="metric__label" style={{ marginBottom: 0 }}>Time per slide</div>
        <div className="chart__legend">
          {hoverIdx != null ? (
            <>
              <strong>Slide {hoverIdx}</strong>
              <span>· {hoverTitle}</span>
              <span>· {hoverSeconds ? formatDuration(hoverSeconds) : "no dwell"}</span>
              {hoverVisits > 1 ? <span>· visited {hoverVisits}×</span> : null}
            </>
          ) : (
            <span className="row__muted">Hover a slide · ×N = revisited</span>
          )}
        </div>
      </div>

      <div className="chart__plot chart__plot--slide">
        {Array.from({ length: SLIDE_COUNT }, (_, i) => {
          const seconds = Number(data[String(i)]) || 0;
          const v = Number(visitCounts[String(i)]) || 0;
          const h = (seconds / max) * 100;
          const isHover = hoverIdx === i;
          const revisited = showRevisits && v > 1;
          return (
            <div key={i} className="chart__bar-wrap">
              {revisited ? (
                <span className="chart__bar-badge" title={`Visited ${v}×`}>×{v}</span>
              ) : null}
              <button
                type="button"
                className={`chart__bar${isHover ? " is-hover" : ""}${seconds ? "" : " chart__bar--empty"}`}
                style={{ height: `${Math.max(h, seconds ? 3 : 1.5)}%` }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                onFocus={() => setHoverIdx(i)}
                onBlur={() => setHoverIdx(null)}
                aria-label={`Slide ${i} (${SLIDE_TITLES[i] || ""}): ${seconds ? formatDuration(seconds) : "no dwell"}${revisited ? ", visited " + v + " times" : ""}`}
              />
            </div>
          );
        })}
      </div>

      <div className="chart__xaxis">
        {Array.from({ length: SLIDE_COUNT }, (_, i) =>
          i % tickEvery === 0 || i === SLIDE_COUNT - 1 ? (
            <span key={i} className="chart__xtick" style={{ left: `${((i + 0.5) / SLIDE_COUNT) * 100}%` }}>
              {i}
            </span>
          ) : null
        )}
      </div>
    </div>
  );
}
