import { describe, expect, it } from "vitest";
import type { ResolvedItem } from "./time";
import { getDayStatus } from "./schedule";

function resolved(overrides: Partial<ResolvedItem> & { start: Date; end: Date }): ResolvedItem {
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

const d = (h: number, m = 0) => new Date(2026, 6, 25, h, m);

describe("getDayStatus", () => {
  it("returns no-items for an empty schedule", () => {
    expect(getDayStatus([], d(10))).toEqual({ kind: "no-items" });
  });

  it("returns before-day when now is earlier than the first item", () => {
    const items = [resolved({ start: d(9), end: d(10) })];
    const status = getDayStatus(items, d(8));
    expect(status).toEqual({ kind: "before-day", next: items[0] });
  });

  it("returns day-done when now is after the last item's end", () => {
    const items = [resolved({ start: d(9), end: d(10) })];
    const status = getDayStatus(items, d(11));
    expect(status).toEqual({ kind: "day-done", last: items[0] });
  });

  it("returns on-track while inside the current item, with a distant next item", () => {
    const items = [
      resolved({ id: "a", start: d(9), end: d(10) }),
      resolved({ id: "b", start: d(11), end: d(12) }),
    ];
    const status = getDayStatus(items, d(9, 30));
    expect(status.kind).toBe("on-track");
    if (status.kind === "on-track") {
      expect(status.current.id).toBe("a");
      expect(status.next?.id).toBe("b");
    }
  });

  it("returns on-track with no next item when the current item is the last one", () => {
    const items = [resolved({ id: "a", start: d(9), end: d(10) })];
    const status = getDayStatus(items, d(9, 30));
    expect(status.kind).toBe("on-track");
    if (status.kind === "on-track") {
      expect(status.next).toBeUndefined();
      expect(status.minutesUntilNext).toBeUndefined();
    }
  });

  it("returns leave-now while still inside the current item and the next starts soon", () => {
    const items = [
      resolved({ id: "a", start: d(9), end: d(10) }),
      resolved({ id: "b", start: d(10, 5), end: d(11) }),
    ];
    const status = getDayStatus(items, d(9, 58));
    expect(status.kind).toBe("leave-now");
    if (status.kind === "leave-now") {
      expect(status.current?.id).toBe("a");
      expect(status.next.id).toBe("b");
    }
  });

  it("returns leave-now with no current item when sitting in a gap before a soon-starting item", () => {
    const items = [
      resolved({ id: "a", start: d(9), end: d(9, 30) }),
      resolved({ id: "b", start: d(9, 40), end: d(11) }),
    ];
    const status = getDayStatus(items, d(9, 35));
    expect(status.kind).toBe("leave-now");
    if (status.kind === "leave-now") {
      expect(status.current).toBeUndefined();
      expect(status.next.id).toBe("b");
    }
  });

  it("returns free when in a gap and the next item is comfortably ahead", () => {
    const items = [
      resolved({ id: "a", start: d(9), end: d(9, 30) }),
      resolved({ id: "b", start: d(11), end: d(12) }),
    ];
    const status = getDayStatus(items, d(10));
    expect(status.kind).toBe("free");
    if (status.kind === "free") {
      expect(status.previous.id).toBe("a");
      expect(status.next.id).toBe("b");
      expect(status.minutesUntilNext).toBe(60);
    }
  });

  it("sorts unordered items before evaluating status", () => {
    const items = [
      resolved({ id: "b", start: d(11), end: d(12) }),
      resolved({ id: "a", start: d(9), end: d(10) }),
    ];
    const status = getDayStatus(items, d(9, 30));
    expect(status.kind).toBe("on-track");
    if (status.kind === "on-track") {
      expect(status.current.id).toBe("a");
    }
  });
});
