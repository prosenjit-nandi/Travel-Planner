import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DayStatus } from "../lib/schedule";
import type { ResolvedItem } from "../lib/time";
import { StatusBanner } from "./StatusBanner";

function resolvedItem(overrides: Partial<ResolvedItem> = {}): ResolvedItem {
  return {
    id: "1",
    date: "2026-07-25",
    startTime: "09:00",
    endTime: "10:00",
    activity: "Museum visit",
    locationName: "V&A Museum",
    category: "Excursion",
    start: new Date(2026, 6, 25, 9, 0),
    end: new Date(2026, 6, 25, 10, 0),
    ...overrides,
  };
}

describe("StatusBanner", () => {
  it("renders the no-items state", () => {
    render(<StatusBanner status={{ kind: "no-items" }} />);
    expect(screen.getByText(/No itinerary items/)).toBeInTheDocument();
  });

  it("renders the before-day state", () => {
    const status: DayStatus = { kind: "before-day", next: resolvedItem({ activity: "Flight" }) };
    render(<StatusBanner status={status} />);
    expect(screen.getByText("Flight")).toBeInTheDocument();
  });

  it("renders the on-track state", () => {
    const status: DayStatus = {
      kind: "on-track",
      current: resolvedItem({ activity: "Lunch" }),
      next: resolvedItem({ activity: "Museum" }),
      minutesUntilNext: 90,
    };
    render(<StatusBanner status={status} />);
    expect(screen.getByText("On schedule")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
  });

  it("renders the free state", () => {
    const status: DayStatus = {
      kind: "free",
      next: resolvedItem({ activity: "Dinner" }),
      previous: resolvedItem({ activity: "Walk" }),
      minutesUntilNext: 45,
    };
    render(<StatusBanner status={status} />);
    expect(screen.getByText("Free time")).toBeInTheDocument();
    expect(screen.getByText("Dinner")).toBeInTheDocument();
  });

  it("renders 'Leave now' with the next item's location when time is up", () => {
    const status: DayStatus = {
      kind: "leave-now",
      next: resolvedItem({ activity: "Train", locationName: "Waterloo Station" }),
      current: resolvedItem({ activity: "Coffee" }),
      minutesUntilNext: 0,
    };
    render(<StatusBanner status={status} />);
    expect(screen.getByText("Leave now")).toBeInTheDocument();
    expect(screen.getByText(/Waterloo Station/)).toBeInTheDocument();
  });

  it("renders a countdown without a location when leaving soon from a gap", () => {
    const status: DayStatus = {
      kind: "leave-now",
      next: resolvedItem({ activity: "Train", locationName: "" }),
      current: undefined,
      minutesUntilNext: 5,
    };
    render(<StatusBanner status={status} />);
    expect(screen.getByText("Leave in 5m")).toBeInTheDocument();
  });

  it("renders the day-done state", () => {
    const status: DayStatus = { kind: "day-done", last: resolvedItem({ endTime: "22:00" }) };
    render(<StatusBanner status={status} />);
    expect(screen.getByText(/wrapped at/)).toBeInTheDocument();
  });
});
