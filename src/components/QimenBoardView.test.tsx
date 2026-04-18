import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildQimenChart } from "../lib/qimen";
import type { QimenChart, QimenInput } from "../lib/types";
import { QimenBoardView } from "./QimenBoardView";

const baseInput: QimenInput = {
  year: 2026,
  month: 4,
  day: 18,
  hour: 12,
  minute: 0,
  locationId: "akashi",
  topic: "総合",
  questionText: "",
  targetDirection: "東",
};

describe("QimenBoardView", () => {
  it("renders even when board arrays and relations are missing", () => {
    const chart = buildQimenChart(baseInput);
    const regressionChart = {
      ...chart,
      boards: undefined,
      directionJudgments: undefined,
      relations: undefined,
      messages: undefined,
    } as unknown as QimenChart;

    const { container } = render(<QimenBoardView chart={regressionChart} />);

    expect(container.querySelector(".board-panel")).not.toBeNull();
    expect(container.querySelector(".relationship-map")).not.toBeNull();
  });

  it("renders relationship map and five-element chips", () => {
    const chart = buildQimenChart(baseInput);

    const { container } = render(<QimenBoardView chart={chart} />);

    expect(container.querySelector(".relationship-map")).not.toBeNull();
    expect(container.querySelector(".element-badge")).not.toBeNull();
  });
});
