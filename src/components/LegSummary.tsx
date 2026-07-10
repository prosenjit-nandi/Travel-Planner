import { useEffect, useState } from "react";
import type { TripLeg } from "../lib/tripOverview";
import { joinNatural } from "../lib/tripOverview";
import { formatDayShort } from "../lib/time";
import { forecastFor, weatherLabel, type DayForecast } from "../lib/weather";
import { LegThumbnail } from "./LegThumbnail";

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

export function LegSummary({ leg }: { leg: TripLeg }) {
  const [forecast, setForecast] = useState<DayForecast | null>(null);

  useEffect(() => {
    if (!leg.city) return;
    let cancelled = false;
    setForecast(null);
    forecastFor(leg.city, leg.startDate).then((result) => {
      if (!cancelled) setForecast(result);
    });
    return () => {
      cancelled = true;
    };
  }, [leg.city, leg.startDate]);

  const nights = nightsLabel(leg);
  const weatherClause = forecast
    ? `${weatherLabel(forecast.code)}, ${Math.round(forecast.minC)}–${Math.round(forecast.maxC)}°C. `
    : "";
  const placesClause =
    leg.places.length > 0 ? `Visiting ${joinNatural(leg.places)}.` : "No specific stops recorded yet.";

  return (
    <li>
      <article className="trip-overview-leg">
        {leg.city && <LegThumbnail query={leg.city} />}
        <div className="trip-overview-body">
          <h3 className="trip-overview-city">{leg.city ?? "Location TBD"}</h3>
          <p className="trip-overview-dates">
            {rangeLabel(leg)}
            {nights && <> · {nights}</>}
          </p>
          <p className="trip-overview-narrative">
            {weatherClause}
            {placesClause}
          </p>
        </div>
      </article>
    </li>
  );
}
