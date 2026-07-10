import type { TripLeg } from "../lib/tripOverview";
import { formatDayShort } from "../lib/time";
import { DayWeather } from "./DayWeather";
import { LegThumbnail } from "./LegThumbnail";

interface Props {
  legs: TripLeg[];
  onSelect: (date: string) => void;
}

const CATEGORY_CLASS: Record<string, string> = {
  Transport: "cat-transport",
  Accommodation: "cat-accommodation",
  Dining: "cat-dining",
  Excursion: "cat-excursion",
};

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

export function TripOverview({ legs, onSelect }: Props) {
  return (
    <ul className="trip-overview">
      {legs.map((leg) => {
        const nights = nightsLabel(leg);
        const categories = Object.entries(leg.categoryCounts).sort(([, a], [, b]) => b - a);
        // A plain <button> can't hold block content (the weather/category
        // rows), so this is a div with button semantics applied by hand.
        return (
          <li key={leg.startDate}>
            <div
              className="trip-overview-leg"
              role="button"
              tabIndex={0}
              onClick={() => onSelect(leg.startDate)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                onSelect(leg.startDate);
              }}
            >
              {leg.city && <LegThumbnail query={leg.city} />}
              <div className="trip-overview-body">
                <div className="trip-overview-heading">
                  <span className="trip-overview-city">{leg.city ?? "Location TBD"}</span>
                  <span className="trip-overview-dates">
                    {rangeLabel(leg)}
                    {nights && <> · {nights}</>}
                  </span>
                </div>

                {leg.city && <DayWeather city={leg.city} date={leg.startDate} />}

                <div className="trip-overview-categories">
                  {categories.map(([category, count]) => (
                    <span
                      key={category}
                      className={`trip-overview-cat ${CATEGORY_CLASS[category] ?? "cat-other"}`}
                    >
                      {category} {count}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
