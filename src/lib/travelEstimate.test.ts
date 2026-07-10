import { afterEach, describe, expect, it, vi } from "vitest";
import type { ItineraryItem } from "../data/types";
import { estimateTimeToNext } from "./travelEstimate";

vi.mock("./geocode", () => ({
  geocode: vi.fn(),
}));

import { geocode } from "./geocode";

afterEach(() => {
  vi.clearAllMocks();
});

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

describe("estimateTimeToNext", () => {
  it("returns null when either item has no usable location", async () => {
    const result = await estimateTimeToNext(item({ locationName: "" }), item({ locationName: "Somewhere Else" }));
    expect(result).toBeNull();
    expect(geocode).not.toHaveBeenCalled();
  });

  it("returns null without geocoding when both items resolve to the same query", async () => {
    const result = await estimateTimeToNext(item({ locationName: "Hotel" }), item({ locationName: "Hotel" }));
    expect(result).toBeNull();
    expect(geocode).not.toHaveBeenCalled();
  });

  it("returns null when a location can't be geocoded", async () => {
    vi.mocked(geocode).mockResolvedValueOnce({ lat: 1, lon: 1 }).mockResolvedValueOnce(null);
    const result = await estimateTimeToNext(item({ locationName: "A" }), item({ locationName: "B" }));
    expect(result).toBeNull();
  });

  it("estimates travel time between two resolvable locations", async () => {
    vi.mocked(geocode).mockImplementation(async (query: string) =>
      query.startsWith("A") ? { lat: 51.5, lon: -0.1 } : { lat: 51.51, lon: -0.1 },
    );
    const result = await estimateTimeToNext(item({ locationName: "A" }), item({ locationName: "B" }));
    expect(result).not.toBeNull();
    expect(result!.minutes).toBeGreaterThan(0);
  });

  it("anchors both location queries with the given region", async () => {
    vi.mocked(geocode).mockResolvedValue({ lat: 1, lon: 1 });
    await estimateTimeToNext(item({ locationName: "A" }), item({ locationName: "B" }), "United Kingdom");
    expect(geocode).toHaveBeenCalledWith("A, United Kingdom");
    expect(geocode).toHaveBeenCalledWith("B, United Kingdom");
  });
});
