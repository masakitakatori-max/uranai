import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildTaiitsuChart } from "../lib/taiitsu";
import type { TaiitsuChart, TaiitsuInput } from "../lib/types";
import { TaiitsuBoardView } from "./TaiitsuBoardView";

const baseInput: TaiitsuInput = {
  year: 2026,
  month: 4,
  day: 16,
  hour: 12,
  minute: 0,
  locationId: "akashi",
  direction: "南",
  startCondition: "time-and-direction",
  topic: "総合",
  questionText: "",
};

describe("TaiitsuBoardView", () => {
  it("renders even when board arrays and relations are missing", () => {
    const chart = buildTaiitsuChart(baseInput);
    const regressionChart = {
      ...chart,
      cycleGrid: undefined,
      signals: undefined,
      relations: undefined,
      messages: undefined,
    } as unknown as TaiitsuChart;

    const { container } = render(<TaiitsuBoardView chart={regressionChart} />);

    expect(container.querySelector(".board-panel")).not.toBeNull();
    expect(container.querySelector(".relationship-map")).not.toBeNull();
  });

  it("renders relationship map and five-element chips", () => {
    const chart = buildTaiitsuChart(baseInput);

    const { container } = render(<TaiitsuBoardView chart={chart} />);

    expect(container.querySelector(".relationship-map")).not.toBeNull();
    expect(container.querySelector(".element-badge")).not.toBeNull();
  });
});
