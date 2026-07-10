import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LegThumbnail } from "./LegThumbnail";

vi.mock("../lib/photo", () => ({
  photoForQuery: vi.fn(),
}));

import { photoForQuery } from "../lib/photo";

afterEach(() => {
  vi.clearAllMocks();
});

describe("LegThumbnail", () => {
  it("renders nothing when there's no photo", async () => {
    vi.mocked(photoForQuery).mockResolvedValue(null);
    const { container } = render(<LegThumbnail query="Nowhere" />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the photo once resolved", async () => {
    vi.mocked(photoForQuery).mockResolvedValue("https://upload.wikimedia.org/london.jpg");
    const { container } = render(<LegThumbnail query="London" />);
    await waitFor(() => expect(container.querySelector("img")).toBeInTheDocument());
    expect(container.querySelector("img")).toHaveAttribute("src", "https://upload.wikimedia.org/london.jpg");
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("hides itself if the image fails to load", async () => {
    vi.mocked(photoForQuery).mockResolvedValue("https://upload.wikimedia.org/broken.jpg");
    const { container } = render(<LegThumbnail query="London" />);
    const img = await waitFor(() => {
      const el = container.querySelector("img");
      expect(el).toBeInTheDocument();
      return el!;
    });

    fireEvent.error(img);
    await waitFor(() => expect(container.querySelector("img")).not.toBeInTheDocument());
  });

  it("re-fetches when the query changes", async () => {
    vi.mocked(photoForQuery).mockResolvedValue("https://upload.wikimedia.org/a.jpg");
    const { rerender } = render(<LegThumbnail query="London" />);
    await waitFor(() => expect(photoForQuery).toHaveBeenCalledWith("London"));

    rerender(<LegThumbnail query="Edinburgh" />);
    await waitFor(() => expect(photoForQuery).toHaveBeenCalledWith("Edinburgh"));
  });

  it("does not update state after unmounting before the photo resolves", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let resolvePhoto!: (v: null) => void;
    vi.mocked(photoForQuery).mockReturnValue(
      new Promise((resolve) => {
        resolvePhoto = resolve;
      }),
    );
    const { unmount } = render(<LegThumbnail query="London" />);
    unmount();

    await act(async () => {
      resolvePhoto(null);
      await Promise.resolve();
    });

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
