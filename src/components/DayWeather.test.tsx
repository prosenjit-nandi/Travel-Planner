import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DayWeather } from "./DayWeather";

vi.mock("../lib/weather", () => ({
  forecastFor: vi.fn(),
  weatherLabel: (code: number) => (code === 0 ? "Clear" : "Rain"),
}));

import { forecastFor } from "../lib/weather";

describe("DayWeather", () => {
  it("renders nothing when there's no forecast", async () => {
    vi.mocked(forecastFor).mockResolvedValue(null);
    const { container } = render(<DayWeather city="London" date="2026-07-25" />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the label and temperature range", async () => {
    vi.mocked(forecastFor).mockResolvedValue({ code: 0, maxC: 19.6, minC: 12.4 });
    render(<DayWeather city="London" date="2026-07-25" />);
    expect(await screen.findByText("Clear · 12–20°C")).toBeInTheDocument();
  });

  it("re-fetches when the city or date changes", async () => {
    vi.mocked(forecastFor).mockResolvedValue({ code: 0, maxC: 20, minC: 10 });
    const { rerender } = render(<DayWeather city="London" date="2026-07-25" />);
    await screen.findByText(/Clear/);

    rerender(<DayWeather city="Edinburgh" date="2026-07-26" />);
    await waitFor(() => expect(forecastFor).toHaveBeenCalledWith("Edinburgh", "2026-07-26"));
  });

  it("does not update state after unmounting before the forecast resolves", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let resolveForecast!: (v: null) => void;
    vi.mocked(forecastFor).mockReturnValue(
      new Promise((resolve) => {
        resolveForecast = resolve;
      }),
    );
    const { unmount } = render(<DayWeather city="London" date="2026-07-25" />);
    unmount();

    await act(async () => {
      resolveForecast(null);
      await Promise.resolve();
    });

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
