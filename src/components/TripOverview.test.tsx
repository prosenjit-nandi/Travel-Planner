import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TripLeg } from "../lib/tripOverview";
import { TripOverview } from "./TripOverview";

vi.mock("./LegSummary", () => ({
  LegSummary: ({ leg, fallbackLabel }: { leg: TripLeg; fallbackLabel?: string }) => (
    <li data-testid="leg-summary" data-fallback={fallbackLabel}>
      {leg.city ?? "Location TBD"}
    </li>
  ),
}));

function leg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    city: "London",
    startDate: "2026-07-24",
    endDate: "2026-07-24",
    itemCount: 1,
    days: [],
    ...overrides,
  };
}

describe("TripOverview", () => {
  it("renders a leg summary per leg", () => {
    render(
      <TripOverview
        legs={[leg(), leg({ city: "Edinburgh", startDate: "2026-07-25", endDate: "2026-07-25" })]}
        totalDays={2}
      />,
    );
    expect(screen.getAllByTestId("leg-summary")).toHaveLength(2);
  });

  it("passes the fallback label through to each leg summary", () => {
    render(<TripOverview legs={[leg()]} totalDays={1} fallbackLabel="United Kingdom" />);
    expect(screen.getByTestId("leg-summary")).toHaveAttribute("data-fallback", "United Kingdom");
  });

  it("renders an intro line summarizing days, cities, and dates", () => {
    render(
      <TripOverview
        legs={[
          leg({ startDate: "2026-07-24", endDate: "2026-07-24" }),
          leg({ city: "Edinburgh", startDate: "2026-07-25", endDate: "2026-07-26" }),
        ]}
        totalDays={3}
      />,
    );
    expect(screen.getByText("3 days across London and Edinburgh from Jul 24 to Jul 26.")).toBeInTheDocument();
  });

  it("dedupes repeated cities in the intro line", () => {
    render(
      <TripOverview
        legs={[
          leg({ city: "London", startDate: "2026-07-24", endDate: "2026-07-24" }),
          leg({ city: "Edinburgh", startDate: "2026-07-25", endDate: "2026-07-25" }),
          leg({ city: "London", startDate: "2026-07-26", endDate: "2026-07-26" }),
        ]}
        totalDays={3}
      />,
    );
    expect(screen.getByText(/across London and Edinburgh from/)).toBeInTheDocument();
  });

  it("uses the singular 'day' and omits the city clause when no leg has a known city", () => {
    render(<TripOverview legs={[leg({ city: undefined })]} totalDays={1} />);
    expect(screen.getByText("1 day from Jul 24 to Jul 24.")).toBeInTheDocument();
  });

  it("renders no intro line when there are no legs", () => {
    const { container } = render(<TripOverview legs={[]} totalDays={0} />);
    expect(container.querySelector(".trip-overview-intro")).not.toBeInTheDocument();
    expect(container.querySelector(".trip-overview")).toBeInTheDocument();
  });
});
