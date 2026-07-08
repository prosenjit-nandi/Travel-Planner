import { describe, expect, it } from "vitest";
import type { Trip } from "./types";
import { staticTripSource } from "./source";

describe("staticTripSource", () => {
  it("resolves load() with the wrapped trip", async () => {
    const trip: Trip = { id: "t1", title: "Test Trip", timezone: "UTC", items: [] };
    const source = staticTripSource(trip);
    await expect(source.load()).resolves.toBe(trip);
  });
});
