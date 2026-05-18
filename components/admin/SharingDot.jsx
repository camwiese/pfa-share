"use client";

export default function SharingDot({ signal }) {
  if (!signal) return null;
  return (
    <span
      className={`sharing-dot sharing-dot--${signal.level}`}
      title={signal.label}
      aria-label={signal.label}
    />
  );
}
