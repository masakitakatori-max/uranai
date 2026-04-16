import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildLiurenChart } from "../lib/engine";
import type { LiurenChart, LiurenInput } from "../lib/types";
import { BoardView } from "./BoardView";

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

describe("BoardView", () => {
  it("renders even when chart arrays are missing", () => {
    const chart = buildLiurenChart(baseInput);
    const regressionChart = {
      ...chart,
      plateCells: undefined,
      fourLessons: undefined,
      threeTransmissions: undefined,
      messages: undefined,
    } as unknown as LiurenChart;

    const { container } = render(<BoardView chart={regressionChart} />);

    expect(container.querySelector(".board-panel")).not.toBeNull();
  });
});
