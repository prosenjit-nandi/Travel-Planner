import type { ItineraryDataSource, ItineraryItem, Trip } from "./types";

// Typos in the sheet's Category column that should map to a known Category.
const CATEGORY_FIXES: Record<string, string> = {
  Accomodation: "Accommodation",
};

/** "7/24/2026" -> "2026-07-24" */
function parseSheetDate(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, m, d, y] = match;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** "1:15:00 PM" -> "13:15" */
function parseSheetTime(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (!match) return null;
  const [, h, m, period] = match;
  let hour = Number(h) % 12;
  if (period.toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${m}`;
}

function rowsToItems(rows: string[][]): ItineraryItem[] {
  const [header, ...body] = rows;
  const col = (name: string) => header.indexOf(name);

  const dateIdx = col("Date");
  const startIdx = col("Start Time");
  const endIdx = col("End Time");
  const activityIdx = col("Activity");
  const locationIdx = col("Location");
  const cityIdx = col("City");
  const categoryIdx = col("Category");
  const notesIdx = col("Notes");
  const confirmationIdx = col("Confirmation");

  const seqByDate = new Map<string, number>();
  const items: ItineraryItem[] = [];

  for (const cells of body) {
    const rawDate = cells[dateIdx]?.trim() ?? "";
    const activity = cells[activityIdx]?.trim() ?? "";
    // Blank rows and the sheet's trailing cost-totals row have no date/activity.
    if (!rawDate || !activity) continue;

    const date = parseSheetDate(rawDate);
    const startTime = parseSheetTime(cells[startIdx] ?? "");
    const endTime = parseSheetTime(cells[endIdx] ?? "");
    if (!date || !startTime || !endTime) continue;

    const rawCategory = cells[categoryIdx]?.trim() ?? "";
    const category = CATEGORY_FIXES[rawCategory] ?? rawCategory;
    const notes = cells[notesIdx]?.trim();
    const city = cells[cityIdx]?.trim();
    const confirmationNumber = cells[confirmationIdx]?.trim();

    const seq = (seqByDate.get(date) ?? 0) + 1;
    seqByDate.set(date, seq);

    items.push({
      id: `${date}-${seq}`,
      date,
      startTime,
      endTime,
      activity,
      locationName: cells[locationIdx]?.trim() ?? "",
      ...(city ? { city } : {}),
      category,
      ...(notes ? { notes } : {}),
      ...(confirmationNumber ? { confirmationNumber } : {}),
    });
  }

  return items;
}

export interface GoogleSheetTripConfig {
  id: string;
  title: string;
  timezone: string;
  /** Country/region used to disambiguate Maps/Uber queries; see Trip.region. */
  region?: string;
  /** Same-origin proxy endpoint (a Cloudflare Pages Function) that holds the
   * Google service-account credentials and returns { values: string[][] }
   * for the sheet. The sheet itself is never shared publicly. */
  endpoint: string;
  token: string;
}

export function googleSheetTripSource(config: GoogleSheetTripConfig): ItineraryDataSource {
  return {
    async load(): Promise<Trip> {
      const res = await fetch(config.endpoint, {
        headers: { "x-itinerary-token": config.token },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch itinerary: ${res.status} ${res.statusText}`);
      }
      const { values } = (await res.json()) as { values: string[][] };
      return {
        id: config.id,
        title: config.title,
        timezone: config.timezone,
        region: config.region,
        items: rowsToItems(values),
      };
    },
  };
}
