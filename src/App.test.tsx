import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { getPathForMode } from "./lib/seo";
import App from "./App";

function getModeButtons(container: HTMLElement) {
  const modeSwitch = container.querySelector(".mode-switch");
  return modeSwitch ? Array.from(modeSwitch.querySelectorAll<HTMLButtonElement>(".mode-button")) : [];
}

describe("App", () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  it("restores the active mode from the current pathname", async () => {
    window.history.replaceState({}, "", getPathForMode("danneki"));

    const { container } = render(<App />);
    await waitFor(() => {
      const buttons = getModeButtons(container);
      expect(buttons).toHaveLength(3);
      expect(buttons[2]?.className).toContain("is-active");
    });
  });

  it("updates the pathname when switching modes", () => {
    const { container } = render(<App />);
    const buttons = getModeButtons(container);

    fireEvent.click(buttons[1]!);
    expect(window.location.pathname).toBe(getPathForMode("kingoketsu"));
    expect(buttons[1]?.className).toContain("is-active");

    fireEvent.click(buttons[0]!);
    expect(window.location.pathname).toBe(getPathForMode("liuren"));
    expect(buttons[0]?.className).toContain("is-active");
  });

  it("reacts to popstate navigation", async () => {
    const { container } = render(<App />);

    window.history.pushState({}, "", getPathForMode("kingoketsu"));
    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitFor(() => {
      const buttons = getModeButtons(container);
      expect(buttons[1]?.className).toContain("is-active");
    });
  });
});
