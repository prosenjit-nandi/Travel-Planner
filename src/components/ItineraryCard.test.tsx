import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ResolvedItem } from "../lib/time";
import { ItineraryCard } from "./ItineraryCard";

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

describe("ItineraryCard", () => {
  it("renders a known category class, location, and notes", () => {
    const { container } = render(
      <ul>
        <ItineraryCard
          item={resolvedItem({ category: "Transport", notes: "Bring passport" })}
          timeState="current"
        />
      </ul>,
    );
    expect(container.querySelector(".item-card")).toHaveClass("cat-transport", "current");
    expect(screen.getByText("V&A Museum")).toBeInTheDocument();
    expect(screen.getByText("Bring passport")).toBeInTheDocument();
    expect(screen.getByText("Maps")).toBeInTheDocument();
    expect(screen.getByText("Uber")).toBeInTheDocument();
  });

  it("falls back to cat-other for an unrecognized category", () => {
    const { container } = render(
      <ul>
        <ItineraryCard item={resolvedItem({ category: "Something Else" })} timeState="future" />
      </ul>,
    );
    expect(container.querySelector(".item-card")).toHaveClass("cat-other");
  });

  it("omits location, notes, and action links when there is nothing to show", () => {
    render(
      <ul>
        <ItineraryCard
          item={resolvedItem({ locationName: "", notes: undefined })}
          timeState="past"
        />
      </ul>,
    );
    expect(screen.queryByText("Maps")).not.toBeInTheDocument();
    expect(screen.queryByText("Uber")).not.toBeInTheDocument();
  });
});
