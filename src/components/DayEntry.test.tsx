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
    places: ["British Museum"],
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

  it("renders a thumbnail per place, mentioning every one", async () => {
    vi.mocked(forecastFor).mockResolvedValue(null);
    render(<DayEntry day={day({ places: ["British Museum", "Big Ben", "The Ivy"] })} />);
    expect(screen.getByText("Visiting British Museum, Big Ben, and The Ivy.")).toBeInTheDocument();
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
