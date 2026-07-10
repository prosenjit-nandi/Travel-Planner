import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DaySummary } from "../lib/tripOverview";
import { DayEntry } from "./DayEntry";

vi.mock("../lib/weather", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/weather")>();
  return { ...actual, forecastFor: vi.fn() };
});

import { forecastFor } from "../lib/weather";

vi.mock("./Thumbnail", () => ({
  Thumbnail: ({ query, className }: { query: string; className: string }) => (
    <div data-testid="thumbnail" className={className}>
      {query}
    </div>
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
});

function day(overrides: Partial<DaySummary> = {}): DaySummary {
  return {
    date: "2026-07-24",
    city: "London",
    itemCount: 1,
    places: [{ name: "British Museum", category: "Excursion", activity: "Visit British Museum" }],
    ...overrides,
  };
}

describe("DayEntry", () => {
  it("renders the day's full date label and places sentence", async () => {
    vi.mocked(forecastFor).mockResolvedValue(null);
    render(<DayEntry day={day()} />);
    expect(screen.getByText(/July 24/)).toBeInTheDocument();
    expect(screen.getByText("Visiting British Museum.")).toBeInTheDocument();
  });

  it("weaves the weather into the narrative when available", async () => {
    vi.mocked(forecastFor).mockResolvedValue({ code: 0, maxC: 20, minC: 10 });
    render(<DayEntry day={day()} />);
    expect(await screen.findByText("Clear, 10–20°C. Visiting British Museum.")).toBeInTheDocument();
  });

  it("skips the weather lookup when the day has no known city", () => {
    render(<DayEntry day={day({ city: undefined })} />);
    expect(forecastFor).not.toHaveBeenCalled();
    expect(screen.getByText("Visiting British Museum.")).toBeInTheDocument();
  });

  it("says there are no recorded stops when the day has none, and skips the photo strip", async () => {
    vi.mocked(forecastFor).mockResolvedValue(null);
    render(<DayEntry day={day({ places: [] })} />);
    expect(screen.getByText("No specific stops recorded yet.")).toBeInTheDocument();
    expect(screen.queryByTestId("thumbnail")).not.toBeInTheDocument();
  });

  it("labels accommodation as 'Staying at'", async () => {
    vi.mocked(forecastFor).mockResolvedValue(null);
    render(<DayEntry day={day({ places: [{ name: "The Marriott", category: "Accommodation", activity: "Check in" }] })} />);
    expect(screen.getByText("Staying at The Marriott.")).toBeInTheDocument();
  });

  describe("Transport label disambiguation", () => {
    it("labels airport rows as 'Flying from'", async () => {
      vi.mocked(forecastFor).mockResolvedValue(null);
      render(<DayEntry day={day({ places: [{ name: "Heathrow Airport T5", category: "Transport", activity: "Departure" }] })} />);
      expect(screen.getByText("Flying from Heathrow Airport T5.")).toBeInTheDocument();
    });

    it("labels flight-activity rows as 'Flying from'", async () => {
      vi.mocked(forecastFor).mockResolvedValue(null);
      render(<DayEntry day={day({ places: [{ name: "Edinburgh Airport", category: "Transport", activity: "Flight BA1234" }] })} />);
      expect(screen.getByText("Flying from Edinburgh Airport.")).toBeInTheDocument();
    });

    it("labels Uber rows as 'Taking a taxi from'", async () => {
      vi.mocked(forecastFor).mockResolvedValue(null);
      render(<DayEntry day={day({ places: [{ name: "Hotel Lobby", category: "Transport", activity: "Uber to central London" }] })} />);
      expect(screen.getByText("Taking a taxi from Hotel Lobby.")).toBeInTheDocument();
    });

    it("labels tube/underground rows correctly", async () => {
      vi.mocked(forecastFor).mockResolvedValue(null);
      render(<DayEntry day={day({ places: [{ name: "King's Cross St Pancras", category: "Transport", activity: "Take the tube" }] })} />);
      expect(screen.getByText("Taking the underground from King's Cross St Pancras.")).toBeInTheDocument();
    });

    it("labels train rows correctly", async () => {
      vi.mocked(forecastFor).mockResolvedValue(null);
      render(<DayEntry day={day({ places: [{ name: "Paddington Station", category: "Transport", activity: "Train to Bristol" }] })} />);
      expect(screen.getByText("Taking the train from Paddington Station.")).toBeInTheDocument();
    });

    it("labels walking rows as 'Walking to'", async () => {
      vi.mocked(forecastFor).mockResolvedValue(null);
      render(<DayEntry day={day({ places: [{ name: "Hyde Park", category: "Transport", activity: "Walk to Hyde Park" }] })} />);
      expect(screen.getByText("Walking to Hyde Park.")).toBeInTheDocument();
    });

    it("labels ferry rows correctly", async () => {
      vi.mocked(forecastFor).mockResolvedValue(null);
      render(<DayEntry day={day({ places: [{ name: "Thames Clipper", category: "Transport", activity: "Take the ferry" }] })} />);
      expect(screen.getByText("Taking a ferry from Thames Clipper.")).toBeInTheDocument();
    });

    it("labels bus rows correctly", async () => {
      vi.mocked(forecastFor).mockResolvedValue(null);
      render(<DayEntry day={day({ places: [{ name: "Victoria Coach Station", category: "Transport", activity: "Bus to Brighton" }] })} />);
      expect(screen.getByText("Taking a bus from Victoria Coach Station.")).toBeInTheDocument();
    });

    it("falls back to 'Travelling via' for unrecognised transport", async () => {
      vi.mocked(forecastFor).mockResolvedValue(null);
      render(<DayEntry day={day({ places: [{ name: "Some Place", category: "Transport", activity: "Get there somehow" }] })} />);
      expect(screen.getByText("Travelling via Some Place.")).toBeInTheDocument();
    });
  });

  it("groups multiple places by type into separate labeled clauses", async () => {
    vi.mocked(forecastFor).mockResolvedValue(null);
    render(
      <DayEntry
        day={day({
          places: [
            { name: "British Museum", category: "Excursion", activity: "Visit" },
            { name: "Big Ben", category: "Excursion", activity: "Photo stop" },
            { name: "The Ivy", category: "Dining", activity: "Lunch" },
            { name: "The Savoy", category: "Accommodation", activity: "Check in" },
          ],
        })}
      />,
    );
    expect(
      screen.getByText("Visiting British Museum and Big Ben. Dining at The Ivy. Staying at The Savoy."),
    ).toBeInTheDocument();
  });

  it("renders a thumbnail per place using place.name", async () => {
    vi.mocked(forecastFor).mockResolvedValue(null);
    render(
      <DayEntry
        day={day({
          places: [
            { name: "British Museum", category: "Excursion", activity: "Visit" },
            { name: "Big Ben", category: "Excursion", activity: "Photo stop" },
            { name: "The Ivy", category: "Dining", activity: "Lunch" },
          ],
        })}
      />,
    );
    const thumbnails = screen.getAllByTestId("thumbnail");
    expect(thumbnails.map((t) => t.textContent)).toEqual(["British Museum", "Big Ben", "The Ivy"]);
    expect(thumbnails[0]).toHaveClass("trip-overview-place-photo");
  });

  it("does not update state after unmounting before the forecast resolves", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let resolveForecast!: (v: null) => void;
    vi.mocked(forecastFor).mockReturnValue(
      new Promise((resolve) => {
        resolveForecast = resolve;
      }),
    );
    const { unmount } = render(<DayEntry day={day()} />);
    unmount();

    await act(async () => {
      resolveForecast(null);
      await Promise.resolve();
    });

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
