import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RenderErrorBoundary } from "./RenderErrorBoundary";

function ThrowingChild(): never {
  throw new Error("boom");
}

describe("RenderErrorBoundary", () => {
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  it("keeps the app shell alive when a child render throws", () => {
    render(
      <RenderErrorBoundary modeLabel="Test Mode">
        <ThrowingChild />
      </RenderErrorBoundary>,
    );

    expect(screen.getByText("Test Mode rendering failed")).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
