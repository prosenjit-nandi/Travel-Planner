export interface DaySummary {
  date: string;
  city?: string;
  itemCount: number;
  /** Resolved destination names for the day's items, in itinerary order. */
  places: string[];
}

export interface TripLeg {
  city?: string;
  startDate: string;
  endDate: string;
  itemCount: number;
  /** Deduped (case-insensitive) destination names across the leg, first-seen order. */
  places: string[];
}

function mergePlaces(into: string[], from: string[]): string[] {
  const seen = new Set(into.map((p) => p.toLowerCase()));
  const merged = [...into];
  for (const place of from) {
    const key = place.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(place);
    }
  }
  return merged;
}

/**
 * Collapses consecutive same-city days into a single leg, so a multi-city
 * trip reads as "London (Jul 24-26), Edinburgh (Jul 27-29)" instead of a
 * flat day-by-day list that repeats the same city over and over.
 */
export function groupTripLegs(days: DaySummary[]): TripLeg[] {
  const legs: TripLeg[] = [];
  for (const day of days) {
    const last = legs[legs.length - 1];
    if (last && last.city === day.city) {
      last.endDate = day.date;
      last.itemCount += day.itemCount;
      last.places = mergePlaces(last.places, day.places);
    } else {
      legs.push({
        city: day.city,
        startDate: day.date,
        endDate: day.date,
        itemCount: day.itemCount,
        places: mergePlaces([], day.places),
      });
    }
  }
  return legs;
}

/** "A" · "A and B" · "A, B, and C" — for reading a list out as prose. */
export function joinNatural(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
