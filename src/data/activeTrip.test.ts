import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import uk2026 from "./trips/uk-2026.json";

const HEADER = ["Date", "Start Time", "End Time", "Activity", "Location", "Category", "Notes"];
const ROW_A = ["7/25/2026", "8:00:00 AM", "9:00:00 AM", "Mock Live Item", "A", "Excursion", ""];

function okResponse(values: string[][]) {
  return { ok: true, status: 200, statusText: "OK", json: () => Promise.resolve({ values }) };
}

function failResponse() {
  return { ok: false, status: 500, statusText: "Internal Server Error", json: () => Promise.resolve({}) };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("activeDataSource", () => {
  it("returns live data on a successful fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(okResponse([HEADER, ROW_A])),
    );
    const { activeDataSource } = await import("./activeTrip");

    const trip = await activeDataSource.load();

    expect(trip.id).toBe("uk-2026");
    expect(trip.title).toBe("London & Edinburgh Trip 2026");
    expect(trip.timezone).toBe("Europe/London");
    expect(trip.items).toHaveLength(1);
    expect(trip.items[0].activity).toBe("Mock Live Item");
  });

  it("falls back to the bundled snapshot when the very first fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(failResponse()));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { activeDataSource } = await import("./activeTrip");

    const trip = await activeDataSource.load();

    expect(trip).toEqual(uk2026);
    expect(console.warn).toHaveBeenCalled();
  });

  it("keeps the last successfully fetched trip when a later poll fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(okResponse([HEADER, ROW_A]));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { activeDataSource } = await import("./activeTrip");

    const first = await activeDataSource.load();

    fetchMock.mockResolvedValueOnce(failResponse());
    const second = await activeDataSource.load();

    expect(second).toEqual(first);
    expect(second).not.toEqual(uk2026);
  });
});
