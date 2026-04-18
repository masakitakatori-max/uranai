import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KINGOKETSU_FIXTURES, buildKingoketsuChart } from "../lib/kingoketsu";
import type { KingoketsuChart } from "../lib/types";
import { KingoketsuBoardView } from "./KingoketsuBoardView";

describe("KingoketsuBoardView", () => {
  it("renders even when board arrays are missing", () => {
    const chart = buildKingoketsuChart(KINGOKETSU_FIXTURES[0].input);
    const regressionChart = {
      ...chart,
      positions: undefined,
      helperSections: undefined,
      relationSummary: undefined,
      relations: undefined,
      messages: undefined,
    } as unknown as KingoketsuChart;

    const { container } = render(<KingoketsuBoardView chart={regressionChart} />);

    expect(container.querySelector(".board-panel")).not.toBeNull();
    expect(container.querySelector(".relationship-map")).not.toBeNull();
  });

  it("renders relationship map and five-element chips", () => {
    const chart = buildKingoketsuChart(KINGOKETSU_FIXTURES[0].input);

    const { container } = render(<KingoketsuBoardView chart={chart} />);

    expect(container.querySelector(".relationship-map")).not.toBeNull();
    expect(container.querySelector(".element-badge")).not.toBeNull();
  });
});
