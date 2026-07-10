export interface DaySummary {
  date: string;
  city?: string;
  itemCount: number;
}

export interface TripLeg {
  city?: string;
  startDate: string;
  endDate: string;
  itemCount: number;
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
    } else {
      legs.push({ city: day.city, startDate: day.date, endDate: day.date, itemCount: day.itemCount });
    }
  }
  return legs;
}
