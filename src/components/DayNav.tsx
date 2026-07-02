import { formatDayLabel } from "../lib/time";

interface Props {
  date: string;
  dates: string[];
  onChange: (date: string) => void;
}

export function DayNav({ date, dates, onChange }: Props) {
  const idx = dates.indexOf(date);
  const prev = idx > 0 ? dates[idx - 1] : null;
  const next = idx >= 0 && idx < dates.length - 1 ? dates[idx + 1] : null;

  return (
    <div className="day-nav">
      <button disabled={!prev} onClick={() => prev && onChange(prev)} aria-label="Previous day">
        ‹
      </button>
      <span className="day-nav-label">{formatDayLabel(date)}</span>
      <button disabled={!next} onClick={() => next && onChange(next)} aria-label="Next day">
        ›
      </button>
    </div>
  );
}
