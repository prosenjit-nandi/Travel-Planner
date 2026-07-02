import type { ItineraryItem } from "../data/types";

function mapQuery(item: ItineraryItem): string | null {
  const query = item.address || item.locationName;
  return query && query.trim() ? query.trim() : null;
}

/** Universal link: opens the Google Maps app on iOS if installed, else the website. */
export function googleMapsUrl(item: ItineraryItem): string | null {
  const query = mapQuery(item);
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Uber's documented universal deep link. Opens the Uber app on iOS if
 * installed (pickup defaults to current location), else falls back to the
 * app store / uber.com.
 */
export function uberUrl(item: ItineraryItem): string | null {
  const query = mapQuery(item);
  if (!query) return null;
  const params = new URLSearchParams({
    action: "setPickup",
    pickup: "my_location",
    "dropoff[formatted_address]": query,
  });
  return `https://m.uber.com/ul/?${params.toString()}`;
}
