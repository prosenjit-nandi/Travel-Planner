import { useEffect, useState } from "react";
import { isAirportOrFlight, type DaySummary, type PlaceEntry } from "../lib/tripOverview";
import { joinNatural } from "../lib/text";
import { formatDayLabel } from "../lib/time";
import { forecastFor, weatherLabel, type DayForecast } from "../lib/weather";
import { Thumbnail } from "./Thumbnail";

/** Maps a place entry to a human-readable action prefix. */
function placeLabel(entry: PlaceEntry): string {
  const cat = entry.category.trim().toLowerCase();
  if (cat === "accommodation" || cat === "accomodation") return "Staying at";
  if (cat === "dining" || cat === "restaurant" || cat === "cafe") return "Dining at";
  if (isAirportOrFlight(entry.name, entry.activity)) return "Flying from";
  return "Visiting";
}

/**
 * Groups place entries by their label ("Visiting", "Staying at", etc.)
 * and returns ordered clauses like ["Visiting X and Y", "Staying at Z"].
 */
function placeClauses(places: PlaceEntry[]): string[] {
  const buckets = new Map<string, string[]>();
  for (const p of places) {
    const label = placeLabel(p);
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label)!.push(p.name);
  }
  return Array.from(buckets.entries()).map(([label, names]) => `${label} ${joinNatural(names)}`);
}

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

  const clauses = placeClauses(day.places);
  const placesText =
    clauses.length > 0
      ? clauses.join(". ") + "."
      : "No specific stops recorded yet.";

  return (
    <div className="trip-overview-day">
      <p className="trip-overview-day-date">{formatDayLabel(day.date)}</p>
      <p className="trip-overview-narrative">
        {weatherClause}
        {placesText}
      </p>
      {day.places.length > 0 && (
        <div className="trip-overview-photo-strip">
          {day.places.map((place) => (
            <Thumbnail key={place.name} query={place.name} className="trip-overview-place-photo" />
          ))}
        </div>
      )}
    </div>
  );
}
