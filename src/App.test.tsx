import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { activeDataSource } from "./data/activeTrip";
import type { ItineraryItem, Trip } from "./data/types";

vi.mock("./data/activeTrip", () => ({
  activeDataSource: { load: vi.fn() },
}));

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
  vi.setSystemTime(new Date(2026, 6, 25, 9, 30, 0));
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

  it("moves an item from future to current after the 30-second clock tick", async () => {
    const t = trip({
      title: "Ticking Trip",
      items: [item({ id: "soon-1", activity: "Starting Soon", startTime: "09:30", endTime: "09:40" })],
    });
    vi.setSystemTime(new Date(2026, 6, 25, 9, 29, 45));
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
});
