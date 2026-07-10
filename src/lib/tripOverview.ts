export interface DaySummary {
  date: string;
  city?: string;
  itemCount: number;
  categoryCounts: Record<string, number>;
}

export interface TripLeg {
  city?: string;
  startDate: string;
  endDate: string;
  itemCount: number;
  categoryCounts: Record<string, number>;
}

function mergeCategoryCounts(
  into: Record<string, number>,
  from: Record<string, number>,
): Record<string, number> {
  const merged = { ...into };
  for (const [category, count] of Object.entries(from)) {
    merged[category] = (merged[category] ?? 0) + count;
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
      last.categoryCounts = mergeCategoryCounts(last.categoryCounts, day.categoryCounts);
    } else {
      legs.push({
        city: day.city,
        startDate: day.date,
        endDate: day.date,
        itemCount: day.itemCount,
        categoryCounts: { ...day.categoryCounts },
      });
    }
  }
  return legs;
}
