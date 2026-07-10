import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { activeDataSource } from "./data/activeTrip";
import type { ItineraryItem, Trip } from "./data/types";

vi.mock("./data/activeTrip", () => ({
  activeDataSource: { load: vi.fn() },
}));

// Prevents ItineraryCard's/TripOverview's travel estimate, thumbnail, and
// weather lookups from firing real network calls during these integration
// tests; each is covered on its own (TravelEstimate.test.tsx,
// ItemThumbnail.test.tsx, Thumbnail.test.tsx, DayEntry.test.tsx,
// DayWeather.test.tsx). cityForDay is kept real since App.tsx relies on it
// directly for the day view's own weather chip.
vi.mock("./lib/travelEstimate", () => ({
  estimateTimeToNext: vi.fn().mockResolvedValue(null),
}));
vi.mock("./lib/photo", () => ({
  photoFor: vi.fn().mockResolvedValue(null),
  photoForQuery: vi.fn().mockResolvedValue(null),
}));
vi.mock("./lib/weather", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./lib/weather")>();
  return { ...actual, forecastFor: vi.fn().mockResolvedValue(null) };
});

function item(overrides: Partial<ItineraryItem>): ItineraryItem {
  return {
    id: overrides.id ?? "item",
    date: "2026-07-25",
    startTime: "09:00",
    endTime: "10:00",
    activity: "Activity",
    locationName: "Location",
    category: "Excursion",
    ...overrides,
  };
}

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip",
    title: "Test Trip",
    timezone: "UTC",
    items: [],
    ...overrides,
  };
}

function cardFor(activity: string) {
  const activitySpan = screen
    .getAllByText(activity)
    .find((el) => el.classList.contains("item-activity"))!;
  return activitySpan.closest(".item-card") as HTMLElement;
}

const loadMock = () => vi.mocked(activeDataSource.load);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-25T09:30:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("App", () => {
  it("shows a loading state until the trip resolves, then renders the title", async () => {
    let resolveLoad!: (t: Trip) => void;
    const pending = new Promise<Trip>((resolve) => {
      resolveLoad = resolve;
    });
    loadMock().mockReturnValue(pending);

    render(<App />);
    expect(screen.getByText("Loading itinerary…")).toBeInTheDocument();

    await act(async () => {
      resolveLoad(trip({ title: "My Trip", items: [item({ id: "a" })] }));
      await pending;
    });

    expect(screen.getByText("My Trip")).toBeInTheDocument();
  });

  it("renders past/current/future items for today and shows the status banner", async () => {
    const t = trip({
      title: "Today Trip",
      items: [
        item({ id: "past-1", activity: "Past Thing", startTime: "09:00", endTime: "09:20" }),
        item({ id: "current-1", activity: "Current Thing", startTime: "09:25", endTime: "09:45" }),
        item({ id: "future-1", activity: "Future Thing", startTime: "10:00", endTime: "11:00" }),
      ],
    });
    loadMock().mockResolvedValue(t);

    render(<App />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(cardFor("Past Thing")).toHaveClass("past");
    expect(cardFor("Current Thing")).toHaveClass("current");
    expect(cardFor("Future Thing")).toHaveClass("future");
    expect(screen.getByText("On schedule")).toBeInTheDocument();
  });

  it("hides the status banner and forces the future state on a non-today day", async () => {
    const t = trip({
      title: "Multi-day Trip",
      items: [
        item({ id: "prev-1", date: "2026-07-24", activity: "Prev Day Thing", startTime: "08:00", endTime: "09:00" }),
        item({ id: "today-1", date: "2026-07-25", activity: "Today Thing", startTime: "09:00", endTime: "10:00" }),
      ],
    });
    loadMock().mockResolvedValue(t);

    render(<App />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("On schedule")).toBeInTheDocument();

    await act(async () => {
      screen.getByLabelText("Previous day").click();
    });

    expect(screen.queryByText("On schedule")).not.toBeInTheDocument();
    expect(cardFor("Prev Day Thing")).toHaveClass("future");
    expect(cardFor("Prev Day Thing")).not.toHaveClass("past");
  });

  it("jumps back to today via the Today button after browsing away", async () => {
    const t = trip({
      title: "Multi-day Trip",
      items: [
        item({ id: "prev-1", date: "2026-07-24", activity: "Prev Day Thing", startTime: "08:00", endTime: "09:00" }),
        item({ id: "today-1", date: "2026-07-25", activity: "Today Thing", startTime: "09:00", endTime: "10:00" }),
      ],
    });
    loadMock().mockResolvedValue(t);

    render(<App />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.queryByLabelText("Jump to today")).not.toBeInTheDocument();

    await act(async () => {
      screen.getByLabelText("Previous day").click();
    });
    expect(screen.getByLabelText("Jump to today")).toBeInTheDocument();

    await act(async () => {
      screen.getByLabelText("Jump to today").click();
    });

    expect(screen.getByText("On schedule")).toBeInTheDocument();
    expect(screen.queryByLabelText("Jump to today")).not.toBeInTheDocument();
  });

  it("moves an item from future to current after the 30-second clock tick", async () => {
    const t = trip({
      title: "Ticking Trip",
      items: [item({ id: "soon-1", activity: "Starting Soon", startTime: "09:30", endTime: "09:40" })],
    });
    vi.setSystemTime(new Date("2026-07-25T09:29:45Z"));
    loadMock().mockResolvedValue(t);

    render(<App />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(cardFor("Starting Soon")).toHaveClass("future");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(cardFor("Starting Soon")).toHaveClass("current");
  });

  it("polls for fresh data every 10 minutes", async () => {
    const tripV1 = trip({ title: "Trip V1", items: [item({ id: "a" })] });
    const tripV2 = trip({ title: "Trip V2", items: [item({ id: "a" })] });
    loadMock().mockResolvedValueOnce(tripV1).mockResolvedValueOnce(tripV2);

    render(<App />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Trip V1")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60_000);
    });

    expect(screen.getByText("Trip V2")).toBeInTheDocument();
    expect(loadMock()).toHaveBeenCalledTimes(2);
  });

  it("does not update state after unmounting while a load is still pending", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let resolveLoad!: (t: Trip) => void;
    const pending = new Promise<Trip>((resolve) => {
      resolveLoad = resolve;
    });
    loadMock().mockReturnValue(pending);

    const { unmount } = render(<App />);
    unmount();

    await act(async () => {
      resolveLoad(trip({ title: "Late Trip", items: [item({ id: "a" })] }));
      await pending;
    });

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("switches to the trip overview and summarizes each city as prose", async () => {
    const t = trip({
      title: "Multi-city Trip",
      items: [
        item({ id: "ldn-1", date: "2026-07-24", activity: "Arrive London", locationName: "Heathrow Airport", city: "London" }),
        item({ id: "ldn-2", date: "2026-07-25", activity: "Tower Bridge", locationName: "Tower Bridge", city: "London" }),
        item({ id: "edi-1", date: "2026-07-26", activity: "Arrive Edinburgh", locationName: "Edinburgh Castle", city: "Edinburgh" }),
      ],
    });
    loadMock().mockResolvedValue(t);

    render(<App />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    await act(async () => {
      screen.getByText("Trip overview").click();
    });

    expect(screen.getByText("3 days across London and Edinburgh from Jul 24 to Jul 26.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "London" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Edinburgh" })).toBeInTheDocument();
    // Each day within a city gets its own sentence, not one merged per city.
    expect(screen.getByText("Flying into Heathrow Airport.")).toBeInTheDocument();
    expect(screen.getByText("Visiting Tower Bridge.")).toBeInTheDocument();
    expect(screen.getByText("Visiting Edinburgh Castle.")).toBeInTheDocument();

    // No navigation from the overview itself — only the header toggle can leave it.
    expect(screen.queryByRole("button", { name: /London|Edinburgh/ })).not.toBeInTheDocument();
  });

  it("returns to day view via the header toggle without selecting a leg", async () => {
    const t = trip({
      title: "Multi-city Trip",
      items: [item({ id: "ldn-1", date: "2026-07-24", activity: "Arrive London", city: "London" })],
    });
    loadMock().mockResolvedValue(t);

    render(<App />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    await act(async () => {
      screen.getByText("Trip overview").click();
    });
    expect(screen.getByText("Back to day")).toBeInTheDocument();

    await act(async () => {
      screen.getByText("Back to day").click();
    });
    expect(screen.getByText("Trip overview")).toBeInTheDocument();
    expect(screen.getByLabelText("Previous day")).toBeInTheDocument();
  });

  it("defaults to the first day, not the last, when today is after the trip has ended", async () => {
    const t = trip({
      title: "Past Trip",
      items: [
        item({ id: "d1", date: "2026-07-01", activity: "Day One Thing" }),
        item({ id: "d2", date: "2026-07-02", activity: "Day Two Thing" }),
      ],
    });
    loadMock().mockResolvedValue(t);

    render(<App />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // System time is 2026-07-25, well after the trip's last day (07-02).
    expect(cardFor("Day One Thing")).toBeInTheDocument();
    expect(screen.queryByText("Day Two Thing")).not.toBeInTheDocument();
  });

  it("defaults to the first day when today is before the trip starts", async () => {
    const t = trip({
      title: "Future Trip",
      items: [
        item({ id: "d1", date: "2026-08-01", activity: "First Day Thing" }),
        item({ id: "d2", date: "2026-08-02", activity: "Second Day Thing" }),
      ],
    });
    loadMock().mockResolvedValue(t);

    render(<App />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(cardFor("First Day Thing")).toBeInTheDocument();
    expect(screen.queryByText("Second Day Thing")).not.toBeInTheDocument();
  });

  it("resets to the default date via Back to day, even after manually browsing away", async () => {
    const t = trip({
      title: "Multi-day Trip",
      items: [
        item({ id: "d1", date: "2026-07-24", activity: "Day One Thing" }),
        item({ id: "d2", date: "2026-07-25", activity: "Day Two Thing" }),
        item({ id: "d3", date: "2026-07-26", activity: "Day Three Thing" }),
      ],
    });
    loadMock().mockResolvedValue(t);

    render(<App />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    // Today (2026-07-25) is in range, so Day Two is shown initially.
    expect(cardFor("Day Two Thing")).toBeInTheDocument();

    await act(async () => {
      screen.getByLabelText("Next day").click();
    });
    expect(cardFor("Day Three Thing")).toBeInTheDocument();

    await act(async () => {
      screen.getByText("Trip overview").click();
    });
    await act(async () => {
      screen.getByText("Back to day").click();
    });

    // Back to day re-applies the default rather than resuming Day Three.
    expect(cardFor("Day Two Thing")).toBeInTheDocument();
  });
});
