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
    <div>
      {Array.from({ length: SLIDE_COUNT }, (_, i) => {
        const seconds = Number(data[String(i)]) || 0;
        const pct = (seconds / max) * 100;
        return (
          <div key={i} className="bar-row">
            <div className="bar-row__idx">{i}</div>
            <div>
              <div className="bar-row__title">{SLIDE_TITLES[i] || `Slide ${i}`}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${pct}%`, opacity: seconds ? 1 : 0.15 }} />
              </div>
            </div>
            <div className={`bar-row__time${seconds ? "" : " bar-row__time--empty"}`}>
              {seconds ? formatDuration(seconds) : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
