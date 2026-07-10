import { useEffect, useState } from "react";
import type { DaySummary } from "../lib/tripOverview";
import { joinNatural } from "../lib/tripOverview";
import { formatDayLabel } from "../lib/time";
import { forecastFor, weatherLabel, type DayForecast } from "../lib/weather";
import { Thumbnail } from "./Thumbnail";

export function DayEntry({ day }: { day: DaySummary }) {
  const [forecast, setForecast] = useState<DayForecast | null>(null);

  useEffect(() => {
    if (!day.city) return;
    let cancelled = false;
    setForecast(null);
    forecastFor(day.city, day.date).then((result) => {
      if (!cancelled) setForecast(result);
    });
    return () => {
      cancelled = true;
    };
  }, [day.city, day.date]);

  const weatherClause = forecast
    ? `${weatherLabel(forecast.code)}, ${Math.round(forecast.minC)}–${Math.round(forecast.maxC)}°C. `
    : "";
  const placesClause =
    day.places.length > 0 ? `Visiting ${joinNatural(day.places)}.` : "No specific stops recorded yet.";

  return (
    <div className="trip-overview-day">
      <p className="trip-overview-day-date">{formatDayLabel(day.date)}</p>
      <p className="trip-overview-narrative">
        {weatherClause}
        {placesClause}
      </p>
      {day.places.length > 0 && (
        <div className="trip-overview-photo-strip">
          {day.places.map((place) => (
            <Thumbnail key={place} query={place} className="trip-overview-place-photo" />
          ))}
        </div>
      )}
    </div>
  );
}
