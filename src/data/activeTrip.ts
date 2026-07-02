import type { Trip } from "./types";
import { staticTripSource } from "./source";
import uk2026 from "./trips/uk-2026.json";

/**
 * Single swap point for future trips: drop a new JSON file matching the
 * Trip shape (see ./types.ts) into ./trips/, import it above, and point
 * activeDataSource at it. To pull from a live source instead (Google
 * Sheets, an API, ...), implement ItineraryDataSource and swap it in here
 * without touching any UI code.
 */
export const activeDataSource = staticTripSource(uk2026 as Trip);
