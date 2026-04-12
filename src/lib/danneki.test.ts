import { describe, expect, it } from "vitest";

import { buildDannekiChart } from "./danneki";
import type { DannekiInput } from "./types";

const baseInput: DannekiInput = {
  year: 2026,
  month: 4,
  day: 12,
  hour: 15,
  minute: 0,
  locationId: "akashi",
  topic: "総合",
  questionText: "",
};

describe("buildDannekiChart", () => {
  it("builds a deterministic chart from time and question", () => {
    const chart = buildDannekiChart({
      ...baseInput,
      questionText: "今の転職活動でA社に寄せるべきか、それとも独立準備を優先すべきか。",
    });

    expect(chart.topic).toBe("仕事");
    expect(chart.lines).toHaveLength(6);
    expect(chart.basis.movingLines.length).toBeGreaterThan(0);
    expect(chart.explanationSections[0]?.paragraphs[0]).toContain("基準時刻");
    expect(chart.interpretationSections.flatMap((section) => section.paragraphs).join(" ")).toContain("相談文");
  });

  it("returns the same structure for the same input", () => {
    const first = buildDannekiChart(baseInput);
    const second = buildDannekiChart(baseInput);

    expect(first.basis.derivedSeed).toBe(second.basis.derivedSeed);
    expect(first.basis.movingLines).toEqual(second.basis.movingLines);
    expect(first.lines.map((line) => line.relation)).toEqual(second.lines.map((line) => line.relation));
  });
});
