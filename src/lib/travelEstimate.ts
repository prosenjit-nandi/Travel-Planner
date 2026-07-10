import type { ItineraryItem } from "../data/types";
import { locationQuery } from "./links";
import { geocode } from "./geocode";
import { haversineKm, estimateTravel, type TravelEstimate } from "./distance";

/**
 * Estimates travel time from one itinerary item's location to the next's,
 * for a quick "how long to get there" cue on the card. Returns null when
 * there isn't enough information (missing location, unresolvable location,
 * or both items already share the same one).
 */
export async function estimateTimeToNext(
  from: ItineraryItem,
  to: ItineraryItem,
  region?: string,
): Promise<TravelEstimate | null> {
  const fromQuery = locationQuery(from, region);
  const toQuery = locationQuery(to, region);
  if (!fromQuery || !toQuery || fromQuery === toQuery) return null;

  const [fromPoint, toPoint] = await Promise.all([geocode(fromQuery), geocode(toQuery)]);
  if (!fromPoint || !toPoint) return null;

  return estimateTravel(haversineKm(fromPoint, toPoint));
}
