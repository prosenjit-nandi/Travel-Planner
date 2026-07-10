import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DaySummary, TripLeg } from "../lib/tripOverview";
import { LegSummary } from "./LegSummary";

vi.mock("./DayEntry", () => ({
  DayEntry: ({ day }: { day: DaySummary }) => <div data-testid="day-entry">{day.date}</div>,
}));

vi.mock("./Thumbnail", () => ({
  Thumbnail: ({ query }: { query: string }) => <div data-testid="thumbnail">{query}</div>,
}));

function day(overrides: Partial<DaySummary> = {}): DaySummary {
  return { date: "2026-07-24", city: "London", itemCount: 1, places: [], ...overrides };
}

function leg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    city: "London",
    startDate: "2026-07-24",
    endDate: "2026-07-24",
    itemCount: 1,
    days: [day()],
    ...overrides,
  };
}

describe("LegSummary", () => {
  it("renders the city heading, date range, and a hero thumbnail", () => {
    render(
      <ul>
        <LegSummary leg={leg()} />
      </ul>,
    );
    expect(screen.getByRole("heading", { name: "London" })).toBeInTheDocument();
    expect(screen.getByText("Jul 24")).toBeInTheDocument();
    expect(screen.getByTestId("thumbnail")).toHaveTextContent("London");
  });

  it("renders a date range with a pluralized nights count for a multi-day leg", () => {
    render(
      <ul>
        <LegSummary leg={leg({ startDate: "2026-07-24", endDate: "2026-07-26" })} />
      </ul>,
    );
    expect(screen.getByText(/Jul 24.*Jul 26.*2 nights/)).toBeInTheDocument();
  });

  it("uses the singular 'night' for a two-day leg", () => {
    render(
      <ul>
        <LegSummary leg={leg({ startDate: "2026-07-24", endDate: "2026-07-25" })} />
      </ul>,
    );
    expect(screen.getByText(/1 night$/)).toBeInTheDocument();
  });

  it("renders one DayEntry per day in the leg", () => {
    render(
      <ul>
        <LegSummary
          leg={leg({
            startDate: "2026-07-24",
            endDate: "2026-07-25",
            days: [day({ date: "2026-07-24" }), day({ date: "2026-07-25" })],
          })}
        />
      </ul>,
    );
    expect(screen.getAllByTestId("day-entry").map((el) => el.textContent)).toEqual([
      "2026-07-24",
      "2026-07-25",
    ]);
  });

  it("falls back to the given label and skips the thumbnail when no city is known", () => {
    render(
      <ul>
        <LegSummary leg={leg({ city: undefined })} fallbackLabel="United Kingdom" />
      </ul>,
    );
    expect(screen.getByRole("heading", { name: "United Kingdom" })).toBeInTheDocument();
    expect(screen.queryByTestId("thumbnail")).not.toBeInTheDocument();
  });

  it("falls back to a generic label when there's no city and no fallback given", () => {
    render(
      <ul>
        <LegSummary leg={leg({ city: undefined })} />
      </ul>,
    );
    expect(screen.getByRole("heading", { name: "This trip" })).toBeInTheDocument();
  });
});
