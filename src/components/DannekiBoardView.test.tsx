import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildDannekiChart } from "../lib/danneki";
import type { DannekiChart, DannekiInput } from "../lib/types";
import { DannekiBoardView } from "./DannekiBoardView";

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

describe("DannekiBoardView", () => {
  it("renders even when line/message arrays are missing", () => {
    const chart = buildDannekiChart(baseInput);
    const regressionChart = {
      ...chart,
      lines: undefined,
      messages: undefined,
    } as unknown as DannekiChart;

    const { container } = render(<DannekiBoardView chart={regressionChart} />);

    expect(container.querySelector(".board-panel")).not.toBeNull();
  });
});
