import { describe, expect, it, vi } from "vitest";
import type { ItineraryItem } from "../data/types";
import {
  addDaysISO,
  formatDayLabel,
  formatMinutes,
  formatTime,
  nearestTripDate,
  resolveDayItems,
  todayISO,
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

describe("resolveDayItems", () => {
  it("resolves normal same-day ordering", () => {
    const items = [item({ id: "a", startTime: "09:00", endTime: "10:00" })];
    const [resolved] = resolveDayItems("2026-07-25", items);
    expect(resolved.start.getHours()).toBe(9);
    expect(resolved.end.getHours()).toBe(10);
  });

  it("carries subsequent items past midnight when they start earlier than the previous item ended", () => {
    const items = [
      item({ id: "a", startTime: "22:00", endTime: "23:30" }),
      item({ id: "b", startTime: "00:30", endTime: "01:00" }),
    ];
    const [first, second] = resolveDayItems("2026-07-25", items);
    expect(first.end.getDate()).toBe(25);
    expect(second.start.getDate()).toBe(26);
    expect(second.start.getHours()).toBe(0);
    expect(second.start.getTime()).toBeGreaterThan(first.end.getTime());
  });

  it("rolls an item's own end past midnight when end is earlier than its start", () => {
    const items = [item({ id: "a", startTime: "18:10", endTime: "06:25" })];
    const [resolved] = resolveDayItems("2026-07-25", items);
    expect(resolved.start.getDate()).toBe(25);
    expect(resolved.end.getDate()).toBe(26);
    expect(resolved.end.getHours()).toBe(6);
  });
});

describe("todayISO", () => {
  it("formats an explicit date", () => {
    expect(todayISO(new Date(2026, 6, 5))).toBe("2026-07-05");
  });

  it("defaults to the current date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 9));
    expect(todayISO()).toBe("2026-01-09");
    vi.useRealTimers();
  });
});

describe("addDaysISO", () => {
  it("adds days across a month boundary", () => {
    expect(addDaysISO("2026-07-30", 2)).toBe("2026-08-01");
  });
});

describe("formatTime", () => {
  it("formats a Date as a locale time string", () => {
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

describe("nearestTripDate", () => {
  it("returns today when there are no trip dates", () => {
    expect(nearestTripDate([], "2026-07-25")).toBe("2026-07-25");
  });

  it("clamps to the first date when today is before the trip", () => {
    expect(nearestTripDate(["2026-07-24", "2026-07-25"], "2026-01-01")).toBe("2026-07-24");
  });

  it("clamps to the last date when today is after the trip", () => {
    expect(nearestTripDate(["2026-07-24", "2026-07-25"], "2026-12-31")).toBe("2026-07-25");
  });

  it("returns today when it falls within the trip range", () => {
    expect(nearestTripDate(["2026-07-24", "2026-07-26"], "2026-07-25")).toBe("2026-07-25");
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
