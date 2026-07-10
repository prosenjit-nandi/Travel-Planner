import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ItineraryItem } from "../data/types";
import { cityForDay, forecastFor, weatherLabel } from "./weather";

vi.mock("./geocode", () => ({
  geocode: vi.fn(),
}));

import { geocode } from "./geocode";

function mockForecastFetch(daily: Record<string, number[]> | null, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(daily ? { daily } : {}),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(geocode).mockResolvedValue({ lat: 51.5, lon: -0.1 });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("forecastFor", () => {
  it("returns null for a date beyond the forecast horizon, without geocoding", async () => {
    const result = await forecastFor("London", isoDaysFromNow(30));
    expect(result).toBeNull();
    expect(geocode).not.toHaveBeenCalled();
  });

  it("returns null for a date in the past", async () => {
    const result = await forecastFor("London", isoDaysFromNow(-1));
    expect(result).toBeNull();
    expect(geocode).not.toHaveBeenCalled();
  });

  it("returns null when the city can't be geocoded", async () => {
    vi.mocked(geocode).mockResolvedValue(null);
    const result = await forecastFor("Nowhere", isoDaysFromNow(1));
    expect(result).toBeNull();
  });

  it("returns null when the forecast response isn't ok", async () => {
    mockForecastFetch(null, false);
    const result = await forecastFor("London", isoDaysFromNow(1));
    expect(result).toBeNull();
  });

  it("returns null when the daily fields are missing", async () => {
    mockForecastFetch({});
    const result = await forecastFor("London", isoDaysFromNow(1));
    expect(result).toBeNull();
  });

  it("returns null and doesn't throw when the forecast fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const result = await forecastFor("London", isoDaysFromNow(1));
    expect(result).toBeNull();
  });

  it("returns the day's forecast and caches it", async () => {
    const fetchMock = mockForecastFetch({
      weathercode: [61],
      temperature_2m_max: [19.4],
      temperature_2m_min: [12.1],
    });
    const date = isoDaysFromNow(1);
    const first = await forecastFor("London", date);
    expect(first).toEqual({ code: 61, maxC: 19.4, minC: 12.1 });

    const second = await forecastFor("London", date);
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(geocode).toHaveBeenCalledTimes(1);
  });

  it("doesn't throw when persisting the forecast cache fails", async () => {
    mockForecastFetch({ weathercode: [0], temperature_2m_max: [20], temperature_2m_min: [10] });
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    await expect(forecastFor("London", isoDaysFromNow(1))).resolves.toEqual({ code: 0, maxC: 20, minC: 10 });
    setItemSpy.mockRestore();
  });

  it("treats a corrupted forecast cache entry as empty rather than throwing", async () => {
    localStorage.setItem("travel-planner:weather-cache", "{not json");
    mockForecastFetch({ weathercode: [0], temperature_2m_max: [20], temperature_2m_min: [10] });
    const result = await forecastFor("London", isoDaysFromNow(1));
    expect(result).toEqual({ code: 0, maxC: 20, minC: 10 });
  });
});

describe("weatherLabel", () => {
  it.each([
    [0, "Clear"],
    [2, "Partly cloudy"],
    [45, "Fog"],
    [55, "Drizzle"],
    [65, "Rain"],
    [75, "Snow"],
    [80, "Showers"],
    [86, "Snow showers"],
    [95, "Thunderstorm"],
  ])("maps code %i to %s", (code, label) => {
    expect(weatherLabel(code)).toBe(label);
  });
});

describe("cityForDay", () => {
  function item(overrides: Partial<ItineraryItem>): ItineraryItem {
    return {
      id: "1",
      date: "2026-07-25",
      startTime: "09:00",
      endTime: "10:00",
      activity: "Test",
      locationName: "Somewhere",
      category: "Excursion",
      ...overrides,
    };
  }

  it("returns the only named city", () => {
    expect(cityForDay([item({}), item({ city: "London" })])).toBe("London");
  });

  it("returns undefined when no item names a city", () => {
    expect(cityForDay([item({}), item({})])).toBeUndefined();
  });

  it("returns whichever city most items agree on, not just the first one mentioned", () => {
    const items = [
      item({ city: "London" }),
      item({ city: "Windsor" }),
      item({ city: "Windsor" }),
    ];
    expect(cityForDay(items)).toBe("Windsor");
  });

  it("breaks a tie by keeping the first city that reached the winning count", () => {
    const items = [item({ city: "London" }), item({ city: "Windsor" })];
    expect(cityForDay(items)).toBe("London");
  });
});
