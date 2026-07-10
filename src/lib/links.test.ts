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

  it("anchors a generic location name with city and region to avoid a same-named place elsewhere", () => {
    const url = googleMapsUrl(
      item({ locationName: "Waterloo Station", city: "London" }),
      "United Kingdom",
    );
    expect(url).toContain(encodeURIComponent("Waterloo Station, London, United Kingdom"));
  });

  it("does not append the region when it's not provided", () => {
    const url = googleMapsUrl(item({ locationName: "Waterloo Station", city: "London" }));
    expect(url).toContain(encodeURIComponent("Waterloo Station, London"));
    expect(url).not.toContain(encodeURIComponent("United Kingdom"));
  });

  it("skips the city when the location name already includes it", () => {
    const url = googleMapsUrl(item({ locationName: "Edinburgh Castle, Edinburgh", city: "Edinburgh" }));
    expect(url).toContain(encodeURIComponent("Edinburgh Castle, Edinburgh"));
    // Only one "Edinburgh" beyond the name itself — not duplicated.
    expect(url).not.toContain(encodeURIComponent("Edinburgh Castle, Edinburgh, Edinburgh"));
  });

  it("skips the region when it's already implied by the name", () => {
    const url = googleMapsUrl(
      item({ locationName: "Big Ben, London, United Kingdom" }),
      "United Kingdom",
    );
    expect(url).not.toContain(
      encodeURIComponent("Big Ben, London, United Kingdom, United Kingdom"),
    );
  });

  it("does not anchor a precise address with city or region", () => {
    const url = googleMapsUrl(
      item({ address: "123 Main St", city: "London" }),
      "United Kingdom",
    );
    expect(url).toContain(encodeURIComponent("123 Main St"));
    expect(url).not.toContain(encodeURIComponent("United Kingdom"));
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

  it("anchors the dropoff with city and region when falling back to location name", () => {
    const url = uberUrl(item({ locationName: "Waterloo Station", city: "London" }), "United Kingdom");
    const params = new URL(url!).searchParams;
    expect(params.get("dropoff[formatted_address]")).toBe("Waterloo Station, London, United Kingdom");
  });
});
