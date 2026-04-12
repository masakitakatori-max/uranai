import { describe, expect, it } from "vitest";

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
  it("reproduces the worked example", () => {
    const chart = buildLiurenChart(baseInput);

    expect(chart.basis.dayGanzhi).toBe("癸卯");
    expect(chart.basis.monthGeneral).toBe("酉");
    expect(chart.basis.hourBranch).toBe("午");
    expect(chart.basis.juNumber).toBe(10);
    expect(chart.lessonType).toBe("重審");
    expect(chart.fourLessons.map((lesson) => `${lesson.lower}/${lesson.upper}`)).toEqual(["癸/辰", "辰/未", "卯/午", "午/酉"]);
    expect(chart.threeTransmissions.map((item) => item.branch)).toEqual(["酉", "子", "卯"]);
    expect(chart.fourLessons.map((lesson) => lesson.sixKin)).toEqual(["官鬼", "官鬼", "妻財", "父母"]);
    expect(chart.threeTransmissions.map((item) => item.sixKin)).toEqual(["父母", "兄弟", "子孫"]);
    expect(chart.fourLessons.map((lesson) => lesson.heavenlyGeneral)).toEqual(["天后", "朱雀", "蛇", "勾陳"]);
    expect(chart.threeTransmissions.map((item) => item.heavenlyGeneral)).toEqual(["勾陳", "白虎", "太陰"]);
    expect(chart.topic).toBe("総合");
    expect(chart.explanationSections[0]?.paragraphs[0]).toContain("基準時刻");
    expect(chart.interpretationSections[0]?.paragraphs[0]).toContain("機械解釈");
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
});
