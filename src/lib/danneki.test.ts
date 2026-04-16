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
  lineInputMode: "auto",
  manualLineValues: null,
};

describe("buildDannekiChart", () => {
  it("builds a deterministic chart from time and question", () => {
    const chart = buildDannekiChart({
      ...baseInput,
      questionText: "今の転職活動でA社に寄せるべきか、それとも独立準備を優先すべきか。",
    });

    expect(chart.topic).toBe("仕事");
    expect(chart.lines).toHaveLength(6);
    expect(chart.basis.movingLines.length).toBeGreaterThanOrEqual(0);
    expect(chart.explanationSections[0]?.paragraphs[0]).toContain("基準時刻");
    expect(chart.basis.dayGanzhi.length).toBe(2);
    expect(chart.lines[0]?.branch).toBeTruthy();
  });

  it("returns the same structure for the same input", () => {
    const first = buildDannekiChart(baseInput);
    const second = buildDannekiChart(baseInput);

    expect(first.basis.derivedSeed).toBe(second.basis.derivedSeed);
    expect(first.basis.movingLines).toEqual(second.basis.movingLines);
    expect(first.lines.map((line) => line.value)).toEqual(second.lines.map((line) => line.value));
  });

  it("accepts manual line values", () => {
    const manual = buildDannekiChart({
      ...baseInput,
      lineInputMode: "manual",
      manualLineValues: [6, 7, 8, 9, 6, 7],
    });

    expect(manual.lines.map((line) => line.value)).toEqual([6, 7, 8, 9, 6, 7]);
    expect(manual.basis.movingLines).toEqual([1, 4, 5]);
  });

  it("rejects an unknown location instead of silently falling back to akashi", () => {
    expect(() =>
      buildDannekiChart({
        ...baseInput,
        locationId: "unknown-location",
      }),
    ).toThrow(/location/i);
  });

  it("keeps six-kin assignments stable across different day elements when the same hexagram is used", () => {
    const manualLineValues: DannekiInput["manualLineValues"] = [7, 7, 7, 8, 8, 8];
    const charts = [];

    for (let day = 1; day <= 10; day += 1) {
      charts.push(
        buildDannekiChart({
          ...baseInput,
          year: 2026,
          month: 4,
          day,
          lineInputMode: "manual",
          manualLineValues,
        }),
      );
    }

    const first = charts[0];
    const second = charts.find((chart) => chart.basis.dayElement !== first.basis.dayElement);

    expect(second).toBeTruthy();
    expect(first.lines.map((line) => line.relation)).toEqual(second!.lines.map((line) => line.relation));
  });

  it("downranks month-broken candidates when choosing the use-god line", () => {
    let targetChart: ReturnType<typeof buildDannekiChart> | null = null;

    for (let month = 1; month <= 12 && !targetChart; month += 1) {
      for (let day = 1; day <= 28 && !targetChart; day += 1) {
        const chart = buildDannekiChart({
          ...baseInput,
          year: 2026,
          month,
          day,
          topic: "金運",
          lineInputMode: "manual",
          manualLineValues: [7, 7, 7, 8, 8, 8],
        });

        if (chart.basis.monthBranch === "午") {
          targetChart = chart;
        }
      }
    }

    expect(targetChart).not.toBeNull();
    expect(targetChart!.lines[0].relation).toBe("妻財");
    expect(targetChart!.lines[4].relation).toBe("妻財");
    expect(targetChart!.lines[0].isMonthBroken).toBe(true);
    expect(targetChart!.lines[4].isMonthBroken).toBe(false);
    expect(targetChart!.basis.useGodLine).toBe(5);
  });

  it("replays the same chart structure when auto-generated lines are fed back in manual mode", () => {
    const autoChart = buildDannekiChart({
      ...baseInput,
      questionText: "今の案件をこのまま進めるべきか、それとも一度止めて再整理すべきか見たいです。",
    });

    const manualChart = buildDannekiChart({
      ...baseInput,
      questionText: "今の案件をこのまま進めるべきか、それとも一度止めて再整理すべきか見たいです。",
      lineInputMode: "manual",
      manualLineValues: autoChart.lines.map((line) => line.value) as DannekiInput["manualLineValues"],
    });

    expect(manualChart.lines.map((line) => line.value)).toEqual(autoChart.lines.map((line) => line.value));
    expect(manualChart.basis.movingLines).toEqual(autoChart.basis.movingLines);
    expect(manualChart.basis.upperTrigram.key).toBe(autoChart.basis.upperTrigram.key);
    expect(manualChart.basis.lowerTrigram.key).toBe(autoChart.basis.lowerTrigram.key);
    expect(manualChart.basis.changedUpperTrigram.key).toBe(autoChart.basis.changedUpperTrigram.key);
    expect(manualChart.basis.changedLowerTrigram.key).toBe(autoChart.basis.changedLowerTrigram.key);
    expect(manualChart.basis.useGodLine).toBe(autoChart.basis.useGodLine);
  });

  it("infers the topic from the qualitative question before choosing the use deity", () => {
    const chart = buildDannekiChart({
      ...baseInput,
      topic: baseInput.topic,
      questionText: "取引先との契約を進めるべきか、今月の商談運を見てください。",
    });

    expect(chart.topic).not.toBe(baseInput.topic);
    expect(chart.basis.useDeity).toBe("官鬼");
    expect(chart.interpretationSections.flatMap((section) => section.paragraphs).join(" ")).toContain("相談文");
  });

  it("marks exactly one use-god line when a candidate is resolved", () => {
    const chart = buildDannekiChart({
      ...baseInput,
      topic: "健康",
      lineInputMode: "manual",
      manualLineValues: [7, 7, 7, 8, 8, 8],
    });

    const useGodLines = chart.lines.filter((line) => line.useGodRole === "用神");

    expect(chart.basis.useGodLine).not.toBeNull();
    expect(useGodLines).toHaveLength(1);
    expect(useGodLines[0].position).toBe(chart.basis.useGodLine);
  });

  it("attaches a book-backed near example when the question matches a known case", () => {
    const chart = buildDannekiChart({
      ...baseInput,
      questionText: "誕生日プレゼントは何になるでしょうか。",
    });

    const bookCaseSection = chart.interpretationSections.find((section) => section.key === "danneki-book-case");

    expect(bookCaseSection).toBeTruthy();
    expect(bookCaseSection?.paragraphs.join(" ")).toContain("誕生日プレゼント");
    expect(bookCaseSection?.paragraphs.join(" ")).toContain("img_0065");
  });

  it("does not attach a book case for a vague question that merely shares generic words", () => {
    const chart = buildDannekiChart({
      ...baseInput,
      questionText: "このプレゼント案はどうでしょうか。",
    });

    const bookCaseSection = chart.interpretationSections.find((section) => section.key === "danneki-book-case");

    expect(bookCaseSection).toBeUndefined();
  });
});
