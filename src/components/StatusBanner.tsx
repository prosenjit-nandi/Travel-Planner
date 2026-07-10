import type { DayStatus } from "../lib/schedule";
import { formatMinutes, formatTime } from "../lib/time";

interface Props {
  status: DayStatus;
  /** Trip's own IANA time zone; all primary times are shown in this zone. */
  timeZone: string;
  /** When true, also shows the device's own local-equivalent time, for
   * travelers checking the itinerary before their device has switched to
   * the destination zone. */
  showDeviceTime?: boolean;
}

function TimeLabel({ date, timeZone, showDeviceTime }: { date: Date; timeZone: string; showDeviceTime?: boolean }) {
  return (
    <>
      {formatTime(date, timeZone)}
      {showDeviceTime && <span className="device-time"> ({formatTime(date)} local)</span>}
    </>
  );
}

export function StatusBanner({ status, timeZone, showDeviceTime }: Props) {
  switch (status.kind) {
    case "no-items":
      return <div className="status-banner status-neutral">No itinerary items for this day.</div>;

    case "before-day":
      return (
        <div className="status-banner status-neutral">
          Day starts at <TimeLabel date={status.next.start} timeZone={timeZone} showDeviceTime={showDeviceTime} /> —{" "}
          <strong>{status.next.activity}</strong>
        </div>
      );

    case "on-track":
      return (
        <div className="status-banner status-good">
          <span className="status-label">On schedule</span>
          <span>
            Now: <strong>{status.current.activity}</strong> · ends{" "}
            <TimeLabel date={status.current.end} timeZone={timeZone} showDeviceTime={showDeviceTime} />
          </span>
        </div>
      );

    case "free":
      return (
        <div className="status-banner status-good">
          <span className="status-label">Free time</span>
          <span>
            Next: <strong>{status.next.activity}</strong> at{" "}
            <TimeLabel date={status.next.start} timeZone={timeZone} showDeviceTime={showDeviceTime} /> (in{" "}
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
            Next: <strong>{status.next.activity}</strong> at{" "}
            <TimeLabel date={status.next.start} timeZone={timeZone} showDeviceTime={showDeviceTime} />
            {status.next.locationName && <> — {status.next.locationName}</>}
          </span>
        </div>
      );

    case "day-done":
      return (
        <div className="status-banner status-neutral">
          Today's plan wrapped at <TimeLabel date={status.last.end} timeZone={timeZone} showDeviceTime={showDeviceTime} />.
        </div>
      );
  }
}
