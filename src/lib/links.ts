import type { ItineraryItem } from "../data/types";

function includesLoose(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

// Placeholder-ish words that show up in the Location column when the sheet
// owner didn't bother filling in a real venue — the actual destination
// often ends up in Notes instead (e.g. Location "Hotel", Notes "The
// Marriott County Hall, Westminster Bridge Rd").
const GENERIC_LOCATION_WORDS = new Set([
  "hotel",
  "accommodation",
  "restaurant",
  "dining",
  "cafe",
  "coffee",
  "lunch",
  "dinner",
  "breakfast",
  "airport",
  "flight",
  "station",
  "transport",
  "taxi",
  "uber",
  "excursion",
  "venue",
  "location",
  "tbd",
  "tba",
  "n/a",
  "unknown",
]);

function isGenericLocationName(value: string, category: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (GENERIC_LOCATION_WORDS.has(normalized)) return true;
  return normalized === category.trim().toLowerCase();
}

/**
 * Builds the Maps/Uber search query for an item.
 *
 * A precise `address` is trusted as-is (it's already unambiguous). Between
 * `locationName` and `notes`, whichever one isn't a generic placeholder like
 * "Hotel" or "Taxi" wins — sheets often leave Location vague and put the
 * actual venue in Notes instead. "Waterloo Station" or "The Ivy" resolve to
 * a same-named place elsewhere unless the search is anchored with
 * city/country context, so those are appended when known and not already
 * implied by the name itself (avoids "Edinburgh Castle, Edinburgh,
 * Edinburgh"-style repeats).
 */
export function locationQuery(item: ItineraryItem, region?: string): string | null {
  const address = item.address?.trim();
  if (address) return address;

  const locationName = item.locationName.trim();
  const notes = item.notes?.trim() ?? "";
  const preferNotes =
    isGenericLocationName(locationName, item.category) &&
    notes.length > 0 &&
    !isGenericLocationName(notes, item.category);

  const name = preferNotes ? notes : locationName;
  if (!name) return null;

  const parts = [name];

  const city = item.city?.trim();
  if (city && !includesLoose(name, city)) parts.push(city);

  const soFar = parts.join(", ");
  if (region && !includesLoose(soFar, region)) parts.push(region);

  return parts.join(", ");
}

/** Universal link: opens the Google Maps app on iOS if installed, else the website. */
export function googleMapsUrl(item: ItineraryItem, region?: string): string | null {
  const query = locationQuery(item, region);
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Uber's documented universal deep link. Opens the Uber app on iOS if
 * installed (pickup defaults to current location), else falls back to the
 * app store / uber.com.
 */
export function uberUrl(item: ItineraryItem, region?: string): string | null {
  const query = locationQuery(item, region);
  if (!query) return null;
  const params = new URLSearchParams({
    action: "setPickup",
    pickup: "my_location",
    "dropoff[formatted_address]": query,
  });
  return `https://m.uber.com/ul/?${params.toString()}`;
}
