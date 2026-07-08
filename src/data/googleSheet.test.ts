import { afterEach, describe, expect, it, vi } from "vitest";
import { googleSheetTripSource } from "./googleSheet";

const HEADER = ["Date", "Start Time", "End Time", "Activity", "Location", "Category", "Notes"];

function mockFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? "OK" : "Internal Server Error",
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeSource(endpoint = "/api/itinerary", token = "test-token") {
  return googleSheetTripSource({
    id: "trip-1",
    title: "Test Trip",
    timezone: "Europe/London",
    endpoint,
    token,
  });
}

describe("googleSheetTripSource", () => {
  it("sends the token header and hits the configured endpoint", async () => {
    const fetchMock = mockFetch({ values: [HEADER] });
    await makeSource("/api/itinerary", "secret-token").load();
    expect(fetchMock).toHaveBeenCalledWith("/api/itinerary", {
      headers: { "x-itinerary-token": "secret-token" },
    });
  });

  it("throws when the response is not ok", async () => {
    mockFetch({}, false);
    await expect(makeSource().load()).rejects.toThrow("Failed to fetch itinerary: 500 Internal Server Error");
  });

  it("maps a full row into an ItineraryItem, including notes", async () => {
    mockFetch({
      values: [
        HEADER,
        [
          "7/25/2026",
          "8:30:00 AM",
          "10:00:00 AM",
          "Hotel Check In",
          "Waterloo Station",
          "Transport",
          "Premier Inn",
        ],
      ],
    });
    const trip = await makeSource().load();
    expect(trip).toEqual({
      id: "trip-1",
      title: "Test Trip",
      timezone: "Europe/London",
      items: [
        {
          id: "2026-07-25-1",
          date: "2026-07-25",
          startTime: "08:30",
          endTime: "10:00",
          activity: "Hotel Check In",
          locationName: "Waterloo Station",
          category: "Transport",
          notes: "Premier Inn",
        },
      ],
    });
  });

  it("omits the notes field when the Notes cell is blank", async () => {
    mockFetch({
      values: [HEADER, ["7/25/2026", "8:30:00 AM", "10:00:00 AM", "Lunch", "Soho", "Dining", "  "]],
    });
    const trip = await makeSource().load();
    expect(trip.items[0]).not.toHaveProperty("notes");
  });

  it("fixes the sheet's 'Accomodation' typo", async () => {
    mockFetch({
      values: [HEADER, ["7/25/2026", "8:30:00 AM", "10:00:00 AM", "Check In", "Hotel", "Accomodation", ""]],
    });
    const trip = await makeSource().load();
    expect(trip.items[0].category).toBe("Accommodation");
  });

  it("leaves other categories unchanged", async () => {
    mockFetch({
      values: [HEADER, ["7/25/2026", "8:30:00 AM", "10:00:00 AM", "Museum", "V&A", "Excursion", ""]],
    });
    const trip = await makeSource().load();
    expect(trip.items[0].category).toBe("Excursion");
  });

  it("numbers items sequentially within the same date", async () => {
    mockFetch({
      values: [
        HEADER,
        ["7/25/2026", "8:00:00 AM", "9:00:00 AM", "First", "A", "Excursion", ""],
        ["7/25/2026", "9:00:00 AM", "10:00:00 AM", "Second", "B", "Excursion", ""],
      ],
    });
    const trip = await makeSource().load();
    expect(trip.items.map((i) => i.id)).toEqual(["2026-07-25-1", "2026-07-25-2"]);
  });

  it("parses PM times into 24-hour time and fills in blanks for cells missing past the header", async () => {
    mockFetch({
      values: [HEADER, ["7/25/2026", "1:15:00 PM", "2:15:00 PM", "Quick Stop"]],
    });
    const trip = await makeSource().load();
    expect(trip.items).toEqual([
      {
        id: "2026-07-25-1",
        date: "2026-07-25",
        startTime: "13:15",
        endTime: "14:15",
        activity: "Quick Stop",
        locationName: "",
        category: "",
      },
    ]);
  });

  it("treats missing start/end time cells as blank rather than throwing", async () => {
    mockFetch({
      values: [HEADER, ["7/25/2026", undefined as unknown as string, undefined as unknown as string, "Something"]],
    });
    const trip = await makeSource().load();
    expect(trip.items).toHaveLength(0);
  });

  it("skips a row with no cells at all", async () => {
    mockFetch({ values: [HEADER, []] });
    const trip = await makeSource().load();
    expect(trip.items).toHaveLength(0);
  });

  it("skips rows with a blank date", async () => {
    mockFetch({
      values: [HEADER, ["", "", "", "", "", "", "$9,321.81"]],
    });
    const trip = await makeSource().load();
    expect(trip.items).toHaveLength(0);
  });

  it("skips rows with a blank activity", async () => {
    mockFetch({
      values: [HEADER, ["7/25/2026", "8:00:00 AM", "9:00:00 AM", "", "A", "Excursion", ""]],
    });
    const trip = await makeSource().load();
    expect(trip.items).toHaveLength(0);
  });

  it("skips rows with an unparseable date", async () => {
    mockFetch({
      values: [HEADER, ["not-a-date", "8:00:00 AM", "9:00:00 AM", "Thing", "A", "Excursion", ""]],
    });
    const trip = await makeSource().load();
    expect(trip.items).toHaveLength(0);
  });

  it("skips rows with an unparseable start time", async () => {
    mockFetch({
      values: [HEADER, ["7/25/2026", "not-a-time", "9:00:00 AM", "Thing", "A", "Excursion", ""]],
    });
    const trip = await makeSource().load();
    expect(trip.items).toHaveLength(0);
  });

  it("skips rows with an unparseable end time", async () => {
    mockFetch({
      values: [HEADER, ["7/25/2026", "8:00:00 AM", "not-a-time", "Thing", "A", "Excursion", ""]],
    });
    const trip = await makeSource().load();
    expect(trip.items).toHaveLength(0);
  });
});
