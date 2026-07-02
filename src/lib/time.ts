import type { ItineraryItem } from "../data/types";

export interface ResolvedItem extends ItineraryItem {
  start: Date;
  end: Date;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function localMidnight(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Resolves each item's start/end to absolute Date objects, honoring
 * chronological order within the day even when an activity's clock time
 * rolls past midnight (e.g. a hotel check-in logged at 00:00 right after
 * a late-night flight on the same trip-day).
 */
export function resolveDayItems(
  dateStr: string,
  items: ItineraryItem[],
): ResolvedItem[] {
  const base = localMidnight(dateStr);
  let carry = 0;
  let prevEndAbs = -Infinity;
  const resolved: ResolvedItem[] = [];

  for (const item of items) {
    let startAbs = toMinutes(item.startTime) + carry;
    if (startAbs < prevEndAbs) {
      carry += 24 * 60;
      startAbs += 24 * 60;
    }
    let endAbs = toMinutes(item.endTime) + carry;
    if (endAbs < startAbs) {
      endAbs += 24 * 60;
    }

    resolved.push({
      ...item,
      start: addMinutes(base, startAbs),
      end: addMinutes(base, endAbs),
    });
    prevEndAbs = endAbs;
  }

  return resolved;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysISO(dateStr: string, days: number): string {
  const d = localMidnight(dateStr);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatDayLabel(dateStr: string): string {
  return localMidnight(dateStr).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Clamps `today` into the trip's date range: returns today if it falls
 * within the trip, otherwise the closest trip day (first or last). */
export function nearestTripDate(sortedDates: string[], today: string): string {
  if (sortedDates.length === 0) return today;
  if (today <= sortedDates[0]) return sortedDates[0];
  if (today >= sortedDates[sortedDates.length - 1]) return sortedDates[sortedDates.length - 1];
  return today;
}

export function formatMinutes(totalMinutes: number): string {
  const m = Math.round(totalMinutes);
  const h = Math.floor(Math.abs(m) / 60);
  const rem = Math.abs(m) % 60;
  if (h === 0) return `${rem}m`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}
