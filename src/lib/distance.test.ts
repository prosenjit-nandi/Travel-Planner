import { describe, expect, it } from "vitest";
import { estimateTravel, haversineKm } from "./distance";

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm({ lat: 51.5, lon: -0.1 }, { lat: 51.5, lon: -0.1 })).toBeCloseTo(0);
  });

  it("computes a known distance between two cities", () => {
    // London to Paris is roughly 344 km as the crow flies.
    const km = haversineKm({ lat: 51.5074, lon: -0.1278 }, { lat: 48.8566, lon: 2.3522 });
    expect(km).toBeGreaterThan(330);
    expect(km).toBeLessThan(360);
  });
});

describe("estimateTravel", () => {
  it("chooses walking for short distances", () => {
    const estimate = estimateTravel(0.5);
    expect(estimate.mode).toBe("walk");
    expect(estimate.minutes).toBeGreaterThan(0);
  });

  it("treats the walking threshold itself as walkable", () => {
    expect(estimateTravel(1.5).mode).toBe("walk");
  });

  it("chooses driving beyond the walking threshold", () => {
    const estimate = estimateTravel(5);
    expect(estimate.mode).toBe("drive");
    expect(estimate.minutes).toBeGreaterThan(0);
  });
});
