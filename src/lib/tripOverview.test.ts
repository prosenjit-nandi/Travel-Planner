import { describe, expect, it } from "vitest";
import { groupTripLegs, joinNatural, type DaySummary } from "./tripOverview";

function day(overrides: Partial<DaySummary> & Pick<DaySummary, "date">): DaySummary {
  return { city: undefined, itemCount: 0, places: [], ...overrides };
}

describe("groupTripLegs", () => {
  it("returns an empty array for no days", () => {
    expect(groupTripLegs([])).toEqual([]);
  });

  it("creates one leg per day when cities change", () => {
    const days: DaySummary[] = [
      day({ date: "2026-07-24", city: "London", itemCount: 2, places: ["British Museum", "The Ivy"] }),
      day({ date: "2026-07-25", city: "Edinburgh", itemCount: 1, places: ["Edinburgh Castle"] }),
    ];
    expect(groupTripLegs(days)).toEqual([
      {
        city: "London",
        startDate: "2026-07-24",
        endDate: "2026-07-24",
        itemCount: 2,
        places: ["British Museum", "The Ivy"],
      },
      {
        city: "Edinburgh",
        startDate: "2026-07-25",
        endDate: "2026-07-25",
        itemCount: 1,
        places: ["Edinburgh Castle"],
      },
    ]);
  });

  it("merges consecutive days in the same city into one leg, deduping places", () => {
    const days: DaySummary[] = [
      day({ date: "2026-07-24", city: "London", itemCount: 2, places: ["British Museum", "The Ivy"] }),
      day({ date: "2026-07-25", city: "London", itemCount: 1, places: ["The Ivy", "Big Ben"] }),
    ];
    expect(groupTripLegs(days)).toEqual([
      {
        city: "London",
        startDate: "2026-07-24",
        endDate: "2026-07-25",
        itemCount: 3,
        places: ["British Museum", "The Ivy", "Big Ben"],
      },
    ]);
  });

  it("dedupes places case-insensitively, keeping the first-seen casing", () => {
    const days: DaySummary[] = [
      day({ date: "2026-07-24", city: "London", places: ["The Ivy"] }),
      day({ date: "2026-07-25", city: "London", places: ["the ivy"] }),
    ];
    expect(groupTripLegs(days)[0].places).toEqual(["The Ivy"]);
  });

  it("groups consecutive days with an unknown city together", () => {
    const days: DaySummary[] = [
      day({ date: "2026-07-24", city: undefined, itemCount: 1 }),
      day({ date: "2026-07-25", city: undefined, itemCount: 1 }),
    ];
    expect(groupTripLegs(days)).toEqual([
      { city: undefined, startDate: "2026-07-24", endDate: "2026-07-25", itemCount: 2, places: [] },
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
});

describe("joinNatural", () => {
  it("returns an empty string for no items", () => {
    expect(joinNatural([])).toBe("");
  });

  it("returns the single item as-is", () => {
    expect(joinNatural(["London"])).toBe("London");
  });

  it("joins two items with 'and'", () => {
    expect(joinNatural(["London", "Edinburgh"])).toBe("London and Edinburgh");
  });

  it("joins three or more items with commas and a trailing 'and'", () => {
    expect(joinNatural(["London", "Edinburgh", "Paris"])).toBe("London, Edinburgh, and Paris");
  });
});
