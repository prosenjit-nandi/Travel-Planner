import type { ItineraryDataSource, Trip } from "./types";
import { staticTripSource } from "./source";
import { googleSheetTripSource } from "./googleSheet";
import uk2026 from "./trips/uk-2026.json";

const liveSource = googleSheetTripSource({
  id: "uk-2026",
  title: "UK & Scotland Trip 2026",
  timezone: "Europe/London",
  sheetId: "1Debf-8Bn0FiQmmaxNOXouH0e0wsG9UDd1N2o6oorSA8",
  gid: "839733258",
});

const fallbackSource = staticTripSource(uk2026 as Trip);
let lastGood: Trip | null = null;

/**
 * Single swap point for future trips: point this at a different
 * ItineraryDataSource without touching any UI code.
 *
 * Loads live from the Google Sheet each call (App.tsx polls every 10
 * minutes). On failure, falls back to the last successfully fetched trip,
 * or the bundled JSON snapshot on a cold load with no network yet.
 */
export const activeDataSource: ItineraryDataSource = {
  async load() {
    try {
      lastGood = await liveSource.load();
      return lastGood;
    } catch (err) {
      console.warn("Google Sheet fetch failed, using last known itinerary:", err);
      return lastGood ?? fallbackSource.load();
    }
  },
};
