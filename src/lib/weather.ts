import type { ItineraryItem } from "../data/types";
import { geocode } from "./geocode";

export interface DayForecast {
  code: number;
  maxC: number;
  minC: number;
}

const STORAGE_KEY = "travel-planner:weather-cache";
/** Open-Meteo's free daily forecast only covers roughly two weeks out. */
const FORECAST_HORIZON_DAYS = 15;

function readCache(): Record<string, DayForecast> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, DayForecast>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or unavailable — cache is best-effort.
  }
}

function daysFromToday(dateStr: string): number {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - startOfToday.getTime()) / 86_400_000);
}

/** First itinerary item for the day that names a city, used as the forecast anchor. */
export function cityForDay(items: ItineraryItem[]): string | undefined {
  return items.find((i) => i.city?.trim())?.city;
}

/**
 * Fetches a daily forecast for `city` on `dateStr` ("YYYY-MM-DD") via
 * Open-Meteo (free, no API key, no CORS proxy needed). Returns null when
 * the date is outside the forecast horizon or the city can't be resolved.
 */
export async function forecastFor(city: string, dateStr: string): Promise<DayForecast | null> {
  const daysOut = daysFromToday(dateStr);
  if (daysOut < 0 || daysOut > FORECAST_HORIZON_DAYS) return null;

  const cacheKey = `${city.trim().toLowerCase()}|${dateStr}`;
  const cache = readCache();
  if (cacheKey in cache) return cache[cacheKey];

  const point = await geocode(city);
  if (!point) return null;

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto` +
      `&start_date=${dateStr}&end_date=${dateStr}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      daily?: { weathercode?: number[]; temperature_2m_max?: number[]; temperature_2m_min?: number[] };
    };
    const code = data.daily?.weathercode?.[0];
    const maxC = data.daily?.temperature_2m_max?.[0];
    const minC = data.daily?.temperature_2m_min?.[0];
    if (code === undefined || maxC === undefined || minC === undefined) return null;

    const forecast: DayForecast = { code, maxC, minC };
    cache[cacheKey] = forecast;
    writeCache(cache);
    return forecast;
  } catch {
    return null;
  }
}

/** Collapses Open-Meteo's WMO weather codes into a short display label. */
export function weatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}
