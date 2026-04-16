import { afterEach, describe, expect, it, vi } from "vitest";

import { BRANCHES } from "./data/core";
import { getMissingSanChuanRowsForDay, SAN_CHUAN_EXPECTED_ROW_COUNT, SAN_CHUAN_MISSING_ROWS, SAN_CHUAN_ROW_COUNT } from "./data/sanChuanCoverage";
import { buildLiurenChart } from "./engine";
import type { LiurenInput } from "./types";

const baseInput: LiurenInput = {
  year: 2006,
  month: 5,
  day: 12,
  hour: 12,
  minute: 0,
  locationId: "akashi",
  topic: "総合",
  questionText: "",
  manualOverrides: {
    dayGanzhi: "",
    monthGeneral: "",
    hourBranch: "",
  },
};

describe("buildLiurenChart", () => {
  it("pins the current three-transmission lookup coverage", () => {
    expect(SAN_CHUAN_EXPECTED_ROW_COUNT).toBe(720);
    expect(SAN_CHUAN_ROW_COUNT).toBe(697);
    expect(SAN_CHUAN_MISSING_ROWS).toHaveLength(23);
    expect(getMissingSanChuanRowsForDay("壬寅").map((item) => item.upper)).toEqual(BRANCHES);
    expect(getMissingSanChuanRowsForDay("癸卯").map((item) => item.upper)).toEqual(BRANCHES.filter((branch) => branch !== "辰"));
  });

  it("reproduces the worked example", () => {
    const chart = buildLiurenChart(baseInput);
    const combinedText = `${chart.explanationSections.flatMap((section) => section.paragraphs).join(" ")} ${chart.interpretationSections
      .flatMap((section) => section.paragraphs)
      .join(" ")}`;

    expect(chart.basis.dayGanzhi).toBe("癸卯");
    expect(chart.basis.monthGeneral).toBe("酉");
    expect(chart.basis.hourBranch).toBe("午");
    expect(chart.basis.juNumber).toBe(10);
    expect(chart.lessonType).toBe("重審");
    expect(chart.fourLessons.map((lesson) => `${lesson.lower}/${lesson.upper}`)).toEqual(["癸/辰", "辰/未", "卯/午", "午/酉"]);
    expect(chart.threeTransmissions.map((item) => item.branch)).toEqual(["酉", "子", "卯"]);
    expect(chart.fourLessons.map((lesson) => lesson.sixKin)).toEqual(["官鬼", "官鬼", "妻財", "父母"]);
    expect(chart.threeTransmissions.map((item) => item.sixKin)).toEqual(["父母", "兄弟", "子孫"]);
    expect(chart.fourLessons.map((lesson) => lesson.heavenlyGeneral)).toEqual(["天后", "朱雀", "騰蛇", "勾陳"]);
    expect(chart.threeTransmissions.map((item) => item.heavenlyGeneral)).toEqual(["勾陳", "白虎", "太陰"]);
    expect(chart.topic).toBe("総合");
    expect(chart.explanationSections[0]?.paragraphs[0]).toContain("基準時刻");
    expect(chart.interpretationSections[0]?.paragraphs[0]).toContain("機械解釈");
    expect(combinedText).not.toContain("第1課を入口として読みます");
  });

  it("switches month general at the qi boundary", () => {
    const before = buildLiurenChart({
      ...baseInput,
      year: 2006,
      month: 5,
      day: 21,
      hour: 12,
      minute: 31,
    });
    const after = buildLiurenChart({
      ...baseInput,
      year: 2006,
      month: 5,
      day: 21,
      hour: 12,
      minute: 32,
    });

    expect(before.basis.monthGeneral).toBe("酉");
    expect(after.basis.monthGeneral).toBe("申");
  });

  it("applies local time correction before computing day and hour branch", () => {
    const chart = buildLiurenChart({
      ...baseInput,
      year: 2006,
      month: 5,
      day: 11,
      hour: 23,
      minute: 50,
      locationId: "tokyo23",
    });

    expect(chart.basis.correctedDateTime).toBe("2006-05-12 00:09");
    expect(chart.basis.dayGanzhi).toBe("癸卯");
    expect(chart.basis.hourBranch).toBe("子");
  });

  it("rejects an unknown location instead of silently falling back to akashi", () => {
    expect(() =>
      buildLiurenChart({
        ...baseInput,
        locationId: "unknown-location",
      }),
    ).toThrow(/location/i);
  });

  it("switches interpretation according to the selected topic", () => {
    const chart = buildLiurenChart({
      ...baseInput,
      topic: "仕事",
    });

    expect(chart.interpretationSections.some((section) => section.title === "仕事の見立て")).toBe(true);
    expect(chart.interpretationSections.flatMap((section) => section.paragraphs).join(" ")).toContain("仕事では");
  });

  it("infers the topic from the qualitative question", () => {
    const chart = buildLiurenChart({
      ...baseInput,
      topic: "総合",
      questionText: "転職先の会社に今週中に返事を出すべきか迷っています。",
    });

    expect(chart.topic).toBe("仕事");
    expect(chart.questionText).toContain("転職先");
    expect(chart.interpretationSections.flatMap((section) => section.paragraphs).join(" ")).toContain("相談文");
  });

  it("derives 壬寅 rows from four lessons while keeping the screenshot-gap note", () => {
    const chart = buildLiurenChart({
      ...baseInput,
      manualOverrides: {
        dayGanzhi: "壬寅",
        monthGeneral: "子",
        hourBranch: "亥",
      },
    });

    expect(chart.fourLessons[0]?.upper).toBe("子");
    expect(chart.lessonType).toBe("重審");
    expect(chart.threeTransmissions.map((item) => item.branch)).toEqual(["辰", "巳", "午"]);
    expect(chart.messages).toContain("三伝は四課規則から補完しました: 壬寅 / 干上神 子");
    expect(chart.messages.join(" ")).toContain("220117");
    expect(chart.messages.join(" ")).toContain("220127");
    expect(chart.explanationSections.flatMap((section) => section.paragraphs).join(" ")).not.toContain("仮の主軸");
    expect(chart.messages.join(" ")).toContain("子丑寅卯辰巳午未申酉戌亥");
  });

  it("keeps the manually recovered 癸卯 / 辰 row available", () => {
    const chart = buildLiurenChart({
      ...baseInput,
      manualOverrides: {
        dayGanzhi: "癸卯",
        monthGeneral: "子",
        hourBranch: "酉",
      },
    });

    expect(chart.fourLessons[0]?.upper).toBe("辰");
    expect(chart.lessonType).toBe("重審");
    expect(chart.threeTransmissions.map((item) => item.branch)).toEqual(["酉", "子", "卯"]);
    expect(chart.messages.some((message) => message.includes("三伝表データが未収録です"))).toBe(false);
  });
});

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("./sanChuanResolver");
});

describe("buildLiurenChart unresolved san-chuan safeguards", () => {
  it("stops interpretation instead of substituting lessons when san-chuan is unavailable", async () => {
    vi.doMock("./sanChuanResolver", () => ({
      resolveSanChuanRow: () => ({
        row: null,
        source: "missing",
        trace: [],
      }),
    }));

    const { buildLiurenChart: buildLiurenChartWithMissingSanChuan } = await import("./engine");
    const chart = buildLiurenChartWithMissingSanChuan(baseInput);
    const explanationText = chart.explanationSections.flatMap((section) => section.paragraphs).join(" ");
    const interpretationText = chart.interpretationSections.flatMap((section) => section.paragraphs).join(" ");
    const combinedText = `${explanationText} ${interpretationText}`;

    expect(chart.threeTransmissions).toEqual([]);
    expect(combinedText).toContain("三伝を確定できない");
    expect(combinedText).toContain("代用した断定は行いません");
    expect(combinedText).not.toContain("第1課を主軸");
  });
});
