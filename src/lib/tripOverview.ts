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
  /** The individual days that make up this leg, in order. */
  days: DaySummary[];
}

/**
 * Carries a known city forward/backward across days that have no item
 * tagged with one — e.g. a hotel-checkout day with no City column filled
 * in shouldn't read as "location unknown" when it's sandwiched between two
 * days that are clearly still in the same city.
 */
function fillMissingCities(days: DaySummary[]): DaySummary[] {
  const filled = days.map((d) => ({ ...d }));

  let lastKnown: string | undefined;
  for (const day of filled) {
    if (day.city) lastKnown = day.city;
    else if (lastKnown) day.city = lastKnown;
  }

  let nextKnown: string | undefined;
  for (let i = filled.length - 1; i >= 0; i--) {
    if (filled[i].city) nextKnown = filled[i].city;
    else if (nextKnown) filled[i].city = nextKnown;
  }

  return filled;
}

/**
 * Collapses consecutive same-city days into a single leg (after filling in
 * any days missing a city), so a multi-city trip reads as "London (Jul
 * 24-26), Edinburgh (Jul 27-29)" instead of a flat day-by-day list that
 * repeats the same city over and over. Each leg keeps its individual days
 * for a day-by-day narrative.
 */
export function groupTripLegs(rawDays: DaySummary[]): TripLeg[] {
  const days = fillMissingCities(rawDays);
  const legs: TripLeg[] = [];
  for (const day of days) {
    const last = legs[legs.length - 1];
    if (last && last.city === day.city) {
      last.endDate = day.date;
      last.itemCount += day.itemCount;
      last.days.push(day);
    } else {
      legs.push({
        city: day.city,
        startDate: day.date,
        endDate: day.date,
        itemCount: day.itemCount,
        days: [day],
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
