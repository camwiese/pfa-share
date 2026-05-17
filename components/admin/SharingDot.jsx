"use client";

const COLORS = {
  green: "#3a8a4d",
  yellow: "#d6a82d",
  unclear: "#9e9d92",
};

export default function SharingDot({ signal, size = 10 }) {
  if (!signal) return null;
  const color = COLORS[signal.level] || COLORS.unclear;
  return (
    <span
      title={signal.label}
      aria-label={signal.label}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        verticalAlign: "middle",
      }}
    />
  );
}
