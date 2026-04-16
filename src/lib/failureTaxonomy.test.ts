import { describe, expect, it } from "vitest";

import { buildFailurePareto, classifyFailure } from "./failureTaxonomy";

describe("failureTaxonomy", () => {
  it("classifies silent fallback style failures", () => {
    expect(classifyFailure({ message: "locationId fallback to akashi" })).toBe("silent_fallback");
    expect(classifyFailure({ message: "三伝未確定なのに代用で読む" })).toBe("silent_fallback");
  });

  it("classifies contract mismatches and missing guards", () => {
    expect(classifyFailure({ message: "minimum length mismatch between UI and API" })).toBe("contract_mismatch");
    expect(classifyFailure({ message: "Cannot read properties of undefined (reading 'map')" })).toBe("missing_guard");
  });

  it("classifies auth and knowledge gaps", () => {
    expect(classifyFailure({ message: "localStorage token leak risk" })).toBe("auth_boundary");
    expect(classifyFailure({ message: "fixture is thin and rule table is incomplete" })).toBe("book_knowledge_gap");
  });

  it("builds a weighted pareto summary", () => {
    const pareto = buildFailurePareto([
      { category: "silent_fallback", severity: "critical", surface: "engine", message: "fallback" },
      { category: "silent_fallback", severity: "high", surface: "engine", message: "fallback" },
      { category: "missing_guard", severity: "medium", surface: "ui", message: "undefined" },
      { category: "book_knowledge_gap", severity: "low", surface: "knowledge", message: "thin rules" },
    ]);

    expect(pareto[0]?.category).toBe("silent_fallback");
    expect(pareto[0]?.weightedScore).toBeGreaterThan(pareto[1]?.weightedScore ?? 0);
    expect(pareto[0]?.cumulativeShare).toBeGreaterThan(0);
    expect(pareto[0]?.cumulativeShare).toBeLessThanOrEqual(1);
  });
});
