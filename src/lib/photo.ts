import type { ItineraryItem } from "../data/types";
import { baseLocation } from "./links";

const STORAGE_KEY = "travel-planner:photo-cache";

function readCache(): Record<string, string | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, string | null>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or unavailable — cache is best-effort.
  }
}

interface WikipediaSearchResponse {
  query?: {
    pages?: Record<string, { thumbnail?: { source: string } }>;
  };
}

/**
 * Finds a small representative photo for a place name via Wikipedia's
 * public search API (free, no key, CORS-enabled) — good for named
 * landmarks, museums, stations, and cities, not for restaurants, hotels, or
 * street addresses that don't have an encyclopedia entry, so a miss (null)
 * is the expected outcome for most day-to-day items. Results (including
 * misses) are cached indefinitely since a place's photo doesn't change.
 *
 * Deliberately takes a bare place name rather than the city/region-anchored
 * `locationQuery` used for Maps/Uber: MediaWiki's full-text search ranks
 * "British Museum, London, United Kingdom" against the "London" page
 * instead of "British Museum" — the extra disambiguating context that helps
 * geocoding actively hurts here.
 */
export async function photoForQuery(query: string): Promise<string | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;

  const cache = readCache();
  if (key in cache) return cache[key];

  try {
    const url =
      "https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrnamespace=0&gsrlimit=1" +
      `&gsrsearch=${encodeURIComponent(query)}&prop=pageimages&piprop=thumbnail&pithumbsize=120&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) {
      cache[key] = null;
      writeCache(cache);
      return null;
    }
    const data = (await res.json()) as WikipediaSearchResponse;
    const pages = data.query?.pages;
    const first = pages ? Object.values(pages)[0] : undefined;
    const photoUrl = first?.thumbnail?.source ?? null;

    cache[key] = photoUrl;
    writeCache(cache);
    return photoUrl;
  } catch {
    return null;
  }
}

/** Convenience wrapper for an itinerary item — see `photoForQuery`. */
export function photoFor(item: ItineraryItem): Promise<string | null> {
  const query = baseLocation(item);
  return query ? photoForQuery(query) : Promise.resolve(null);
}
