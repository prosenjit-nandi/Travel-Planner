import { describe, expect, it, vi } from "vitest";

describe("main entry point", () => {
  it("mounts App into #root inside StrictMode", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);

    const renderMock = vi.fn();
    const createRootMock = vi.fn(() => ({ render: renderMock }));
    vi.doMock("react-dom/client", () => ({ createRoot: createRootMock }));
    vi.doMock("./App.tsx", () => ({ default: () => null }));

    await import("./main.tsx");

    expect(createRootMock).toHaveBeenCalledWith(root);
    expect(renderMock).toHaveBeenCalledTimes(1);

    vi.doUnmock("react-dom/client");
    vi.doUnmock("./App.tsx");
    document.body.removeChild(root);
  });
});
