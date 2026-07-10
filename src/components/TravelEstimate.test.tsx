import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ItineraryItem } from "../data/types";
import { TravelEstimate } from "./TravelEstimate";

vi.mock("../lib/travelEstimate", () => ({
  estimateTimeToNext: vi.fn(),
}));

import { estimateTimeToNext } from "../lib/travelEstimate";

afterEach(() => {
  vi.clearAllMocks();
});

function item(overrides: Partial<ItineraryItem>): ItineraryItem {
  return {
    id: "1",
    date: "2026-07-25",
    startTime: "09:00",
    endTime: "10:00",
    activity: "Test",
    locationName: "Somewhere",
    category: "Excursion",
    ...overrides,
  };
}

describe("TravelEstimate", () => {
  it("renders nothing when there's no estimate", async () => {
    vi.mocked(estimateTimeToNext).mockResolvedValue(null);
    const { container } = render(<TravelEstimate from={item({ id: "a" })} to={item({ id: "b" })} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a walk estimate", async () => {
    vi.mocked(estimateTimeToNext).mockResolvedValue({ mode: "walk", minutes: 12 });
    render(<TravelEstimate from={item({ id: "a" })} to={item({ id: "b" })} />);
    expect(await screen.findByText(/12m walk to next/)).toBeInTheDocument();
  });

  it("renders a drive estimate", async () => {
    vi.mocked(estimateTimeToNext).mockResolvedValue({ mode: "drive", minutes: 25 });
    render(<TravelEstimate from={item({ id: "a" })} to={item({ id: "b" })} />);
    expect(await screen.findByText(/25m drive to next/)).toBeInTheDocument();
  });

  it("passes the region through and re-fetches when the items change", async () => {
    vi.mocked(estimateTimeToNext).mockResolvedValue({ mode: "walk", minutes: 5 });
    const { rerender } = render(
      <TravelEstimate from={item({ id: "a" })} to={item({ id: "b" })} region="United Kingdom" />,
    );
    await screen.findByText(/5m walk to next/);
    expect(estimateTimeToNext).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a" }),
      expect.objectContaining({ id: "b" }),
      "United Kingdom",
    );

    rerender(<TravelEstimate from={item({ id: "c" })} to={item({ id: "d" })} region="United Kingdom" />);
    await waitFor(() => expect(estimateTimeToNext).toHaveBeenCalledTimes(2));
  });

  it("does not update state after unmounting before the estimate resolves", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let resolveEstimate!: (v: null) => void;
    vi.mocked(estimateTimeToNext).mockReturnValue(
      new Promise((resolve) => {
        resolveEstimate = resolve;
      }),
    );
    const { unmount } = render(<TravelEstimate from={item({ id: "a" })} to={item({ id: "b" })} />);
    unmount();

    await act(async () => {
      resolveEstimate(null);
      await Promise.resolve();
    });

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
