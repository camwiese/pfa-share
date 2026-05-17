import { describe, it, expect } from "vitest";
import { sharingSignal } from "./sharingSignal.js";

describe("sharingSignal", () => {
  it("returns green for a single fingerprint", () => {
    const sig = sharingSignal([
      { fp_hash: "a", geo: { city: "SF", country: "US" } },
      { fp_hash: "a", geo: { city: "SF", country: "US" } },
    ]);
    expect(sig.level).toBe("green");
  });

  it("returns yellow for two fingerprints in the same city", () => {
    const sig = sharingSignal([
      { fp_hash: "a", geo: { city: "SF", country: "US" } },
      { fp_hash: "b", geo: { city: "SF", country: "US" } },
    ]);
    expect(sig.level).toBe("yellow");
  });

  it("returns unclear for two fingerprints in different cities", () => {
    const sig = sharingSignal([
      { fp_hash: "a", geo: { city: "SF", country: "US" } },
      { fp_hash: "b", geo: { city: "NYC", country: "US" } },
    ]);
    expect(sig.level).toBe("unclear");
  });

  it("returns unclear for three or more fingerprints", () => {
    const sig = sharingSignal([
      { fp_hash: "a" },
      { fp_hash: "b" },
      { fp_hash: "c" },
    ]);
    expect(sig.level).toBe("unclear");
  });

  it("ignores bot sessions and missing fp_hash", () => {
    const sig = sharingSignal([
      { fp_hash: "a" },
      { fp_hash: null },
      { fp_hash: "b", is_bot: true },
    ]);
    expect(sig.level).toBe("green");
  });

  it("handles empty input", () => {
    const sig = sharingSignal([]);
    expect(sig.level).toBe("green");
  });
});
