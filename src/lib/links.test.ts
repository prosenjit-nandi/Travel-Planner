import { describe, expect, it } from "vitest";
import type { ItineraryItem } from "../data/types";
import { googleMapsUrl, uberUrl } from "./links";

function item(overrides: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    id: "1",
    date: "2026-07-25",
    startTime: "09:00",
    endTime: "10:00",
    activity: "Test",
    locationName: "",
    category: "Excursion",
    ...overrides,
  };
}

describe("googleMapsUrl", () => {
  it("prefers the address over the location name", () => {
    const url = googleMapsUrl(item({ locationName: "Hotel", address: "123 Main St" }));
    expect(url).toContain(encodeURIComponent("123 Main St"));
  });

  it("falls back to the location name when there is no address", () => {
    const url = googleMapsUrl(item({ locationName: "Covent Garden" }));
    expect(url).toContain(encodeURIComponent("Covent Garden"));
  });

  it("returns null when neither address nor location name is set", () => {
    expect(googleMapsUrl(item({ locationName: "" }))).toBeNull();
  });

  it("returns null when the location name is only whitespace", () => {
    expect(googleMapsUrl(item({ locationName: "   " }))).toBeNull();
  });
});

describe("uberUrl", () => {
  it("builds a deep link with the address as the dropoff", () => {
    const url = uberUrl(item({ locationName: "Hotel", address: "123 Main St" }));
    expect(url).toContain("action=setPickup");
    const params = new URL(url!).searchParams;
    expect(params.get("dropoff[formatted_address]")).toBe("123 Main St");
  });

  it("returns null when there is no usable location", () => {
    expect(uberUrl(item({ locationName: "" }))).toBeNull();
  });
});
