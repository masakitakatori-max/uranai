import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildDannekiChart } from "../lib/danneki";
import type { DannekiChart, DannekiInput } from "../lib/types";
import { DannekiHelperPanel } from "./DannekiHelperPanel";

const baseInput: DannekiInput = {
  year: 2026,
  month: 4,
  day: 12,
  hour: 15,
  minute: 0,
  locationId: "akashi",
  topic: "邱丞粋" as DannekiInput["topic"],
  questionText: "",
  lineInputMode: "auto",
  manualLineValues: null,
};

describe("DannekiHelperPanel", () => {
  it("renders even when line and narrative arrays are missing", () => {
    const chart = buildDannekiChart(baseInput);
    const regressionChart = {
      ...chart,
      lines: undefined,
      explanationSections: undefined,
      interpretationSections: undefined,
    } as unknown as DannekiChart;

    const { container } = render(<DannekiHelperPanel chart={regressionChart} />);

    expect(container.querySelector(".helper-panel")).not.toBeNull();
    expect(container.querySelector(".source-drawer")).not.toBeNull();
    expect(container.querySelectorAll(".annotation-item")).toHaveLength(0);
  });
});
