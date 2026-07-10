import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ItineraryItem } from "../data/types";
import { ItemThumbnail } from "./ItemThumbnail";

vi.mock("../lib/photo", () => ({
  photoFor: vi.fn(),
}));

import { photoFor } from "../lib/photo";

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

describe("ItemThumbnail", () => {
  it("renders nothing when there's no photo", async () => {
    vi.mocked(photoFor).mockResolvedValue(null);
    const { container } = render(<ItemThumbnail item={item({})} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the photo once resolved", async () => {
    vi.mocked(photoFor).mockResolvedValue("https://upload.wikimedia.org/museum.jpg");
    const { container } = render(<ItemThumbnail item={item({})} />);
    await waitFor(() => expect(container.querySelector("img")).toBeInTheDocument());
    expect(container.querySelector("img")).toHaveAttribute("src", "https://upload.wikimedia.org/museum.jpg");
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("hides itself if the image fails to load", async () => {
    vi.mocked(photoFor).mockResolvedValue("https://upload.wikimedia.org/broken.jpg");
    const { container } = render(<ItemThumbnail item={item({})} />);
    const img = await waitFor(() => {
      const el = container.querySelector("img");
      expect(el).toBeInTheDocument();
      return el!;
    });

    fireEvent.error(img);
    await waitFor(() => expect(container.querySelector("img")).not.toBeInTheDocument());
  });

  it("re-fetches when the item changes", async () => {
    vi.mocked(photoFor).mockResolvedValue("https://upload.wikimedia.org/a.jpg");
    const { rerender } = render(<ItemThumbnail item={item({ id: "a" })} />);
    await waitFor(() => expect(photoFor).toHaveBeenCalledTimes(1));

    rerender(<ItemThumbnail item={item({ id: "b" })} />);
    await waitFor(() => expect(photoFor).toHaveBeenCalledTimes(2));
  });

  it("does not update state after unmounting before the photo resolves", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let resolvePhoto!: (v: null) => void;
    vi.mocked(photoFor).mockReturnValue(
      new Promise((resolve) => {
        resolvePhoto = resolve;
      }),
    );
    const { unmount } = render(<ItemThumbnail item={item({})} />);
    unmount();

    await act(async () => {
      resolvePhoto(null);
      await Promise.resolve();
    });

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
