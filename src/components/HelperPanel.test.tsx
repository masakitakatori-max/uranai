import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildLiurenChart } from "../lib/engine";
import type { LiurenChart, LiurenInput } from "../lib/types";
import { HelperPanel } from "./HelperPanel";

const baseInput: LiurenInput = {
  year: 2006,
  month: 5,
  day: 12,
  hour: 12,
  minute: 0,
  locationId: "akashi",
  topic: "邱丞粋" as LiurenInput["topic"],
  questionText: "",
  manualOverrides: {
    dayGanzhi: "",
    monthGeneral: "",
    hourBranch: "",
  },
};

describe("HelperPanel", () => {
  it("renders even when annotation and narrative arrays are missing", () => {
    const chart = buildLiurenChart(baseInput);
    const regressionChart = {
      ...chart,
      helperAnnotations: undefined,
      explanationSections: undefined,
      interpretationSections: undefined,
    } as unknown as LiurenChart;

    const { container } = render(<HelperPanel chart={regressionChart} />);

    expect(container.querySelector(".helper-panel")).not.toBeNull();
    expect(container.querySelector(".source-drawer")).not.toBeNull();
    expect(container.querySelectorAll(".annotation-item")).toHaveLength(0);
  });
});
