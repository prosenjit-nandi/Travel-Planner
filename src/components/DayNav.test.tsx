import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DayNav } from "./DayNav";

const DATES = ["2026-07-24", "2026-07-25", "2026-07-26"];

describe("DayNav", () => {
  it("disables Previous on the first day and calls onChange with the next day", () => {
    const onChange = vi.fn();
    render(<DayNav date={DATES[0]} dates={DATES} onChange={onChange} />);

    expect(screen.getByLabelText("Previous day")).toBeDisabled();
    expect(screen.getByLabelText("Next day")).not.toBeDisabled();

    fireEvent.click(screen.getByLabelText("Next day"));
    expect(onChange).toHaveBeenCalledWith("2026-07-25");
  });

  it("disables Next on the last day and calls onChange with the previous day", () => {
    const onChange = vi.fn();
    render(<DayNav date={DATES[2]} dates={DATES} onChange={onChange} />);

    expect(screen.getByLabelText("Next day")).toBeDisabled();
    expect(screen.getByLabelText("Previous day")).not.toBeDisabled();

    fireEvent.click(screen.getByLabelText("Previous day"));
    expect(onChange).toHaveBeenCalledWith("2026-07-25");
  });

  it("enables both buttons in the middle of the range", () => {
    render(<DayNav date={DATES[1]} dates={DATES} onChange={() => {}} />);
    expect(screen.getByLabelText("Previous day")).not.toBeDisabled();
    expect(screen.getByLabelText("Next day")).not.toBeDisabled();
  });

  it("disables both buttons when the current date isn't in the list", () => {
    render(<DayNav date="2099-01-01" dates={DATES} onChange={() => {}} />);
    expect(screen.getByLabelText("Previous day")).toBeDisabled();
    expect(screen.getByLabelText("Next day")).toBeDisabled();
  });
});
