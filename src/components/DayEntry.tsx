import { useEffect, useState } from "react";
import type { DaySummary, PlaceEntry } from "../lib/tripOverview";
import { joinNatural } from "../lib/text";
import { formatDayLabel } from "../lib/time";
import { forecastFor, weatherLabel, type DayForecast } from "../lib/weather";
import { Thumbnail } from "./Thumbnail";

/** Returns true when any of the keywords appear in the haystack (case-insensitive). */
function hasKeyword(haystack: string, ...keywords: string[]): boolean {
  const h = haystack.toLowerCase();
  return keywords.some((k) => h.includes(k));
}

/**
 * Maps a place entry to a human-readable action prefix.
 *
 * For Transport rows we inspect both the location name and the activity text
 * to pick the right mode — an airport row looks very different from a tube
 * or Uber ride even though both share the "Transport" category.
 */
function placeLabel(entry: PlaceEntry): string {
  const cat = entry.category.trim().toLowerCase();
  const combined = `${entry.name} ${entry.activity}`.toLowerCase();

  if (cat === "accommodation") return "Staying at";
  if (cat === "dining" || cat === "restaurant" || cat === "cafe") return "Dining at";

  if (cat === "transport" || cat === "flight") {
    // Airport / flight departure
    if (hasKeyword(combined, "airport", "terminal", "departure", "flight", "heathrow", "gatwick", "stansted", "luton", "city airport")) {
      return "Flying from";
    }
    // Walking
    if (hasKeyword(combined, "walk", "stroll", "on foot", "hike")) {
      return "Walking to";
    }
    // Underground / Tube / Metro / Subway
    if (hasKeyword(combined, "underground", "tube", "metro", "subway", "overground", "dlr", "elizabeth line")) {
      return "Taking the underground from";
    }
    // Train / Rail
    if (hasKeyword(combined, "train", "rail", "eurostar", "intercity", "station")) {
      return "Taking the train from";
    }
    // Ferry / Boat
    if (hasKeyword(combined, "ferry", "boat", "cruise", "ship", "port")) {
      return "Taking a ferry from";
    }
    // Bus / Coach
    if (hasKeyword(combined, "bus", "coach", "national express")) {
      return "Taking a bus from";
    }
    // Rideshare / Taxi
    if (hasKeyword(combined, "uber", "taxi", "cab", "rideshare", "lyft", "bolt")) {
      return "Taking a taxi from";
    }
    // Generic fallback for Transport
    return "Travelling via";
  }

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
