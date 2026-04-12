import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

describe("App", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
    vi.useRealTimers();
    cleanup();
  });

  it("renders all three workspaces with qualitative consultation input", { timeout: 15000 }, () => {
    render(<App />);

    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(10);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getAllByText("第1課").length).toBeGreaterThan(0);
    expect(screen.getByText("解説")).toBeInTheDocument();
    expect(screen.getByText("解釈")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "金口訣" }));

    expect(screen.getByText("金口訣 盤")).toBeInTheDocument();
    expect(screen.getAllByText("地分").length).toBeGreaterThan(0);
    expect(screen.getByText("解説")).toBeInTheDocument();
    expect(screen.getByText("解釈")).toBeInTheDocument();
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(9);

    fireEvent.click(screen.getByRole("button", { name: "断易" }));

    expect(screen.getByText("断易モード")).toBeInTheDocument();
    expect(screen.getAllByText("用神候補").length).toBeGreaterThan(0);
    expect(screen.getByText("解説")).toBeInTheDocument();
    expect(screen.getByText("解釈")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/danneki/");
    expect(document.title).toContain("断易");
  });

  it("resolves the initial mode from the pathname and updates metadata", () => {
    window.history.replaceState({}, "", "/kingoketsu/");

    render(<App />);

    expect(screen.getByText("金口訣 盤")).toBeInTheDocument();
    expect(document.title).toContain("金口訣");
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute("content")).toContain("/kingoketsu/");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toContain("/kingoketsu/");
  });

  it("uses the current time preset when 今日 is pressed", () => {
    window.history.replaceState({}, "", "/");
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 13, 9, 45));

    render(<App />);

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
});
