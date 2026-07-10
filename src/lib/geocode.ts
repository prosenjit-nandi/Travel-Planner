export interface GeoPoint {
  lat: number;
  lon: number;
}

const STORAGE_KEY = "travel-planner:geocode-cache";

function readCache(): Record<string, GeoPoint | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, GeoPoint | null>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or unavailable (e.g. private browsing) — cache is best-effort.
  }
}

/**
 * Nominatim's usage policy asks for requests to be sequential rather than
 * parallel. A day view can mount several cards at once (each wanting a
 * geocode for its own and its neighbor's location), so calls are chained
 * through this queue instead of firing concurrently. Real throttling isn't
 * necessary on top of that given this app's request volume — a handful of
 * lookups per day view, then cached forever.
 */
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/**
 * Resolves a free-text place query to coordinates via OpenStreetMap's
 * Nominatim, a free geocoder that needs no API key. Results are cached
 * indefinitely in localStorage since a venue's coordinates don't change,
 * which keeps repeat lookups — and the app's request volume against a
 * shared public service — to a minimum.
 */
export async function geocode(query: string): Promise<GeoPoint | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;

  const cache = readCache();
  if (key in cache) return cache[key];

  try {
    const point = await enqueue(async () => {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
      );
      if (!res.ok) return null;
      const results = (await res.json()) as Array<{ lat: string; lon: string }>;
      return results[0] ? { lat: Number(results[0].lat), lon: Number(results[0].lon) } : null;
    });
    cache[key] = point;
    writeCache(cache);
    return point;
  } catch {
    return null;
  }
}
