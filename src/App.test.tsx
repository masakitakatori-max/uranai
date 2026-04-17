import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPathForMode } from "./lib/seo";
import App from "./App";

const APP_TEST_TIMEOUT = 90_000;
const WORKSPACE_WAIT_TIMEOUT = 60_000;

function getModeButtons(container: HTMLElement) {
  const modeSwitch = container.querySelector(".mode-switch");
  return modeSwitch ? Array.from(modeSwitch.querySelectorAll<HTMLButtonElement>(".mode-button")) : [];
}

describe("App", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
    vi.useRealTimers();
    cleanup();
  });

  it("renders all workspaces and can switch to qimen and taiitsu", { timeout: APP_TEST_TIMEOUT }, async () => {
    render(<App />);

    await waitFor(
      () => {
        expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
      },
      { timeout: WORKSPACE_WAIT_TIMEOUT },
    );

    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(10);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getAllByText("第1課").length).toBeGreaterThan(0);
    expect(screen.getByText("解説")).toBeInTheDocument();
    expect(screen.getByText("解釈")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "奇門遁甲" }));

    expect(screen.getByRole("heading", { level: 1, name: "奇門遁甲 四盤作成ツール" })).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.getByRole("heading", { level: 2, name: "奇門遁甲 四盤作成" })).toBeInTheDocument();
      },
      { timeout: WORKSPACE_WAIT_TIMEOUT },
    );
    expect(screen.getByRole("heading", { level: 2, name: "全方位一覧と選択方位" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "奇門遁甲 全方位一覧" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/qimen/");
    expect(document.title).toContain("奇門遁甲 四盤作成ツール");

    fireEvent.click(screen.getByRole("button", { name: "金口訣" }));

    expect(screen.getByRole("heading", { level: 1, name: /金口訣/ })).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.getAllByText("地分").length).toBeGreaterThan(0);
      },
      { timeout: WORKSPACE_WAIT_TIMEOUT },
    );
    expect(screen.getAllByText("地分").length).toBeGreaterThan(0);
    expect(screen.getByText("解説")).toBeInTheDocument();
    expect(screen.getByText("解釈")).toBeInTheDocument();
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(9);

    fireEvent.click(screen.getByRole("button", { name: "断易" }));

    expect(screen.getByRole("heading", { level: 1, name: /断易盤/ })).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.getAllByText("用神候補").length).toBeGreaterThan(0);
      },
      { timeout: WORKSPACE_WAIT_TIMEOUT },
    );
    expect(screen.getAllByText("用神候補").length).toBeGreaterThan(0);
    expect(screen.getByText("解説")).toBeInTheDocument();
    expect(screen.getByText("解釈")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/danneki/");
    expect(document.title).toContain("断易");

    fireEvent.click(screen.getByRole("button", { name: "太乙神数" }));

    expect(screen.getByRole("heading", { level: 1, name: /太乙神数盤/ })).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.getAllByText("起局条件").length).toBeGreaterThan(0);
      },
      { timeout: WORKSPACE_WAIT_TIMEOUT },
    );
    expect(screen.getAllByText("方位").length).toBeGreaterThan(0);
    expect(screen.getByText("PDF根拠参照")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/taiitsu/");
    expect(document.title).toContain("太乙神数");
  });

  it("resolves the initial mode from the pathname and updates metadata", { timeout: APP_TEST_TIMEOUT }, async () => {
    window.history.replaceState({}, "", "/kingoketsu/");

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
      },
      { timeout: WORKSPACE_WAIT_TIMEOUT },
    );

    expect(screen.getByRole("heading", { level: 1, name: /金口訣/ })).toBeInTheDocument();
    expect(document.title).toContain("金口訣");
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute("content")).toContain("/kingoketsu/");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toContain("/kingoketsu/");
  });

  it("resolves the qimen route and updates metadata", { timeout: APP_TEST_TIMEOUT }, async () => {
    window.history.replaceState({}, "", "/qimen/");

    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "奇門遁甲 四盤作成ツール" })).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.getByRole("heading", { level: 2, name: "奇門遁甲 四盤作成" })).toBeInTheDocument();
      },
      { timeout: WORKSPACE_WAIT_TIMEOUT },
    );
    expect(document.title).toContain("奇門遁甲 四盤作成ツール");
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute("content")).toContain("/qimen/");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toContain("/qimen/");
  });

  it("resolves the taiitsu route and updates metadata", { timeout: APP_TEST_TIMEOUT }, async () => {
    window.history.replaceState({}, "", "/taiitsu/");

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getAllByText("太乙神数").length).toBeGreaterThan(0);
      },
      { timeout: WORKSPACE_WAIT_TIMEOUT },
    );

    expect(screen.getByRole("heading", { level: 1, name: /太乙神数盤/ })).toBeInTheDocument();
    expect(document.title).toContain("太乙神数");
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute("content")).toContain("/taiitsu/");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toContain("/taiitsu/");
  });

  it("uses the current time preset when 今日 is pressed", { timeout: APP_TEST_TIMEOUT }, async () => {
    window.history.replaceState({}, "", "/");

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
      },
      { timeout: WORKSPACE_WAIT_TIMEOUT },
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 13, 9, 45));

    fireEvent.change(screen.getByLabelText("年"), { target: { value: "2006" } });
    fireEvent.change(screen.getByLabelText("月"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("日"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("時"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("分"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "今日" }));

    expect(screen.getByLabelText("年")).toHaveValue("2026");
    expect(screen.getByLabelText("月")).toHaveValue("4");
    expect(screen.getByLabelText("日")).toHaveValue("13");
    expect(screen.getByLabelText("時")).toHaveValue("9");
    expect(screen.getByLabelText("分")).toHaveValue("45");
  });

  it("updates the pathname when switching modes", { timeout: APP_TEST_TIMEOUT }, () => {
    const { container } = render(<App />);
    const buttons = getModeButtons(container);

    fireEvent.click(buttons[2]!);
    expect(window.location.pathname).toBe(getPathForMode("kingoketsu"));
    expect(buttons[2]?.className).toContain("is-active");

    fireEvent.click(buttons[0]!);
    expect(window.location.pathname).toBe(getPathForMode("liuren"));
    expect(buttons[0]?.className).toContain("is-active");

    fireEvent.click(buttons[4]!);
    expect(window.location.pathname).toBe(getPathForMode("taiitsu"));
    expect(buttons[4]?.className).toContain("is-active");
  });

  it("reacts to popstate navigation", { timeout: APP_TEST_TIMEOUT }, async () => {
    const { container } = render(<App />);

    window.history.pushState({}, "", getPathForMode("kingoketsu"));
    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitFor(() => {
      const buttons = getModeButtons(container);
      expect(buttons[2]?.className).toContain("is-active");
    });
  });
});
