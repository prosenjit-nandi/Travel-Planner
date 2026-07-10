import { formatDayLabel } from "../lib/time";

interface Props {
  date: string;
  dates: string[];
  onChange: (date: string) => void;
  /** Present only when today falls within the trip and isn't already selected. */
  onJumpToday?: () => void;
}

export function DayNav({ date, dates, onChange, onJumpToday }: Props) {
  const idx = dates.indexOf(date);
  const prev = idx > 0 ? dates[idx - 1] : null;
  const next = idx >= 0 && idx < dates.length - 1 ? dates[idx + 1] : null;

  return (
    <div className="day-nav">
      <button disabled={!prev} onClick={prev ? () => onChange(prev) : undefined} aria-label="Previous day">
        ‹
      </button>
      <span className="day-nav-label">{formatDayLabel(date)}</span>
      {onJumpToday && (
        <button className="day-nav-today" onClick={onJumpToday} aria-label="Jump to today">
          Today
        </button>
      )}
      <button disabled={!next} onClick={next ? () => onChange(next) : undefined} aria-label="Next day">
        ›
      </button>
    </div>
  );
}
