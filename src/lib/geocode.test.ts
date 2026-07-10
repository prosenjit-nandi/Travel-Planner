import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { geocode } from "./geocode";

function mockFetch(results: Array<{ lat: string; lon: string }>, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(results),
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

describe("geocode", () => {
  it("returns null for a blank query without calling fetch", async () => {
    const fetchMock = mockFetch([]);
    expect(await geocode("   ")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves coordinates from the first search result", async () => {
    mockFetch([{ lat: "51.5", lon: "-0.11" }]);
    const point = await geocode("Waterloo Station, London");
    expect(point).toEqual({ lat: 51.5, lon: -0.11 });
  });

  it("returns null when there are no results", async () => {
    mockFetch([]);
    expect(await geocode("Nowhere, Nowhere")).toBeNull();
  });

  it("returns null when the response isn't ok", async () => {
    mockFetch([], false);
    expect(await geocode("Somewhere")).toBeNull();
  });

  it("returns null and doesn't throw when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    expect(await geocode("Somewhere")).toBeNull();
  });

  it("caches results across calls, only hitting fetch once for the same query", async () => {
    const fetchMock = mockFetch([{ lat: "1", lon: "2" }]);
    await geocode("Big Ben");
    await geocode("big ben");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("serializes concurrent lookups for different queries", async () => {
    const fetchMock = mockFetch([{ lat: "1", lon: "2" }]);
    const [a, b] = await Promise.all([geocode("Place A"), geocode("Place B")]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(a).toEqual({ lat: 1, lon: 2 });
    expect(b).toEqual({ lat: 1, lon: 2 });
  });

  it("treats a corrupted cache entry as empty rather than throwing", async () => {
    localStorage.setItem("travel-planner:geocode-cache", "{not json");
    mockFetch([{ lat: "1", lon: "2" }]);
    const point = await geocode("Somewhere");
    expect(point).toEqual({ lat: 1, lon: 2 });
  });

  it("doesn't throw when persisting the cache fails", async () => {
    mockFetch([{ lat: "1", lon: "2" }]);
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    await expect(geocode("Somewhere")).resolves.toEqual({ lat: 1, lon: 2 });
    setItemSpy.mockRestore();
  });
});
