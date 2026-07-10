import { describe, expect, it } from "vitest";
import { groupTripLegs, type DaySummary, type PlaceEntry } from "./tripOverview";

function place(name: string, category = "Excursion", activity = ""): PlaceEntry {
  return { name, category, activity };
}

function day(overrides: Partial<DaySummary> & Pick<DaySummary, "date">): DaySummary {
  return { city: undefined, itemCount: 0, places: [], ...overrides };
}

describe("groupTripLegs", () => {
  it("returns an empty array for no days", () => {
    expect(groupTripLegs([])).toEqual([]);
  });

  it("creates one leg per day when cities change, keeping each day's own summary", () => {
    const londonDay = day({ date: "2026-07-24", city: "London", itemCount: 2, places: [place("British Museum"), place("The Ivy", "Dining")] });
    const edinburghDay = day({ date: "2026-07-25", city: "Edinburgh", itemCount: 1, places: [place("Edinburgh Castle")] });

    expect(groupTripLegs([londonDay, edinburghDay])).toEqual([
      { city: "London", startDate: "2026-07-24", endDate: "2026-07-24", itemCount: 2, days: [londonDay] },
      { city: "Edinburgh", startDate: "2026-07-25", endDate: "2026-07-25", itemCount: 1, days: [edinburghDay] },
    ]);
  });

  it("merges consecutive days in the same city into one leg, preserving each day separately", () => {
    const day1 = day({ date: "2026-07-24", city: "London", itemCount: 2, places: [place("British Museum")] });
    const day2 = day({ date: "2026-07-25", city: "London", itemCount: 1, places: [place("Big Ben")] });

    expect(groupTripLegs([day1, day2])).toEqual([
      { city: "London", startDate: "2026-07-24", endDate: "2026-07-25", itemCount: 3, days: [day1, day2] },
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

  describe("filling in a missing city", () => {
    it("carries the previous day's known city forward", () => {
      const days: DaySummary[] = [
        day({ date: "2026-07-24", city: "London" }),
        day({ date: "2026-07-25", city: undefined }),
      ];
      expect(groupTripLegs(days)).toEqual([
        {
          city: "London",
          startDate: "2026-07-24",
          endDate: "2026-07-25",
          itemCount: 0,
          days: [
            { date: "2026-07-24", city: "London", itemCount: 0, places: [] },
            { date: "2026-07-25", city: "London", itemCount: 0, places: [] },
          ],
        },
      ]);
    });

    it("carries a later day's known city backward when there's nothing earlier", () => {
      const days: DaySummary[] = [
        day({ date: "2026-07-24", city: undefined }),
        day({ date: "2026-07-25", city: "London" }),
      ];
      const [leg] = groupTripLegs(days);
      expect(leg.city).toBe("London");
      expect(leg.days.map((d) => d.city)).toEqual(["London", "London"]);
    });

    it("leaves the city unknown when no day in the whole trip names one", () => {
      const days: DaySummary[] = [day({ date: "2026-07-24" }), day({ date: "2026-07-25" })];
      const [leg] = groupTripLegs(days);
      expect(leg.city).toBeUndefined();
    });

    it("does not fill across a real change of city", () => {
      const days: DaySummary[] = [
        day({ date: "2026-07-24", city: "London" }),
        day({ date: "2026-07-25", city: undefined }),
        day({ date: "2026-07-26", city: "Edinburgh" }),
      ];
      const legs = groupTripLegs(days);
      // The unknown middle day is filled forward from London, so it joins
      // the London leg rather than splitting the trip into three legs.
      expect(legs.map((l) => l.city)).toEqual(["London", "Edinburgh"]);
      expect(legs[0].days).toHaveLength(2);
    });
  });
});
