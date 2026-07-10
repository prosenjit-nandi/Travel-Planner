/** A unique, meaningful location on a given day, with its itinerary category. */
export interface PlaceEntry {
  name: string;
  category: string;
  /** The row's Activity text — used to disambiguate Transport sub-types (walk, uber, flight, etc.). */
  activity: string;
}

export interface DaySummary {
  date: string;
  city?: string;
  itemCount: number;
/** Unique, resolved destination entries for the day, in itinerary order. */
  places: PlaceEntry[];
}

/** Assigns a priority weight to categories to select the most relevant one for a place. */
export function getCategoryPriority(category: string): number {
  const cat = category.trim().toLowerCase();
  if (cat === "excursion") return 4;
  if (cat === "accommodation" || cat === "accomodation") return 3;
  if (cat === "dining") return 2;
  if (cat === "transport" || cat === "flight") return 1;
  return 0;
}

/** Determines if a transport location represents an airport or flight. */
export function isAirportOrFlight(name: string, activity: string): boolean {
  const combined = `${name} ${activity}`.toLowerCase();
  
  // General keywords can be substring matches
  const keywords = [
    "airport", "terminal", "departure", "flight",
    "heathrow", "gatwick", "stansted", "luton", "city airport"
  ];
  if (keywords.some((k) => combined.includes(k))) {
    return true;
  }

  // Airport codes must match as full words to avoid matching substrings like "edi" in "Edinburgh"
  const codes = ["jfk", "lhr", "edi", "lgw", "stn"];
  return codes.some((code) => {
    const regex = new RegExp(`\\b${code}\\b`, "i");
    return regex.test(combined);
  });
}

const EXCLUDED_WORDS = new Set([
  "london", "edinburgh", "scotland", "england", "united kingdom", "uk", 
  "central london", "city of westminster", "old town", "hidden closes", 
  "souvenir shopping", "leisure travel"
]);

function isGenericOrInstruction(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  // Proper nouns (places, landmarks) must start with an uppercase letter or a digit (e.g., "354 Castlehill")
  const firstChar = trimmed[0];
  if (firstChar === firstChar.toLowerCase() && !/^\d/.test(firstChar)) {
    return true;
  }

  const t = trimmed.toLowerCase();
  if (t.length < 3 || t.length > 55) return true;
  if (EXCLUDED_WORDS.has(t)) return true;
  
  // Headers/instructions ending in colon
  if (t.includes(":")) return true;
  
  // Timeline / time patterns
  if (/\b\d{1,2}:\d{2}\b/.test(t) || /\b(am|pm)\b/.test(t)) return true;

  // Block common instruction/action verbs at the start of a sentence
  if (/^(bring|eat|ask|get|go|take|return|checkout|check|book|reserve|meet|walk|stroll|hike|travel|grab|collect)\b/i.test(t)) {
    return true;
  }
  
  // Instructions or non-location terms
  const patterns = [
    "best", "spot", "viewing", "note", "flow", "tips", "important", "warning",
    "timeline", "suggested", "check", "checkout", "reserve", "reservation",
    "need", "must", "cost", "price", "ticket", "book", "tour", "timeline",
    "includes", "including", "explore", "exploring", "visit", "visiting",
    "lunch", "dinner", "breakfast", "brunch", "coffee", "drink", "food",
    "hotel", "stay", "accommodation", "airport", "flight", "return", "travel"
  ];
  return patterns.some((p) => t.includes(p));
}


/** Parses notes to extract distinct sightseeing destinations/sub-locations. */
export function extractSubLocations(notes?: string): string[] {
  if (!notes) return [];
  const subLocations: string[] = [];
  const lines = notes.split("\n");
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // Check if it is a comma-separated list of items on a single line
    let segments = [trimmedLine];
    if (trimmedLine.includes(",") && !trimmedLine.includes(":") && !/\b\d{1,2}:\d{2}\b/.test(trimmedLine)) {
      segments = trimmedLine.split(",").map(s => s.trim());
    }
    
    for (let seg of segments) {
      // Strip bullets and list numbers at the start
      seg = seg.replace(/^[•\t\*\-\s\d\.\)]+/, "").trim();
      
      // Clean up common parenthetical suffixes
      seg = seg
        .replace(/\(pass by\)/i, "")
        .replace(/\(need reservation\)/i, "")
        .replace(/\(convenient during.*\)/i, "")
        .replace(/\(great light\)/i, "")
        .replace(/\(excellent Scottish.*\)/i, "")
        .replace(/\?+/g, "") // strip question marks
        .trim();
        
      if (!isGenericOrInstruction(seg)) {
        subLocations.push(seg);
      }
    }
  }
  
  return [...new Set(subLocations)];
}


export interface TripLeg {
  city?: string;
  startDate: string;
  endDate: string;
  itemCount: number;
  /** The individual days that make up this leg, in order. */
  days: DaySummary[];
}

/**
 * Carries a known city forward/backward across days that have no item
 * tagged with one — e.g. a hotel-checkout day with no City column filled
 * in shouldn't read as "location unknown" when it's sandwiched between two
 * days that are clearly still in the same city.
 */
function fillMissingCities(days: DaySummary[]): DaySummary[] {
  const filled = days.map((d) => ({ ...d }));

  let lastKnown: string | undefined;
  for (const day of filled) {
    if (day.city) lastKnown = day.city;
    else if (lastKnown) day.city = lastKnown;
  }

  let nextKnown: string | undefined;
  for (let i = filled.length - 1; i >= 0; i--) {
    if (filled[i].city) nextKnown = filled[i].city;
    else if (nextKnown) filled[i].city = nextKnown;
  }

  return filled;
}

/**
 * Collapses consecutive same-city days into a single leg (after filling in
 * any days missing a city), so a multi-city trip reads as "London (Jul
 * 24-26), Edinburgh (Jul 27-29)" instead of a flat day-by-day list that
 * repeats the same city over and over. Each leg keeps its individual days
 * for a day-by-day narrative.
 */
export function groupTripLegs(rawDays: DaySummary[]): TripLeg[] {
  const days = fillMissingCities(rawDays);
  const legs: TripLeg[] = [];
  for (const day of days) {
    const last = legs[legs.length - 1];
    if (last && last.city === day.city) {
      last.endDate = day.date;
      last.itemCount += day.itemCount;
      last.days.push(day);
    } else {
      legs.push({
        city: day.city,
        startDate: day.date,
        endDate: day.date,
        itemCount: day.itemCount,
        days: [day],
      });
    }
  }
  return legs;
}
