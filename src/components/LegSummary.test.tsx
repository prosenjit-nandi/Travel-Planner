import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TripLeg } from "../lib/tripOverview";
import { LegSummary } from "./LegSummary";

vi.mock("../lib/weather", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/weather")>();
  return { ...actual, forecastFor: vi.fn() };
});

import { forecastFor } from "../lib/weather";

vi.mock("./LegThumbnail", () => ({
  LegThumbnail: ({ query }: { query: string }) => <div data-testid="leg-thumbnail">{query}</div>,
}));

afterEach(() => {
  vi.clearAllMocks();
});

function leg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    city: "London",
    startDate: "2026-07-24",
    endDate: "2026-07-24",
    itemCount: 1,
    places: ["British Museum"],
    ...overrides,
  };
}

describe("LegSummary", () => {
  it("renders the city, date, and places sentence", async () => {
    vi.mocked(forecastFor).mockResolvedValue(null);
    render(
      <ul>
        <LegSummary leg={leg()} />
      </ul>,
    );
    expect(screen.getByRole("heading", { name: "London" })).toBeInTheDocument();
    expect(screen.getByText("Jul 24")).toBeInTheDocument();
    expect(screen.getByText("Visiting British Museum.")).toBeInTheDocument();
  });

  it("shows a pluralized nights count for a multi-day leg", async () => {
    vi.mocked(forecastFor).mockResolvedValue(null);
    render(
      <ul>
        <LegSummary leg={leg({ startDate: "2026-07-24", endDate: "2026-07-26" })} />
      </ul>,
    );
    expect(screen.getByText(/Jul 24.*Jul 26.*2 nights/)).toBeInTheDocument();
  });

  it("uses the singular 'night' for a two-day leg", async () => {
    vi.mocked(forecastFor).mockResolvedValue(null);
    render(
      <ul>
        <LegSummary leg={leg({ startDate: "2026-07-24", endDate: "2026-07-25" })} />
      </ul>,
    );
    expect(screen.getByText(/1 night$/)).toBeInTheDocument();
  });

  it("labels a leg with no known city as 'Location TBD' and skips weather/thumbnail", () => {
    render(
      <ul>
        <LegSummary leg={leg({ city: undefined })} />
      </ul>,
    );
    expect(screen.getByRole("heading", { name: "Location TBD" })).toBeInTheDocument();
    expect(screen.queryByTestId("leg-thumbnail")).not.toBeInTheDocument();
    expect(forecastFor).not.toHaveBeenCalled();
  });

  it("weaves the weather into the narrative when available", async () => {
    vi.mocked(forecastFor).mockResolvedValue({ code: 0, maxC: 20, minC: 10 });
    render(
      <ul>
        <LegSummary leg={leg()} />
      </ul>,
    );
    expect(await screen.findByText("Clear, 10–20°C. Visiting British Museum.")).toBeInTheDocument();
  });

  it("mentions every place, joined naturally", async () => {
    vi.mocked(forecastFor).mockResolvedValue(null);
    render(
      <ul>
        <LegSummary leg={leg({ places: ["British Museum", "Big Ben", "The Ivy"] })} />
      </ul>,
    );
    expect(screen.getByText("Visiting British Museum, Big Ben, and The Ivy.")).toBeInTheDocument();
  });

  it("says there are no recorded stops when the leg has none", () => {
    vi.mocked(forecastFor).mockResolvedValue(null);
    render(
      <ul>
        <LegSummary leg={leg({ places: [] })} />
      </ul>,
    );
    expect(screen.getByText("No specific stops recorded yet.")).toBeInTheDocument();
  });

  it("does not update state after unmounting before the forecast resolves", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let resolveForecast!: (v: null) => void;
    vi.mocked(forecastFor).mockReturnValue(
      new Promise((resolve) => {
        resolveForecast = resolve;
      }),
    );
    const { unmount } = render(
      <ul>
        <LegSummary leg={leg()} />
      </ul>,
    );
    unmount();

    await act(async () => {
      resolveForecast(null);
      await Promise.resolve();
    });

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
