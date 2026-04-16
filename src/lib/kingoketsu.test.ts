import { describe, expect, it } from "vitest";

import { KINGOKETSU_FIXTURES, buildKingoketsuChart, getKingoketsuFourMajorVoid, getKingoketsuNobleConfig, getKingoketsuWuziDunStem } from "./kingoketsu";
import type { KingoketsuInput } from "./types";

const baseInput: KingoketsuInput = {
  year: 2016,
  month: 5,
  day: 3,
  hour: 11,
  minute: 40,
  locationId: "tokyo23",
  difen: "丑",
  topic: "総合",
  questionText: "",
  nobleChoice: "陽貴",
  dstMinutes: 0,
};

describe("buildKingoketsuChart", () => {
  it("reproduces the normalized book example", () => {
    const fixture = KINGOKETSU_FIXTURES[0];
    const chart = buildKingoketsuChart(fixture.input);

    expect(chart.basis.correctedDateTime).toBe(fixture.expected.correctedDateTime);
    expect(chart.basis.yearPillar.ganzhi).toBe(fixture.expected.yearPillar);
    expect(chart.basis.monthPillar.ganzhi).toBe(fixture.expected.monthPillar);
    expect(chart.basis.dayPillar.ganzhi).toBe(fixture.expected.dayPillar);
    expect(chart.basis.hourPillar.ganzhi).toBe(fixture.expected.hourPillar);
    expect(chart.basis.monthGeneral).toBe(fixture.expected.monthGeneral);
    expect(chart.basis.nobleStartBranch).toBe(fixture.expected.nobleStartBranch);
    expect(chart.basis.nobleDirection).toBe(fixture.expected.nobleDirection);
    expect(chart.positions.find((item) => item.key === "貴神")?.branch).toBe(fixture.expected.guishenBranch);
    expect(chart.positions.find((item) => item.key === "将神")?.branch).toBe(fixture.expected.jiangshenBranch);
    expect(chart.positions.find((item) => item.key === "人元")?.stem).toBe(fixture.expected.renyuanStem);
    expect(chart.positions.find((item) => item.key === "貴神")?.stem).toBe(fixture.expected.shenGan);
    expect(chart.positions.find((item) => item.key === "将神")?.stem).toBe(fixture.expected.jiangGan);
    expect(chart.basis.useYao).toBe(fixture.expected.useYao);
    expect(chart.topic).toBe("総合");
    expect(chart.explanationSections[0]?.paragraphs[0]).toContain("真太陽時");
    expect(chart.interpretationSections[0]?.paragraphs[0]).toContain("機械解釈");
  });

  it("applies local solar-time correction before switching the day at 子時", () => {
    const chart = buildKingoketsuChart({
      ...baseInput,
      hour: 22,
      minute: 45,
    });

    expect(chart.basis.correctedDateTime).toBe("2016-05-03 23:07");
    expect(chart.basis.dayPillar.ganzhi).toBe("丙戌");
    expect(chart.basis.hourPillar.ganzhi).toBe("戊子");
  });
  it("rejects an unknown location instead of silently falling back to akashi", () => {
    expect(() =>
      buildKingoketsuChart({
        ...baseInput,
        locationId: "unknown-location",
      }),
    ).toThrow(/location/i);
  });

  it("always returns render-safe narrative and trace arrays", () => {
    const chart = buildKingoketsuChart(baseInput);

    expect(Array.isArray(chart.helperSections)).toBe(true);
    expect(Array.isArray(chart.explanationSections)).toBe(true);
    expect(Array.isArray(chart.interpretationSections)).toBe(true);
    expect(Array.isArray(chart.traces)).toBe(true);
    expect(chart.explanationSections.length).toBeGreaterThan(0);
    expect(chart.interpretationSections.length).toBeGreaterThan(0);
    expect(chart.traces.length).toBeGreaterThan(0);
  });
});

describe("kingoketsu helpers", () => {
  it("maps the noble start branches and directions for all five stem groups", () => {
    expect(getKingoketsuNobleConfig("甲", "陽貴")).toEqual({ startBranch: "丑", direction: "順" });
    expect(getKingoketsuNobleConfig("乙", "陰貴")).toEqual({ startBranch: "申", direction: "逆" });
    expect(getKingoketsuNobleConfig("丙", "陽貴")).toEqual({ startBranch: "亥", direction: "順" });
    expect(getKingoketsuNobleConfig("辛", "陽貴")).toEqual({ startBranch: "午", direction: "逆" });
    expect(getKingoketsuNobleConfig("壬", "陰貴")).toEqual({ startBranch: "卯", direction: "順" });
  });

  it("uses 五子元遁 for 人元・神干・将干", () => {
    expect(getKingoketsuWuziDunStem("乙", "丑")).toBe("丁");
    expect(getKingoketsuWuziDunStem("乙", "辰")).toBe("庚");
    expect(getKingoketsuWuziDunStem("乙", "巳")).toBe("辛");
  });

  it("returns the 四大空亡 group from the day xun", () => {
    expect(getKingoketsuFourMajorVoid("甲子")).toBe("水");
    expect(getKingoketsuFourMajorVoid("甲申")).toBe("金");
    expect(getKingoketsuFourMajorVoid("甲辰")).toBe("なし");
  });

  it("rejects an unknown xun leader instead of silently returning なし", () => {
    expect(() => getKingoketsuFourMajorVoid("unknown-xun")).toThrow(/xun/i);
  });

  it("switches interpretation according to the selected topic", () => {
    const chart = buildKingoketsuChart({
      ...baseInput,
      topic: "健康",
    });

    expect(chart.interpretationSections.some((section) => section.title === "健康の見立て")).toBe(true);
    expect(chart.interpretationSections.flatMap((section) => section.paragraphs).join(" ")).toContain("人元を頭部");
  });

  it("infers the topic from the qualitative question", () => {
    const chart = buildKingoketsuChart({
      ...baseInput,
      topic: "総合",
      questionText: "今の契約更改は利益になるのか、条件を見直すべきか知りたい。",
    });

    expect(chart.topic).toBe("仕事");
    expect(chart.interpretationSections.flatMap((section) => section.paragraphs).join(" ")).toContain("相談文");
  });
});
