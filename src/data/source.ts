import type { ItineraryDataSource, Trip } from "./types";

/**
 * Wraps a plain Trip object (e.g. imported from JSON) as a data source.
 * Swap in a different loader (fetch from Google Sheets, an API, etc.) later
 * by implementing ItineraryDataSource without touching any UI code.
 */
export function staticTripSource(trip: Trip): ItineraryDataSource {
  return {
    async load() {
      return trip;
    },
  };
}
