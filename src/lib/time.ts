import type { ItineraryItem } from "../data/types";

export interface ResolvedItem extends ItineraryItem {
  start: Date;
  end: Date;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function localMidnight(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Minutes the given IANA time zone is ahead of UTC at this instant (handles
 * DST automatically, since Intl resolves the offset for this specific date).
 */
function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return (asUtc - date.getTime()) / 60_000;
}

/**
 * Resolves a wall-clock date + time as it reads in `timeZone` to the actual
 * UTC instant it represents — e.g. "09:00" in "Europe/London" is a different
 * absolute moment than "09:00" read in whatever zone the device happens to
 * be in. This is what lets the live-status logic stay correct even when
 * checking the itinerary before departure, while the device is still on the
 * origin time zone.
 */
export function zonedWallTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi);
  const offsetMinutes = tzOffsetMinutes(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offsetMinutes * 60_000);
}

/**
 * Resolves each item's start/end to absolute Date objects, honoring
 * chronological order within the day even when an activity's clock time
 * rolls past midnight (e.g. a hotel check-in logged at 00:00 right after
 * a late-night flight on the same trip-day). Times are anchored to the
 * trip's own time zone, not the device's.
 */
export function resolveDayItems(
  dateStr: string,
  items: ItineraryItem[],
  timeZone: string,
): ResolvedItem[] {
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
      start: zonedMinutesToUtc(dateStr, startAbs, timeZone),
      end: zonedMinutesToUtc(dateStr, endAbs, timeZone),
    });
    prevEndAbs = endAbs;
  }

  return resolved;
}

/** `totalMinutes` may exceed a single day (e.g. carried past midnight). */
function zonedMinutesToUtc(dateStr: string, totalMinutes: number, timeZone: string): Date {
  const dayOffset = Math.floor(totalMinutes / (24 * 60));
  const minuteOfDay = totalMinutes - dayOffset * 24 * 60;
  const shiftedDate = dayOffset === 0 ? dateStr : addDaysISO(dateStr, dayOffset);
  const timeStr = `${pad2(Math.floor(minuteOfDay / 60))}:${pad2(minuteOfDay % 60)}`;
  return zonedWallTimeToUtc(shiftedDate, timeStr, timeZone);
}

/**
 * "YYYY-MM-DD" for `now` as it reads in `timeZone` (falls back to the
 * device's own time zone when none is given).
 */
export function todayISO(now: Date = new Date(), timeZone?: string): string {
  if (timeZone) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  }
  const y = now.getFullYear();
  const m = pad2(now.getMonth() + 1);
  const d = pad2(now.getDate());
  return `${y}-${m}-${d}`;
}

export function addDaysISO(dateStr: string, days: number): string {
  const d = localMidnight(dateStr);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

/** Formats a Date in `timeZone` when given, else the device's own zone. */
export function formatTime(date: Date, timeZone?: string): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone });
}

export function formatDayLabel(dateStr: string): string {
  return localMidnight(dateStr).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Compact "Jul 25" form, for date ranges in the trip overview. */
export function formatDayShort(dateStr: string): string {
  return localMidnight(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
}

/**
 * The date the day view should open on: today itself when today has
 * itinerary items scheduled, otherwise the trip's very first day —
 * never the last, even if today is after the trip has ended. Used both
 * for the initial load and whenever navigation resets back to the day
 * view (e.g. the trip overview's "Back to day" toggle).
 */
export function defaultTripDate(sortedDates: string[], today: string): string {
  if (sortedDates.length === 0) return today;
  return sortedDates.includes(today) ? today : sortedDates[0];
}

export function formatMinutes(totalMinutes: number): string {
  const m = Math.round(totalMinutes);
  const h = Math.floor(Math.abs(m) / 60);
  const rem = Math.abs(m) % 60;
  if (h === 0) return `${rem}m`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}
