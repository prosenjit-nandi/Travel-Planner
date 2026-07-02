import type { DayStatus } from "../lib/schedule";
import { formatMinutes, formatTime } from "../lib/time";

export function StatusBanner({ status }: { status: DayStatus }) {
  switch (status.kind) {
    case "no-items":
      return <div className="status-banner status-neutral">No itinerary items for this day.</div>;

    case "before-day":
      return (
        <div className="status-banner status-neutral">
          Day starts at {formatTime(status.next.start)} — <strong>{status.next.activity}</strong>
        </div>
      );

    case "on-track":
      return (
        <div className="status-banner status-good">
          <span className="status-label">On schedule</span>
          <span>
            Now: <strong>{status.current.activity}</strong> · ends {formatTime(status.current.end)}
          </span>
        </div>
      );

    case "free":
      return (
        <div className="status-banner status-good">
          <span className="status-label">Free time</span>
          <span>
            Next: <strong>{status.next.activity}</strong> at {formatTime(status.next.start)} (in{" "}
            {formatMinutes(status.minutesUntilNext)})
          </span>
        </div>
      );

    case "leave-now":
      return (
        <div className="status-banner status-late">
          <span className="status-label">
            {status.minutesUntilNext <= 0
              ? "Leave now"
              : `Leave in ${formatMinutes(status.minutesUntilNext)}`}
          </span>
          <span>
            Next: <strong>{status.next.activity}</strong> at {formatTime(status.next.start)}
            {status.next.locationName && <> — {status.next.locationName}</>}
          </span>
        </div>
      );

    case "day-done":
      return (
        <div className="status-banner status-neutral">
          Today's plan wrapped at {formatTime(status.last.end)}.
        </div>
      );
  }
}
