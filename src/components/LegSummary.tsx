import type { TripLeg } from "../lib/tripOverview";
import { formatDayShort } from "../lib/time";
import { DayEntry } from "./DayEntry";
import { Thumbnail } from "./Thumbnail";

interface Props {
  leg: TripLeg;
  /** Shown as the chapter heading when no day in this leg has a known city. */
  fallbackLabel?: string;
}

function rangeLabel(leg: TripLeg): string {
  if (leg.startDate === leg.endDate) return formatDayShort(leg.startDate);
  return `${formatDayShort(leg.startDate)} – ${formatDayShort(leg.endDate)}`;
}

function nightsLabel(leg: TripLeg): string | null {
  const [y1, m1, d1] = leg.startDate.split("-").map(Number);
  const [y2, m2, d2] = leg.endDate.split("-").map(Number);
  const nights = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
  if (nights <= 0) return null;
  return `${nights} night${nights === 1 ? "" : "s"}`;
}

export function LegSummary({ leg, fallbackLabel }: Props) {
  const nights = nightsLabel(leg);
  const heading = leg.city ?? fallbackLabel ?? "This trip";

  return (
    <li>
      <section className="trip-overview-leg">
        {leg.city && <Thumbnail query={leg.city} className="trip-overview-thumbnail" />}
        <div className="trip-overview-body">
          <h3 className="trip-overview-city">{heading}</h3>
          <p className="trip-overview-dates">
            {rangeLabel(leg)}
            {nights && <> · {nights}</>}
          </p>
          {leg.days.map((day) => (
            <DayEntry key={day.date} day={day} />
          ))}
        </div>
      </section>
    </li>
  );
}
