import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { RuleTrace, SourceReference } from "../lib/types";
import { ChartEvidencePanel } from "./ChartEvidencePanel";

const sourceReferences: SourceReference[] = [
  {
    id: "source:test",
    label: "Test source",
    detail: "chapter detail",
    imageId: "img_0001",
    chapter: "chapter",
  },
];

const traces: RuleTrace[] = [
  {
    ruleId: "rule:test",
    step: "step",
    value: "value",
    source: "lookup",
    sourceRef: sourceReferences[0],
    reason: "reason",
    certainty: "confirmed",
  },
];

describe("ChartEvidencePanel", () => {
  it("renders trace and source-backed drawer content", () => {
    render(<ChartEvidencePanel certainty="confirmed" traces={traces} sourceReferences={sourceReferences} />);

    expect(screen.getByText("Trace")).toBeInTheDocument();
    expect(screen.getByText("Source-backed drawer")).toBeInTheDocument();
    expect(screen.getByText("rule:test")).toBeInTheDocument();
    expect(screen.getByText("Test source")).toBeInTheDocument();
  });
});
