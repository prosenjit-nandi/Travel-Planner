import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TripLeg } from "../lib/tripOverview";
import { TripOverview } from "./TripOverview";

describe("TripOverview", () => {
  it("renders a leg with a city name, a single-day date, and an item count", () => {
    const legs: TripLeg[] = [{ city: "London", startDate: "2026-07-25", endDate: "2026-07-25", itemCount: 1 }];
    render(<TripOverview legs={legs} onSelect={() => {}} />);
    expect(screen.getByText("London")).toBeInTheDocument();
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("renders a date range for a multi-day leg and pluralizes the item count", () => {
    const legs: TripLeg[] = [{ city: "London", startDate: "2026-07-24", endDate: "2026-07-26", itemCount: 4 }];
    render(<TripOverview legs={legs} onSelect={() => {}} />);
    expect(screen.getByText(/Jul 24.*Jul 26/)).toBeInTheDocument();
    expect(screen.getByText("4 items")).toBeInTheDocument();
  });

  it("labels a leg with no known city as 'Location TBD'", () => {
    const legs: TripLeg[] = [{ city: undefined, startDate: "2026-07-25", endDate: "2026-07-25", itemCount: 1 }];
    render(<TripOverview legs={legs} onSelect={() => {}} />);
    expect(screen.getByText("Location TBD")).toBeInTheDocument();
  });

  it("calls onSelect with the leg's start date when clicked", () => {
    const onSelect = vi.fn();
    const legs: TripLeg[] = [{ city: "London", startDate: "2026-07-24", endDate: "2026-07-26", itemCount: 2 }];
    render(<TripOverview legs={legs} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("London"));
    expect(onSelect).toHaveBeenCalledWith("2026-07-24");
  });
});
