import { describe, expect, it } from "vitest";
import { groupTripLegs, type DaySummary } from "./tripOverview";

describe("groupTripLegs", () => {
  it("returns an empty array for no days", () => {
    expect(groupTripLegs([])).toEqual([]);
  });

  it("creates one leg per day when cities change", () => {
    const days: DaySummary[] = [
      { date: "2026-07-24", city: "London", itemCount: 2 },
      { date: "2026-07-25", city: "Edinburgh", itemCount: 3 },
    ];
    expect(groupTripLegs(days)).toEqual([
      { city: "London", startDate: "2026-07-24", endDate: "2026-07-24", itemCount: 2 },
      { city: "Edinburgh", startDate: "2026-07-25", endDate: "2026-07-25", itemCount: 3 },
    ]);
  });

  it("merges consecutive days in the same city into one leg", () => {
    const days: DaySummary[] = [
      { date: "2026-07-24", city: "London", itemCount: 2 },
      { date: "2026-07-25", city: "London", itemCount: 3 },
      { date: "2026-07-26", city: "London", itemCount: 1 },
    ];
    expect(groupTripLegs(days)).toEqual([
      { city: "London", startDate: "2026-07-24", endDate: "2026-07-26", itemCount: 6 },
    ]);
  });

  it("groups consecutive days with an unknown city together", () => {
    const days: DaySummary[] = [
      { date: "2026-07-24", city: undefined, itemCount: 1 },
      { date: "2026-07-25", city: undefined, itemCount: 1 },
    ];
    expect(groupTripLegs(days)).toEqual([
      { city: undefined, startDate: "2026-07-24", endDate: "2026-07-25", itemCount: 2 },
    ]);
  });

  it("does not merge the same city across a non-consecutive gap", () => {
    const days: DaySummary[] = [
      { date: "2026-07-24", city: "London", itemCount: 1 },
      { date: "2026-07-25", city: "Edinburgh", itemCount: 1 },
      { date: "2026-07-26", city: "London", itemCount: 1 },
    ];
    expect(groupTripLegs(days)).toHaveLength(3);
  });
});
