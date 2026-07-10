import { describe, expect, it } from "vitest";
import { groupTripLegs, type DaySummary } from "./tripOverview";

function day(overrides: Partial<DaySummary> & Pick<DaySummary, "date">): DaySummary {
  return { city: undefined, itemCount: 0, categoryCounts: {}, ...overrides };
}

describe("groupTripLegs", () => {
  it("returns an empty array for no days", () => {
    expect(groupTripLegs([])).toEqual([]);
  });

  it("creates one leg per day when cities change", () => {
    const days: DaySummary[] = [
      day({ date: "2026-07-24", city: "London", itemCount: 2, categoryCounts: { Excursion: 2 } }),
      day({ date: "2026-07-25", city: "Edinburgh", itemCount: 3, categoryCounts: { Dining: 3 } }),
    ];
    expect(groupTripLegs(days)).toEqual([
      { city: "London", startDate: "2026-07-24", endDate: "2026-07-24", itemCount: 2, categoryCounts: { Excursion: 2 } },
      { city: "Edinburgh", startDate: "2026-07-25", endDate: "2026-07-25", itemCount: 3, categoryCounts: { Dining: 3 } },
    ]);
  });

  it("merges consecutive days in the same city into one leg", () => {
    const days: DaySummary[] = [
      day({ date: "2026-07-24", city: "London", itemCount: 2, categoryCounts: { Excursion: 2 } }),
      day({ date: "2026-07-25", city: "London", itemCount: 3, categoryCounts: { Dining: 2, Excursion: 1 } }),
      day({ date: "2026-07-26", city: "London", itemCount: 1, categoryCounts: { Transport: 1 } }),
    ];
    expect(groupTripLegs(days)).toEqual([
      {
        city: "London",
        startDate: "2026-07-24",
        endDate: "2026-07-26",
        itemCount: 6,
        categoryCounts: { Excursion: 3, Dining: 2, Transport: 1 },
      },
    ]);
  });

  it("groups consecutive days with an unknown city together", () => {
    const days: DaySummary[] = [
      day({ date: "2026-07-24", city: undefined, itemCount: 1 }),
      day({ date: "2026-07-25", city: undefined, itemCount: 1 }),
    ];
    expect(groupTripLegs(days)).toEqual([
      { city: undefined, startDate: "2026-07-24", endDate: "2026-07-25", itemCount: 2, categoryCounts: {} },
    ]);
  });

  it("does not merge the same city across a non-consecutive gap", () => {
    const days: DaySummary[] = [
      day({ date: "2026-07-24", city: "London", itemCount: 1 }),
      day({ date: "2026-07-25", city: "Edinburgh", itemCount: 1 }),
      day({ date: "2026-07-26", city: "London", itemCount: 1 }),
    ];
    expect(groupTripLegs(days)).toHaveLength(3);
  });

  it("does not mutate the merged-into leg's category counts across merges", () => {
    const days: DaySummary[] = [
      day({ date: "2026-07-24", city: "London", categoryCounts: { Excursion: 1 } }),
      day({ date: "2026-07-25", city: "London", categoryCounts: { Excursion: 1 } }),
    ];
    const [firstLeg] = groupTripLegs(days);
    expect(firstLeg.categoryCounts).toEqual({ Excursion: 2 });
  });
});
