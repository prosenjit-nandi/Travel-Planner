import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ItineraryItem } from "../data/types";
import { photoFor } from "./photo";

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

function mockSearchResponse(pages: Record<string, unknown> | undefined, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(pages ? { query: { pages } } : {}),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("photoFor", () => {
  it("returns null without fetching when there's no usable location", async () => {
    const fetchMock = mockSearchResponse(undefined);
    const result = await photoFor(item({ locationName: "" }));
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the top result's thumbnail", async () => {
    mockSearchResponse({
      123: { title: "British Museum", thumbnail: { source: "https://upload.wikimedia.org/museum.jpg" } },
    });
    const result = await photoFor(item({ locationName: "British Museum" }));
    expect(result).toBe("https://upload.wikimedia.org/museum.jpg");
  });

  it("returns null and caches the miss when the matched page has no thumbnail", async () => {
    const fetchMock = mockSearchResponse({ 123: { title: "Some Restaurant" } });
    const result = await photoFor(item({ locationName: "Some Restaurant" }));
    expect(result).toBeNull();

    await photoFor(item({ locationName: "Some Restaurant" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when there are no search results at all", async () => {
    mockSearchResponse(undefined);
    const result = await photoFor(item({ locationName: "Asdkjfhaskjdfh Nonexistent Place" }));
    expect(result).toBeNull();
  });

  it("returns null and caches the miss when the response isn't ok", async () => {
    const fetchMock = mockSearchResponse(undefined, false);
    await photoFor(item({ locationName: "Somewhere" }));
    await photoFor(item({ locationName: "Somewhere" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null and does not throw when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const result = await photoFor(item({ locationName: "Somewhere" }));
    expect(result).toBeNull();
  });

  it("caches a hit across calls, only fetching once for the same query", async () => {
    const fetchMock = mockSearchResponse({
      123: { title: "Big Ben", thumbnail: { source: "https://upload.wikimedia.org/bigben.jpg" } },
    });
    await photoFor(item({ locationName: "Big Ben" }));
    await photoFor(item({ locationName: "big ben" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("doesn't throw when persisting the cache fails", async () => {
    mockSearchResponse({
      123: { title: "Big Ben", thumbnail: { source: "https://upload.wikimedia.org/bigben.jpg" } },
    });
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    await expect(photoFor(item({ locationName: "Big Ben" }))).resolves.toBe(
      "https://upload.wikimedia.org/bigben.jpg",
    );
    setItemSpy.mockRestore();
  });

  it("treats a corrupted cache entry as empty rather than throwing", async () => {
    localStorage.setItem("travel-planner:photo-cache", "{not json");
    mockSearchResponse({
      123: { title: "Big Ben", thumbnail: { source: "https://upload.wikimedia.org/bigben.jpg" } },
    });
    const result = await photoFor(item({ locationName: "Big Ben" }));
    expect(result).toBe("https://upload.wikimedia.org/bigben.jpg");
  });
});
