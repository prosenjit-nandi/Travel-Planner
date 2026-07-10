import { useEffect, useState } from "react";
import { isAirportOrFlight, type DaySummary, type PlaceEntry } from "../lib/tripOverview";
import { joinNatural } from "../lib/text";
import { formatDayLabel } from "../lib/time";
import { forecastFor, weatherLabel, type DayForecast } from "../lib/weather";
import { Thumbnail } from "./Thumbnail";

/** Maps a place entry to a human-readable action prefix for non-airport locations. */
function placeLabel(entry: PlaceEntry): string {
  const cat = entry.category.trim().toLowerCase();
  if (cat === "accommodation" || cat === "accomodation") return "Staying at";
  if (cat === "dining" || cat === "restaurant" || cat === "cafe") return "Dining at";
  return "Visiting";
}

/**
 * Groups place entries by their label and returns ordered clauses.
 * Visiting places go first, hotels (Staying at) go last.
 * Flight entries are detected and formatted chronologically as "Flying from X to Y".
 */
function placeClauses(places: PlaceEntry[]): string[] {
  const airportEntries = places.filter((p) => isAirportOrFlight(p.name, p.activity));
  const nonAirportEntries = places.filter((p) => !isAirportOrFlight(p.name, p.activity));

  const buckets = new Map<string, string[]>();
  for (const p of nonAirportEntries) {
    const label = placeLabel(p);
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label)!.push(p.name);
  }

  const clauses: string[] = [];

  // 1. Visiting (Excursions / Sights) - First
  const visitingNames = buckets.get("Visiting") || [];
  if (visitingNames.length > 0) {
    clauses.push(`Visiting ${joinNatural(visitingNames)}`);
  }

  // 2. Dining at
  const diningNames = buckets.get("Dining at") || [];
  if (diningNames.length > 0) {
    clauses.push(`Dining at ${joinNatural(diningNames)}`);
  }

  // 3. Flying from / into
  if (airportEntries.length === 2) {
    clauses.push(`Flying from ${airportEntries[0].name} to ${airportEntries[1].name}`);
  } else if (airportEntries.length === 1) {
    const p = airportEntries[0];
    const combined = `${p.name} ${p.activity}`.toLowerCase();
    const isArrival = ["arrive", "arrival", "incoming", "landing", "into"].some((kw) => combined.includes(kw));
    const verb = isArrival ? "Flying into" : "Flying from";
    clauses.push(`${verb} ${p.name}`);
  } else if (airportEntries.length > 2) {
    const names = airportEntries.map((p) => p.name);
    clauses.push(`Flying from ${joinNatural(names)}`);
  }

  // 4. Staying at (Hotels / Accommodation) - Last
  const stayingNames = buckets.get("Staying at") || [];
  if (stayingNames.length > 0) {
    clauses.push(`Staying at ${joinNatural(stayingNames)}`);
  }

  // Catch-all for any other unexpected labels
  for (const [label, names] of buckets.entries()) {
    if (label !== "Visiting" && label !== "Dining at" && label !== "Staying at") {
      clauses.push(`${label} ${joinNatural(names)}`);
    }
  }

  return clauses;
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
