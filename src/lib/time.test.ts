import { describe, expect, it, vi } from "vitest";
import type { ItineraryItem } from "../data/types";
import {
  addDaysISO,
  formatDayLabel,
  formatDayShort,
  formatMinutes,
  formatTime,
  defaultTripDate,
  resolveDayItems,
  todayISO,
  zonedWallTimeToUtc,
} from "./time";

function item(overrides: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    id: "1",
    date: "2026-07-25",
    startTime: "09:00",
    endTime: "10:00",
    activity: "Test",
    locationName: "Somewhere",
    category: "Excursion",
    ...overrides,
  };
}

describe("zonedWallTimeToUtc", () => {
  it("resolves a wall-clock time in UTC to the matching UTC instant", () => {
    const date = zonedWallTimeToUtc("2026-07-25", "09:00", "UTC");
    expect(date.toISOString()).toBe("2026-07-25T09:00:00.000Z");
  });

  it("accounts for a non-UTC offset", () => {
    // Tokyo is UTC+9 with no DST, so 09:00 local is 00:00 UTC.
    const date = zonedWallTimeToUtc("2026-07-25", "09:00", "Asia/Tokyo");
    expect(date.toISOString()).toBe("2026-07-25T00:00:00.000Z");
  });

  it("accounts for DST when it's in effect", () => {
    // London is BST (UTC+1) in July.
    const date = zonedWallTimeToUtc("2026-07-25", "09:00", "Europe/London");
    expect(date.toISOString()).toBe("2026-07-25T08:00:00.000Z");
  });

  it("accounts for standard time when DST isn't in effect", () => {
    // London is GMT (UTC+0) in January.
    const date = zonedWallTimeToUtc("2026-01-25", "09:00", "Europe/London");
    expect(date.toISOString()).toBe("2026-01-25T09:00:00.000Z");
  });
});

describe("resolveDayItems", () => {
  it("resolves normal same-day ordering, anchored to the given time zone", () => {
    const items = [item({ id: "a", startTime: "09:00", endTime: "10:00" })];
    const [resolved] = resolveDayItems("2026-07-25", items, "UTC");
    expect(resolved.start.toISOString()).toBe("2026-07-25T09:00:00.000Z");
    expect(resolved.end.toISOString()).toBe("2026-07-25T10:00:00.000Z");
  });

  it("anchors to the trip's time zone rather than the device's", () => {
    const items = [item({ id: "a", startTime: "09:00", endTime: "10:00" })];
    const [resolved] = resolveDayItems("2026-07-25", items, "Europe/London");
    // 09:00 BST (UTC+1) in July.
    expect(resolved.start.toISOString()).toBe("2026-07-25T08:00:00.000Z");
  });

  it("carries subsequent items past midnight when they start earlier than the previous item ended", () => {
    const items = [
      item({ id: "a", startTime: "22:00", endTime: "23:30" }),
      item({ id: "b", startTime: "00:30", endTime: "01:00" }),
    ];
    const [first, second] = resolveDayItems("2026-07-25", items, "UTC");
    expect(first.end.toISOString()).toBe("2026-07-25T23:30:00.000Z");
    expect(second.start.toISOString()).toBe("2026-07-26T00:30:00.000Z");
    expect(second.start.getTime()).toBeGreaterThan(first.end.getTime());
  });

  it("rolls an item's own end past midnight when end is earlier than its start", () => {
    const items = [item({ id: "a", startTime: "18:10", endTime: "06:25" })];
    const [resolved] = resolveDayItems("2026-07-25", items, "UTC");
    expect(resolved.start.toISOString()).toBe("2026-07-25T18:10:00.000Z");
    expect(resolved.end.toISOString()).toBe("2026-07-26T06:25:00.000Z");
  });
});

describe("todayISO", () => {
  it("formats an explicit date using the device's own zone by default", () => {
    expect(todayISO(new Date(2026, 6, 5))).toBe("2026-07-05");
  });

  it("defaults to the current date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 9));
    expect(todayISO()).toBe("2026-01-09");
    vi.useRealTimers();
  });

  it("formats a date as it reads in an explicit time zone", () => {
    // Just before midnight UTC is already the next day in Tokyo (UTC+9).
    const date = new Date("2026-07-24T23:30:00Z");
    expect(todayISO(date, "Asia/Tokyo")).toBe("2026-07-25");
    expect(todayISO(date, "UTC")).toBe("2026-07-24");
  });
});

describe("addDaysISO", () => {
  it("adds days across a month boundary", () => {
    expect(addDaysISO("2026-07-30", 2)).toBe("2026-08-01");
  });
});

describe("formatTime", () => {
  it("formats a Date in an explicit time zone", () => {
    const formatted = formatTime(new Date("2026-07-25T13:05:00Z"), "UTC");
    expect(formatted.toLowerCase()).toContain("1:05");
  });

  it("falls back to the device's own zone when none is given", () => {
    const formatted = formatTime(new Date(2026, 6, 25, 13, 5));
    expect(formatted.toLowerCase()).toContain("1:05");
  });
});

describe("formatDayLabel", () => {
  it("formats a weekday, month, and day", () => {
    const label = formatDayLabel("2026-07-25");
    expect(label).toContain("July");
    expect(label).toContain("25");
  });
});

describe("formatDayShort", () => {
  it("formats a compact month and day", () => {
    const label = formatDayShort("2026-07-25");
    expect(label).toContain("Jul");
    expect(label).toContain("25");
  });
});

describe("defaultTripDate", () => {
  it("returns today when there are no trip dates", () => {
    expect(defaultTripDate([], "2026-07-25")).toBe("2026-07-25");
  });

  it("returns today when today has itinerary items scheduled", () => {
    expect(defaultTripDate(["2026-07-24", "2026-07-25", "2026-07-26"], "2026-07-25")).toBe("2026-07-25");
  });

  it("falls back to the first day when today is before the trip", () => {
    expect(defaultTripDate(["2026-07-24", "2026-07-25"], "2026-01-01")).toBe("2026-07-24");
  });

  it("falls back to the first day, not the last, when today is after the trip", () => {
    expect(defaultTripDate(["2026-07-24", "2026-07-25"], "2026-12-31")).toBe("2026-07-24");
  });

  it("falls back to the first day for a gap day within the range that has no items", () => {
    // 2026-07-25 is between the two trip dates but isn't itself one of them.
    expect(defaultTripDate(["2026-07-24", "2026-07-26"], "2026-07-25")).toBe("2026-07-24");
  });
});

describe("formatMinutes", () => {
  it("formats sub-hour durations as minutes", () => {
    expect(formatMinutes(45)).toBe("45m");
  });

  it("formats exact-hour durations without minutes", () => {
    expect(formatMinutes(120)).toBe("2h");
  });

  it("formats mixed durations as hours and minutes", () => {
    expect(formatMinutes(90)).toBe("1h 30m");
  });
});
