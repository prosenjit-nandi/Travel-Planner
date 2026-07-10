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

  it("renders the detailed weather card with all metrics", async () => {
    vi.mocked(forecastFor).mockResolvedValue({
      code: 0,
      maxC: 25.4,
      minC: 15.1,
      sunrise: "05:42",
      sunset: "20:15",
      windSpeedMax: 12.3,
      precipitationProbabilityMax: 10,
      sunnyPercentage: 80,
      cloudyPercentage: 20,
      rainTimeOfDay: "No rain expected",
    });

    render(<DayWeather city="Paris" date="2026-07-25" />);

    expect(await screen.findByText("Paris")).toBeInTheDocument();
    expect(screen.getByText("Clear")).toBeInTheDocument();
    expect(screen.getByText("25°")).toBeInTheDocument();
    expect(screen.getByText("15°C")).toBeInTheDocument();

    expect(screen.getByText("Sunrise")).toBeInTheDocument();
    expect(screen.getByText("05:42")).toBeInTheDocument();
    expect(screen.getByText("Sunset")).toBeInTheDocument();
    expect(screen.getByText("20:15")).toBeInTheDocument();
    expect(screen.getByText("Wind Speed")).toBeInTheDocument();
    expect(screen.getByText("12 km/h")).toBeInTheDocument();
    expect(screen.getByText("Rain Chance")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();

    expect(screen.getByText("Sunny: 80%")).toBeInTheDocument();
    expect(screen.getByText("Cloudy: 20%")).toBeInTheDocument();

    expect(screen.getByText("Rain Schedule")).toBeInTheDocument();
    expect(screen.getByText("No rain expected")).toBeInTheDocument();
  });
});
