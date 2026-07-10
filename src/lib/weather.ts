import type { ItineraryItem } from "../data/types";
import { geocode } from "./geocode";

export interface DayForecast {
  code: number;
  maxC: number;
  minC: number;
  sunrise?: string;
  sunset?: string;
  windSpeedMax?: number;
  precipitationProbabilityMax?: number;
  sunnyPercentage?: number;
  cloudyPercentage?: number;
  rainTimeOfDay?: string;
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

/**
 * The day's primary city — whichever named city most of that day's items
 * agree on, not just the first one mentioned (a day that starts with an
 * airport transfer tagged to the arrival city shouldn't out-vote three
 * excursions tagged to where you actually spent the day).
 */
export function cityForDay(items: ItineraryItem[]): string | undefined {
  const counts = new Map<string, number>();
  for (const item of items) {
    const city = item.city?.trim();
    if (city) counts.set(city, (counts.get(city) ?? 0) + 1);
  }

  let best: string | undefined;
  let bestCount = 0;
  for (const [city, count] of counts) {
    if (count > bestCount) {
      best = city;
      bestCount = count;
    }
  }
  return best;
}

function calculateRainTime(hourlyTime: string[], hourlyPrecipitation: number[]): string {
  const rainHours: number[] = [];
  for (let i = 0; i < hourlyPrecipitation.length; i++) {
    if (hourlyPrecipitation[i] >= 0.1) {
      const timeStr = hourlyTime[i];
      const match = timeStr.match(/T(\d{2}):/);
      if (match) {
        rainHours.push(parseInt(match[1], 10));
      } else {
        rainHours.push(i);
      }
    }
  }

  if (rainHours.length === 0) {
    return "No rain expected";
  }

  const periods = new Set<string>();
  for (const hour of rainHours) {
    if (hour >= 6 && hour < 12) periods.add("Morning");
    else if (hour >= 12 && hour < 18) periods.add("Afternoon");
    else if (hour >= 18 && hour < 24) periods.add("Evening");
    else periods.add("Night");
  }
  const periodsList = Array.from(periods).join(", ");

  const ranges: string[] = [];
  let start = rainHours[0];
  let prev = rainHours[0];

  for (let i = 1; i < rainHours.length; i++) {
    const curr = rainHours[i];
    if (curr === prev + 1) {
      prev = curr;
    } else {
      ranges.push(`${formatHour(start)}–${formatHour(prev + 1)}`);
      start = curr;
      prev = curr;
    }
  }
  ranges.push(`${formatHour(start)}–${formatHour(prev + 1)}`);

  return `${periodsList} (${ranges.join(", ")})`;
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
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
  if (cacheKey in cache) {
    const cached = cache[cacheKey];
    if (cached && cached.sunrise !== undefined) {
      return cached;
    }
  }

  const point = await geocode(city);
  if (!point) return null;

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,wind_speed_10m_max,precipitation_probability_max` +
      `&hourly=cloud_cover,precipitation,precipitation_probability&timezone=auto` +
      `&start_date=${dateStr}&end_date=${dateStr}&models=gfs_seamless`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      daily?: {
        weathercode?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        sunrise?: string[];
        sunset?: string[];
        wind_speed_10m_max?: number[];
        precipitation_probability_max?: number[];
      };
      hourly?: {
        time?: string[];
        cloud_cover?: number[];
        precipitation?: number[];
        precipitation_probability?: number[];
      };
    };
    const code = data.daily?.weathercode?.[0];
    const maxC = data.daily?.temperature_2m_max?.[0];
    const minC = data.daily?.temperature_2m_min?.[0];
    if (code == null || maxC == null || minC == null) return null;

    const sunriseRaw = data.daily?.sunrise?.[0];
    const sunsetRaw = data.daily?.sunset?.[0];
    const windSpeedMax = data.daily?.wind_speed_10m_max?.[0];
    const precipitationProbabilityMax = data.daily?.precipitation_probability_max?.[0];

    const hourlyTime = data.hourly?.time || [];
    const hourlyCloudCover = data.hourly?.cloud_cover || [];
    const hourlyPrecipitation = data.hourly?.precipitation || [];

    const formatTime = (isoStr?: string) => {
      if (!isoStr) return undefined;
      const parts = isoStr.split("T");
      return parts.length >= 2 ? parts[1] : undefined;
    };

    const sunrise = formatTime(sunriseRaw);
    const sunset = formatTime(sunsetRaw);

    let sunnyPercentage = undefined;
    let cloudyPercentage = undefined;
    if (hourlyCloudCover.length > 0) {
      const avgCloud = hourlyCloudCover.reduce((a, b) => a + b, 0) / hourlyCloudCover.length;
      cloudyPercentage = Math.round(avgCloud);
      sunnyPercentage = 100 - cloudyPercentage;
    }

    const rainTimeOfDay = hourlyTime.length > 0 && hourlyPrecipitation.length > 0
      ? calculateRainTime(hourlyTime, hourlyPrecipitation)
      : undefined;

    const forecast: DayForecast = {
      code,
      maxC,
      minC,
      ...(sunrise && { sunrise }),
      ...(sunset && { sunset }),
      ...(windSpeedMax !== undefined && { windSpeedMax }),
      ...(precipitationProbabilityMax !== undefined && { precipitationProbabilityMax }),
      ...(sunnyPercentage !== undefined && { sunnyPercentage }),
      ...(cloudyPercentage !== undefined && { cloudyPercentage }),
      ...(rainTimeOfDay !== undefined && { rainTimeOfDay }),
    };
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
