import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TripLeg } from "../lib/tripOverview";
import { TripOverview } from "./TripOverview";

vi.mock("./DayWeather", () => ({
  DayWeather: ({ city, date }: { city: string; date: string }) => (
    <div data-testid="day-weather">
      {city}-{date}
    </div>
  ),
}));

vi.mock("./LegThumbnail", () => ({
  LegThumbnail: ({ query }: { query: string }) => <div data-testid="leg-thumbnail">{query}</div>,
}));

function leg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    city: "London",
    startDate: "2026-07-25",
    endDate: "2026-07-25",
    itemCount: 1,
    categoryCounts: { Excursion: 1 },
    ...overrides,
  };
}

describe("TripOverview", () => {
  it("renders a leg's city and a single-day date with no nights suffix", () => {
    render(<TripOverview legs={[leg()]} onSelect={() => {}} />);
    expect(screen.getByText("London", { selector: ".trip-overview-city" })).toBeInTheDocument();
    expect(screen.getByText("Jul 25")).toBeInTheDocument();
  });

  it("renders a date range with a pluralized nights count for a multi-day leg", () => {
    render(
      <TripOverview legs={[leg({ startDate: "2026-07-24", endDate: "2026-07-26" })]} onSelect={() => {}} />,
    );
    expect(screen.getByText(/Jul 24.*Jul 26.*2 nights/)).toBeInTheDocument();
  });

  it("uses the singular 'night' for a two-day leg", () => {
    render(
      <TripOverview legs={[leg({ startDate: "2026-07-24", endDate: "2026-07-25" })]} onSelect={() => {}} />,
    );
    expect(screen.getByText(/1 night$/)).toBeInTheDocument();
  });

  it("labels a leg with no known city as 'Location TBD' and skips weather/thumbnail", () => {
    render(<TripOverview legs={[leg({ city: undefined })]} onSelect={() => {}} />);
    expect(screen.getByText("Location TBD")).toBeInTheDocument();
    expect(screen.queryByTestId("day-weather")).not.toBeInTheDocument();
    expect(screen.queryByTestId("leg-thumbnail")).not.toBeInTheDocument();
  });

  it("renders weather and a thumbnail keyed off the leg's city and start date", () => {
    render(<TripOverview legs={[leg({ city: "Edinburgh", startDate: "2026-07-26" })]} onSelect={() => {}} />);
    expect(screen.getByTestId("day-weather")).toHaveTextContent("Edinburgh-2026-07-26");
    expect(screen.getByTestId("leg-thumbnail")).toHaveTextContent("Edinburgh");
  });

  it("renders category badges sorted by count, descending", () => {
    render(
      <TripOverview
        legs={[leg({ categoryCounts: { Transport: 1, Excursion: 3, Dining: 2 } })]}
        onSelect={() => {}}
      />,
    );
    const badges = screen.getAllByText(/^(Transport|Excursion|Dining) \d$/);
    expect(badges.map((b) => b.textContent)).toEqual(["Excursion 3", "Dining 2", "Transport 1"]);
  });

  it("falls back to a neutral style for an unrecognized category", () => {
    render(<TripOverview legs={[leg({ categoryCounts: { Something: 1 } })]} onSelect={() => {}} />);
    expect(screen.getByText("Something 1")).toHaveClass("cat-other");
  });

  it("calls onSelect with the leg's start date when clicked", () => {
    const onSelect = vi.fn();
    render(<TripOverview legs={[leg({ startDate: "2026-07-24", endDate: "2026-07-26" })]} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("London", { selector: ".trip-overview-city" }));
    expect(onSelect).toHaveBeenCalledWith("2026-07-24");
  });

  it("calls onSelect on Enter and Space, but not other keys", () => {
    const onSelect = vi.fn();
    render(<TripOverview legs={[leg({ startDate: "2026-07-24" })]} onSelect={onSelect} />);
    const card = screen.getByRole("button");

    fireEvent.keyDown(card, { key: "A" });
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.keyDown(card, { key: "Enter" });
    fireEvent.keyDown(card, { key: " " });
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith("2026-07-24");
  });
});
