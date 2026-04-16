import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KINGOKETSU_FIXTURES, buildKingoketsuChart } from "../lib/kingoketsu";
import type { KingoketsuChart } from "../lib/types";
import { KingoketsuHelperPanel } from "./KingoketsuHelperPanel";

describe("KingoketsuHelperPanel", () => {
  it("renders even when optional narrative arrays are missing", () => {
    const chart = buildKingoketsuChart(KINGOKETSU_FIXTURES[0].input);
    const regressionChart = {
      ...chart,
      helperSections: undefined,
      explanationSections: undefined,
      interpretationSections: undefined,
      traces: undefined,
    } as unknown as KingoketsuChart;

    render(<KingoketsuHelperPanel chart={regressionChart} />);

    expect(screen.getByText("機械解説")).toBeInTheDocument();
    expect(screen.getByText("Source-backed drawer")).toBeInTheDocument();
  });
});

