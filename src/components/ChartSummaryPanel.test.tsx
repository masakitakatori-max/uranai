import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChartSummaryPanel } from "./ChartSummaryPanel";

describe("ChartSummaryPanel", () => {
  it("renders a result header and summary details", () => {
    render(
      <ChartSummaryPanel
        modeLabel="六壬神課"
        headline="topic / lesson type"
        correctedDateTime="2026-04-14 12:00"
        certainty="derived"
        caveat="trace only"
        sourceCount={3}
        details={[
          { label: "month general", value: "寅" },
          { label: "hour branch", value: "子" },
        ]}
      />,
    );

    expect(screen.getByText("結果サマリ")).toBeInTheDocument();
    expect(screen.getByText("六壬神課")).toBeInTheDocument();
    expect(screen.getByText("出典 3件")).toBeInTheDocument();
    expect(screen.getByText("month general")).toBeInTheDocument();
  });
});
