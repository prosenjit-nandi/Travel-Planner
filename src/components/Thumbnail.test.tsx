import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Thumbnail } from "./Thumbnail";

vi.mock("../lib/photo", () => ({
  photoForQuery: vi.fn(),
}));

import { photoForQuery } from "../lib/photo";

afterEach(() => {
  vi.clearAllMocks();
});

describe("Thumbnail", () => {
  it("renders nothing when there's no photo", async () => {
    vi.mocked(photoForQuery).mockResolvedValue(null);
    const { container } = render(<Thumbnail query="Nowhere" className="x" />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the photo with the given class once resolved", async () => {
    vi.mocked(photoForQuery).mockResolvedValue("https://upload.wikimedia.org/london.jpg");
    const { container } = render(<Thumbnail query="London" className="hero" />);
    await waitFor(() => expect(container.querySelector("img")).toBeInTheDocument());
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("src", "https://upload.wikimedia.org/london.jpg");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveClass("hero");
  });

  it("hides itself if the image fails to load", async () => {
    vi.mocked(photoForQuery).mockResolvedValue("https://upload.wikimedia.org/broken.jpg");
    const { container } = render(<Thumbnail query="London" className="x" />);
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
    const { rerender } = render(<Thumbnail query="London" className="x" />);
    await waitFor(() => expect(photoForQuery).toHaveBeenCalledWith("London"));

    rerender(<Thumbnail query="Edinburgh" className="x" />);
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
    const { unmount } = render(<Thumbnail query="London" className="x" />);
    unmount();

    await act(async () => {
      resolvePhoto(null);
      await Promise.resolve();
    });

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
