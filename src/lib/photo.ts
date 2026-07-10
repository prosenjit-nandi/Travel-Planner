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
    pages?: Record<
      string,
      {
        title?: string;
        description?: string;
        index?: number;
        thumbnail?: { source: string };
      }
    >;
  };
}

/** Determines if a Wikipedia page represents a person rather than a location/landmark. */
function isPersonPage(title: string, description?: string): boolean {
  const desc = (description || "").toLowerCase();
  const t = title.toLowerCase();

  // Exceptions: if it is explicitly a monument, statue, memorial, park, etc.
  const landmarkKeywords = ["monument", "statue", "memorial", "sculpture", "grave", "tomb", "building", "park", "square", "bridge"];
  if (landmarkKeywords.some((k) => desc.includes(k) || t.includes(k))) {
    return false;
  }

  // Keywords indicating a person's profession or bio
  const personKeywords = [
    "politician", "statesman", "poet", "writer", "prime minister", "monarch",
    "king", "queen", "president", "actor", "artist", "composer", "novelist",
    "soldier", "officer", "general", "historian", "philosopher", "scientist",
    "activist", "person", "biography", "statesperson", "leader", "member",
    "minister", "founder"
  ];
  if (personKeywords.some((k) => desc.includes(k))) {
    return true;
  }

  // Date of birth/death patterns often found in Wikidata descriptions for people
  if (/\b(born|died|\d{4}–\d{4})\b/i.test(desc)) {
    return true;
  }

  return false;
}

/**
 * Finds a small representative photo for a place name via Wikipedia's
 * public search API (free, no key, CORS-enabled). Filters out personal portraits
 * to guarantee that only location images are returned.
 */
export async function photoForQuery(query: string): Promise<string | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;

  const cache = readCache();
  if (key in cache) return cache[key];

  try {
    const url =
      "https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrnamespace=0&gsrlimit=5" +
      `&gsrsearch=${encodeURIComponent(query)}&prop=pageimages|description&piprop=thumbnail&pithumbsize=120&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) {
      cache[key] = null;
      writeCache(cache);
      return null;
    }
    const data = (await res.json()) as WikipediaSearchResponse;
    const pages = data.query?.pages;
    if (!pages) {
      cache[key] = null;
      writeCache(cache);
      return null;
    }

    const sortedPages = Object.values(pages).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    
    let photoUrl: string | null = null;
    for (const page of sortedPages) {
      const title = page.title || "";
      const desc = page.description || "";
      const thumb = page.thumbnail?.source;

      if (thumb) {
        if (!isPersonPage(title, desc)) {
          photoUrl = thumb;
          break;
        }
      }
    }

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

