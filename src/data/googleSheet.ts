import type { ItineraryDataSource, ItineraryItem, Trip } from "./types";
import { parseCsv } from "./csv";

// Typos in the sheet's Category column that should map to a known Category.
const CATEGORY_FIXES: Record<string, string> = {
  Accomodation: "Accommodation",
};

function sheetCsvUrl(sheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
}

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
  const categoryIdx = col("Category");
  const notesIdx = col("Notes");

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

    const seq = (seqByDate.get(date) ?? 0) + 1;
    seqByDate.set(date, seq);

    items.push({
      id: `${date}-${seq}`,
      date,
      startTime,
      endTime,
      activity,
      locationName: cells[locationIdx]?.trim() ?? "",
      category,
      ...(notes ? { notes } : {}),
    });
  }

  return items;
}

export interface GoogleSheetTripConfig {
  id: string;
  title: string;
  timezone: string;
  sheetId: string;
  gid: string;
}

/**
 * Loads a Trip from a Google Sheet published for public viewing, via the
 * gviz CSV export (no API key needed, but the sheet must be shared as
 * "Anyone with the link can view").
 */
export function googleSheetTripSource(config: GoogleSheetTripConfig): ItineraryDataSource {
  return {
    async load(): Promise<Trip> {
      const res = await fetch(sheetCsvUrl(config.sheetId, config.gid));
      if (!res.ok) {
        throw new Error(`Failed to fetch sheet: ${res.status} ${res.statusText}`);
      }
      const rows = parseCsv(await res.text());
      return {
        id: config.id,
        title: config.title,
        timezone: config.timezone,
        items: rowsToItems(rows),
      };
    },
  };
}
