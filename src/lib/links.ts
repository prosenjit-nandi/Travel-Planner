import type { ItineraryItem } from "../data/types";

function includesLoose(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Builds the Maps/Uber search query for an item.
 *
 * A precise `address` is trusted as-is (it's already unambiguous). A bare
 * `locationName` isn't — "Waterloo Station" or "The Ivy" resolve to a
 * same-named place elsewhere unless the search is anchored with city/country
 * context, so those are appended when known and not already implied by the
 * name itself (avoids "Edinburgh Castle, Edinburgh, Edinburgh"-style repeats).
 */
export function locationQuery(item: ItineraryItem, region?: string): string | null {
  const address = item.address?.trim();
  if (address) return address;

  const name = item.locationName?.trim();
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
