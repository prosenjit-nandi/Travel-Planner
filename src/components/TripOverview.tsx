import type { TripLeg } from "../lib/tripOverview";
import { formatDayShort } from "../lib/time";

interface Props {
  legs: TripLeg[];
  onSelect: (date: string) => void;
}

function rangeLabel(leg: TripLeg): string {
  if (leg.startDate === leg.endDate) return formatDayShort(leg.startDate);
  return `${formatDayShort(leg.startDate)} – ${formatDayShort(leg.endDate)}`;
}

export function TripOverview({ legs, onSelect }: Props) {
  return (
    <ul className="trip-overview">
      {legs.map((leg) => (
        <li key={leg.startDate}>
          <button className="trip-overview-leg" onClick={() => onSelect(leg.startDate)}>
            <span className="trip-overview-city">{leg.city ?? "Location TBD"}</span>
            <span className="trip-overview-dates">{rangeLabel(leg)}</span>
            <span className="trip-overview-count">
              {leg.itemCount} item{leg.itemCount === 1 ? "" : "s"}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
