import { describe, expect, it } from "vitest";

import { buildQimenChart } from "./qimen";
import type { QimenBoardKind, QimenInput } from "./types";

function createInput(overrides: Partial<QimenInput> = {}): QimenInput {
  return {
    year: 2015,
    month: 8,
    day: 2,
    hour: 16,
    minute: 0,
    locationId: "akashi",
    topic: "総合",
    questionText: "",
    targetDirection: "東",
    ...overrides,
  };
}

function getBoard(chart: ReturnType<typeof buildQimenChart>, kind: QimenBoardKind) {
  const board = chart.boards.find((candidate) => candidate.kind === kind);
  if (!board) {
    throw new Error(`Missing board: ${kind}`);
  }
  return board;
}

describe("buildQimenChart", () => {
  it("uses the book fixture for 2015-08-02 16:00 time board", () => {
    const chart = buildQimenChart(createInput());
    const dayBoard = getBoard(chart, "day");
    const timeBoard = getBoard(chart, "time");

    expect(chart.basis.dayPillar.ganzhi).toBe("庚戌");
    expect(chart.basis.hourPillar.ganzhi).toBe("甲申");
    expect(dayBoard.basis.yinYang).toBe("陰");
    expect(dayBoard.basis.juNumber).toBe(8);
    expect(timeBoard.basis.yinYang).toBe("陰");
    expect(timeBoard.basis.juNumber).toBe(2);
    expect(timeBoard.palaces).toHaveLength(9);
    expect(chart.directionJudgments).toHaveLength(8);
    expect(chart.selectedDirectionJudgment.direction).toBe("東");
  });

  it("builds the 2015 year and September month boards from the supported book range", () => {
    const chart = buildQimenChart(createInput({ month: 9, day: 12, hour: 12 }));
    const yearBoard = getBoard(chart, "year");
    const monthBoard = getBoard(chart, "month");

    expect(chart.basis.yearPillar.ganzhi).toBe("乙未");
    expect(chart.basis.monthPillar.ganzhi).toBe("乙酉");
    expect(yearBoard.basis.yinYang).toBe("陰");
    expect(yearBoard.basis.juNumber).toBe(7);
    expect(monthBoard.basis.yinYang).toBe("陰");
    expect(monthBoard.basis.juNumber).toBe(1);
  });

  it("marks non-fixture day and time ju as derived instead of confirmed", () => {
    const chart = buildQimenChart(createInput({ year: 2026, month: 4, day: 18, hour: 12 }));
    const dayBoard = getBoard(chart, "day");
    const timeBoard = getBoard(chart, "time");

    expect(dayBoard.basis.certainty).toBe("derived");
    expect(timeBoard.basis.certainty).toBe("derived");
    expect(chart.messages.some((message) => message.includes("局数表で再校正"))).toBe(true);
  });
});
