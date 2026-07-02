import type { ResolvedItem } from "./time";

const LEAVE_SOON_MINUTES = 10;

export type DayStatus =
  | { kind: "no-items" }
  | { kind: "before-day"; next: ResolvedItem }
  | { kind: "day-done"; last: ResolvedItem }
  | { kind: "on-track"; current: ResolvedItem; next?: ResolvedItem; minutesUntilNext?: number }
  | { kind: "free"; next: ResolvedItem; previous: ResolvedItem; minutesUntilNext: number }
  | {
      kind: "leave-now";
      next: ResolvedItem;
      current?: ResolvedItem;
      minutesUntilNext: number;
    };

/**
 * Determines where "now" sits relative to a day's resolved schedule.
 *
 * A static plan can't know whether *you've* personally fallen behind (that
 * would need location input) — but it can tell you when your buffer before
 * the next commitment is running out. "leave-now" fires whenever fewer than
 * LEAVE_SOON_MINUTES remain before the next item's start, whether you're
 * still inside the current item or already sitting in a gap.
 */
export function getDayStatus(items: ResolvedItem[], now: Date): DayStatus {
  if (items.length === 0) return { kind: "no-items" };

  const nowT = now.getTime();
  const sorted = [...items].sort((a, b) => a.start.getTime() - b.start.getTime());

  if (nowT < sorted[0].start.getTime()) {
    return { kind: "before-day", next: sorted[0] };
  }

  const last = sorted[sorted.length - 1];
  if (nowT > last.end.getTime()) {
    return { kind: "day-done", last };
  }

  // The most recently started item as of now.
  let currentIdx = -1;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].start.getTime() <= nowT) currentIdx = i;
    else break;
  }
  const current = sorted[currentIdx];
  const next = sorted[currentIdx + 1];
  const inCurrentWindow = nowT <= current.end.getTime();
  const minutesUntilNext = next ? (next.start.getTime() - nowT) / 60_000 : undefined;

  if (next && minutesUntilNext! <= LEAVE_SOON_MINUTES) {
    return {
      kind: "leave-now",
      next,
      current: inCurrentWindow ? current : undefined,
      minutesUntilNext: minutesUntilNext!,
    };
  }

  if (inCurrentWindow) {
    return { kind: "on-track", current, next, minutesUntilNext };
  }

  // Past current item's end, next item's start still comfortably ahead.
  return { kind: "free", next: next!, previous: current, minutesUntilNext: minutesUntilNext! };
}
