import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedItem } from "../lib/time";
import { ItineraryCard } from "./ItineraryCard";

vi.mock("./TravelEstimate", () => ({
  TravelEstimate: ({ from, to }: { from: { id: string }; to: { id: string } }) => (
    <div data-testid="travel-estimate">
      {from.id}-{to.id}
    </div>
  ),
}));

vi.mock("./ItemThumbnail", () => ({
  ItemThumbnail: () => null,
}));

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
  it("renders a known category class and location", () => {
    const { container } = render(
      <ul>
        <ItineraryCard
          item={resolvedItem({ category: "Transport" })}
          timeState="current"
          timeZone="UTC"
        />
      </ul>,
    );
    expect(container.querySelector(".item-card")).toHaveClass("cat-transport", "current");
    expect(screen.getByText("V&A Museum")).toBeInTheDocument();
    expect(screen.getByText("Maps")).toBeInTheDocument();
    expect(screen.getByText("Uber")).toBeInTheDocument();
  });

  it("falls back to cat-other for an unrecognized category", () => {
    const { container } = render(
      <ul>
        <ItineraryCard item={resolvedItem({ category: "Something Else" })} timeState="future" timeZone="UTC" />
      </ul>,
    );
    expect(container.querySelector(".item-card")).toHaveClass("cat-other");
  });

  it("omits location and action links when there is nothing to show", () => {
    render(
      <ul>
        <ItineraryCard item={resolvedItem({ locationName: "" })} timeState="past" timeZone="UTC" />
      </ul>,
    );
    expect(screen.queryByText("Maps")).not.toBeInTheDocument();
    expect(screen.queryByText("Uber")).not.toBeInTheDocument();
  });

  it("renders a plain, non-interactive heading when there's no extra detail to show", () => {
    render(
      <ul>
        <ItineraryCard item={resolvedItem({ notes: undefined, address: undefined })} timeState="future" timeZone="UTC" />
      </ul>,
    );
    expect(screen.queryByRole("button", { name: /Museum visit/ })).not.toBeInTheDocument();
  });

  it("hides notes, address, and confirmation number until the card is expanded", () => {
    render(
      <ul>
        <ItineraryCard
          item={resolvedItem({
            notes: "Bring passport",
            address: "V&A Museum, Cromwell Rd, London",
            confirmationNumber: "ABC123",
          })}
          timeState="future"
          timeZone="UTC"
        />
      </ul>,
    );
    expect(screen.queryByText("Bring passport")).not.toBeInTheDocument();
    expect(screen.queryByText(/Cromwell Rd/)).not.toBeInTheDocument();
    expect(screen.queryByText("ABC123")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Museum visit/ }));

    expect(screen.getByText("Bring passport")).toBeInTheDocument();
    expect(screen.getByText(/Cromwell Rd/)).toBeInTheDocument();
    expect(screen.getByText(/ABC123/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Museum visit/ }));
    expect(screen.queryByText("Bring passport")).not.toBeInTheDocument();
  });

  describe("confirmation number copy button", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("copies the confirmation number and reverts the label after a delay", async () => {
      render(
        <ul>
          <ItineraryCard
            item={resolvedItem({ confirmationNumber: "ABC123" })}
            timeState="future"
            timeZone="UTC"
          />
        </ul>,
      );
      fireEvent.click(screen.getByRole("button", { name: /Museum visit/ }));

      const copyButton = screen.getByText("Copy");
      await act(async () => {
        fireEvent.click(copyButton);
        await Promise.resolve();
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("ABC123");
      expect(screen.getByText("Copied")).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });
      expect(screen.getByText("Copy")).toBeInTheDocument();
    });
  });

  it("shows the device-local time alongside the destination time when requested", () => {
    render(
      <ul>
        <ItineraryCard item={resolvedItem()} timeState="future" timeZone="UTC" showDeviceTime />
      </ul>,
    );
    expect(screen.getByText(/local/)).toBeInTheDocument();
  });

  it("renders a travel estimate to the next item when one is given", () => {
    render(
      <ul>
        <ItineraryCard
          item={resolvedItem({ id: "a" })}
          nextItem={resolvedItem({ id: "b" })}
          timeState="future"
          timeZone="UTC"
        />
      </ul>,
    );
    expect(screen.getByTestId("travel-estimate")).toHaveTextContent("a-b");
  });

  it("omits the travel estimate when there is no next item", () => {
    render(
      <ul>
        <ItineraryCard item={resolvedItem()} timeState="future" timeZone="UTC" />
      </ul>,
    );
    expect(screen.queryByTestId("travel-estimate")).not.toBeInTheDocument();
  });
});
