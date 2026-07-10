import type { TripLeg } from "../lib/tripOverview";
import { joinNatural } from "../lib/tripOverview";
import { formatDayShort } from "../lib/time";
import { LegSummary } from "./LegSummary";

interface Props {
  legs: TripLeg[];
  totalDays: number;
  /** Trip-level region, shown as a chapter heading when a leg has no known city. */
  fallbackLabel?: string;
}

function introLine(legs: TripLeg[], totalDays: number): string | null {
  if (legs.length === 0) return null;

  const cities = [...new Set(legs.map((leg) => leg.city).filter((c): c is string => Boolean(c)))];
  const dayPart = `${totalDays} day${totalDays === 1 ? "" : "s"}`;
  const cityPart = cities.length > 0 ? ` across ${joinNatural(cities)}` : "";
  const datePart = ` from ${formatDayShort(legs[0].startDate)} to ${formatDayShort(legs[legs.length - 1].endDate)}`;

  return `${dayPart}${cityPart}${datePart}.`;
}

export function TripOverview({ legs, totalDays, fallbackLabel }: Props) {
  const intro = introLine(legs, totalDays);

  return (
    <>
      {intro && <p className="trip-overview-intro">{intro}</p>}
      <ul className="trip-overview">
        {legs.map((leg) => (
          <LegSummary key={leg.startDate} leg={leg} fallbackLabel={fallbackLabel} />
        ))}
      </ul>
    </>
  );
}
