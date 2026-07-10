import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom doesn't implement the Clipboard API; real browsers (including iOS
// Safari, this app's actual target) do. Some test files (e.g. the
// Cloudflare Function tests) run under the "node" environment instead of
// jsdom, so guard against `window` not existing there.
if (typeof window !== "undefined") {
  Object.defineProperty(window.navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
}

afterEach(() => {
  cleanup();
});
