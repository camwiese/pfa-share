// Given an array of a link's sessions, return a sharing-detected signal.
// Pure function — easy to test and tune.

export function sharingSignal(sessions) {
  const real = (sessions || []).filter((s) => !s?.is_bot && s?.fp_hash);
  const fps = new Set(real.map((s) => s.fp_hash));

  if (fps.size <= 1) {
    return {
      level: "green",
      label: `Same person · ${real.length} session${real.length === 1 ? "" : "s"}`,
    };
  }

  if (fps.size === 2) {
    const cities = new Set(real.map((s) => `${s.geo?.city || ""}|${s.geo?.country || ""}`));
    if (cities.size === 1) {
      return { level: "yellow", label: "Likely same person, different device" };
    }
  }

  return { level: "unclear", label: `Possibly shared — ${fps.size} distinct fingerprints` };
}
