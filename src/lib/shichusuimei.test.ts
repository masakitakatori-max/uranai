import { describe, expect, it } from "vitest";

import {
  BRANCHES,
  ELEMENTS,
  HIDDEN_STEMS,
  STEMS,
  buildBaziChart,
  buildBaziContext,
  elementOf,
  rootsForStem,
  tenGod,
} from "./shichusuimei";
import type { BirthInput } from "./shichusuimeiTypes";

const summer: BirthInput = {
  year: 1990,
  month: 5,
  day: 15,
  hour: 14,
  minute: 30,
  utcOffset: 9,
  sex: "male",
};

const winter: BirthInput = {
  year: 1990,
  month: 1,
  day: 15,
  hour: 14,
  minute: 30,
  utcOffset: 9,
  sex: "male",
};

describe("basic correspondences", () => {
  it("maps the complete stem and branch tables without losing conventional order", () => {
    expect(STEMS.join("")).toBe("甲乙丙丁戊己庚辛壬癸");
    expect(BRANCHES.join("")).toBe("子丑寅卯辰巳午未申酉戌亥");
    expect(ELEMENTS).toEqual(["木", "火", "土", "金", "水"]);
    expect(HIDDEN_STEMS["巳"]).toEqual(["丙", "庚", "戊"]);
    expect(elementOf("庚")).toBe("金");
  });

  it("derives ten gods from element production/control and polarity", () => {
    expect(tenGod("庚", "庚")).toBe("比肩");
    expect(tenGod("庚", "辛")).toBe("劫財");
    expect(tenGod("庚", "壬")).toBe("食神");
    expect(tenGod("庚", "癸")).toBe("傷官");
    expect(tenGod("庚", "甲")).toBe("偏財");
    expect(tenGod("庚", "乙")).toBe("正財");
    expect(tenGod("庚", "丙")).toBe("七殺");
    expect(tenGod("庚", "丁")).toBe("正官");
    expect(tenGod("庚", "戊")).toBe("偏印");
    expect(tenGod("庚", "己")).toBe("正印");
  });
});

describe("buildBaziChart calendar calculation", () => {
  it("matches the known early-summer chart and forward first luck period", () => {
    const chart = buildBaziChart(summer);

    expect(chart.pillars.map((pillar) => pillar.ganzhi)).toEqual(["庚午", "辛巳", "庚辰", "癸未"]);
    expect(chart.direction).toBe("順行");
    expect(chart.luck[0]?.ganzhi).toBe("壬午");
    expect(chart.luck[0]?.startAge).toBeCloseTo(7.24, 2);
    expect(chart.dayMaster).toBe("庚");
    expect(chart.monthBranch).toBe("巳");
  });

  it("matches the known winter chart and reverse first luck period", () => {
    const chart = buildBaziChart(winter);

    expect(chart.pillars.map((pillar) => pillar.ganzhi)).toEqual(["己巳", "丁丑", "庚辰", "癸未"]);
    expect(chart.direction).toBe("逆行");
    expect(chart.luck[0]?.ganzhi).toBe("丙子");
    expect(chart.luck[0]?.startAge).toBeCloseTo(3.208, 3);
  });

  it("reverses luck direction for the opposite sex without changing natal pillars", () => {
    const male = buildBaziChart(summer);
    const female = buildBaziChart({ ...summer, sex: "female" });

    expect(female.pillars).toEqual(male.pillars);
    expect(female.direction).toBe("逆行");
    expect(female.luck[0]?.ganzhi).toBe("庚辰");
  });

  it("uses 戊午 as the 2000-01-01 day anchor", () => {
    const chart = buildBaziChart({ ...summer, year: 2000, month: 1, day: 1, hour: 12, minute: 0 });

    expect(chart.pillars[2]?.ganzhi).toBe("戊午");
  });

  it("advances the day pillar at the late 子-hour boundary", () => {
    const before = buildBaziChart({ ...summer, year: 2000, month: 1, day: 1, hour: 22, minute: 59 });
    const after = buildBaziChart({ ...summer, year: 2000, month: 1, day: 1, hour: 23, minute: 0 });

    expect(before.pillars[2]?.ganzhi).toBe("戊午");
    expect(before.pillars[3]?.branch).toBe("亥");
    expect(after.pillars[2]?.ganzhi).toBe("己未");
    expect(after.pillars[3]?.ganzhi).toBe("甲子");
    expect(after.warnings.join(" ")).toMatch(/23:00|晩子時/);
  });

  it("warns within five minutes on both sides of day and odd-hour branch boundaries", () => {
    const warningsAt = (hour: number, minute: number) =>
      buildBaziChart({ ...winter, year: 1990, month: 1, day: 8, hour, minute }).warnings;
    const hasDayBoundary = (hour: number, minute: number) => warningsAt(hour, minute).some((warning) => warning.includes("日界付近"));
    const hasHourBoundary = (hour: number, minute: number) => warningsAt(hour, minute).some((warning) => warning.includes("時辰境界付近"));

    expect(hasDayBoundary(22, 54)).toBe(false);
    expect(hasDayBoundary(22, 55)).toBe(true);
    expect(hasDayBoundary(23, 5)).toBe(true);
    expect(hasDayBoundary(23, 6)).toBe(false);
    expect(hasHourBoundary(12, 59)).toBe(true);
    expect(hasHourBoundary(13, 5)).toBe(true);
    expect(hasHourBoundary(13, 55)).toBe(false);
    expect(hasHourBoundary(23, 55)).toBe(false);
  });

  it("accepts a real Gregorian leap date and calculates its day independently", () => {
    const chart = buildBaziChart({ ...summer, year: 2000, month: 2, day: 29, hour: 12, minute: 0 });

    expect(chart.pillars[2]?.ganzhi).toBe("丁巳");
  });

  it.each([
    [{ ...summer, year: 1899 }, /year/i],
    [{ ...summer, year: 2101 }, /year/i],
    [{ ...summer, month: 2, day: 30 }, /date|day/i],
    [{ ...summer, hour: 24 }, /hour/i],
    [{ ...summer, minute: 1.5 }, /minute|integer/i],
    [{ ...summer, utcOffset: -12.1 }, /utcOffset/i],
    [{ ...summer, utcOffset: 14.1 }, /utcOffset/i],
    [{ ...summer, sex: "other" as BirthInput["sex"] }, /sex/i],
  ])("rejects invalid input %#", (input, message) => {
    expect(() => buildBaziChart(input)).toThrow(message);
  });
});

describe("facts, roots, and relationship evidence", () => {
  it("assigns stable IDs to pillars, visible facts, hidden stems, luck and strength", () => {
    const chart = buildBaziChart(summer);
    const context = buildBaziContext({ person: summer, focus: "yongshen", question: "用神を確認" });

    expect(chart.pillars.map((pillar) => pillar.id)).toEqual(["a-year", "a-month", "a-day", "a-hour"]);
    expect(chart.pillars[1]?.hidden.map((hidden) => hidden.id)).toEqual([
      "a-month-h-丙",
      "a-month-h-庚",
      "a-month-h-戊",
    ]);
    expect(chart.luck.map((period) => period.id)).toEqual([
      "a-luck-0", "a-luck-1", "a-luck-2", "a-luck-3",
      "a-luck-4", "a-luck-5", "a-luck-6", "a-luck-7",
    ]);
    expect(context.factIds).toEqual(expect.arrayContaining([
      "a-year-s", "a-year-b", "a-month-s", "a-month-b", "a-day-s", "a-day-b",
      "a-hour-s", "a-hour-b", "a-month-h-庚", "a-strength",
    ]));
    expect(context.factIds.some((id) => id.startsWith("a-luck-"))).toBe(false);
    expect(context.factIds).toEqual(expect.arrayContaining(context.relations.map((relation) => relation.id)));
  });

  it("separates root location from main-qi classification and never mutates natal evidence", () => {
    const chart = buildBaziChart(summer);
    const before = structuredClone(chart);
    const natal = rootsForStem(chart, "庚");
    const withLuck = rootsForStem(chart, "庚", chart.luck[2]);

    expect(natal).toEqual([
      { id: "a-month-h-庚", pillarId: "a-month", branch: "巳", stem: "庚", main: false },
    ]);
    expect(withLuck.some((root) => root.pillarId === "a-luck-2")).toBe(true);
    expect(chart).toEqual(before);
  });

  it("treats both polarities of the same element as roots while retaining the actual hidden stem", () => {
    const chart = buildBaziChart(winter);
    const roots = rootsForStem(chart, "庚");

    expect(roots).toEqual([
      { id: "a-year-h-庚", pillarId: "a-year", branch: "巳", stem: "庚", main: false },
      { id: "a-month-h-辛", pillarId: "a-month", branch: "丑", stem: "辛", main: false },
    ]);
    expect(chart.strength.roots).toEqual(roots);
    expect(chart.strength.label).toBe("判定保留");
    expect(chart.strength.reasons.join(" ")).toMatch(/同五行.*同干.*異干/);
  });

  it("marks detected combinations as conditional rather than claiming transformation", () => {
    const chart = buildBaziChart(summer);
    const combination = chart.relations.find(
      (relation) => relation.fromId === "a-year-b" && relation.toId === "a-hour-b",
    );

    expect(combination?.kind).toContain("六合");
    expect(combination?.conditional).toBe(true);
    expect(combination?.description).toMatch(/検出|成立条件/);
    expect(combination?.description).not.toMatch(/化した|変化した/);
  });

  it("requires all three branches before emitting a three-harmony relation", () => {
    const onlyTwo = buildBaziChart({ ...summer, year: 1990, month: 1, day: 1, hour: 12, minute: 0 });
    const allThree = buildBaziChart({ ...summer, year: 1990, month: 1, day: 8, hour: 12, minute: 0 });

    expect(onlyTwo.relations.some((relation) => relation.kind.includes("三合"))).toBe(false);
    expect(allThree.pillars.map((pillar) => pillar.branch)).toEqual(["巳", "丑", "酉", "午"]);
    expect(allThree.relations.some((relation) => relation.kind.includes("三合"))).toBe(true);
  });

  it("keeps pillar-level participants when both partners repeat a three-harmony branch", () => {
    const same = { ...summer, year: 1990, month: 1, day: 8, hour: 12, minute: 0 };
    const context = buildBaziContext({ person: same, partner: same, focus: "compatibility", question: "相性" });
    const crossGroupEdge = context.relations.find((relation) =>
      relation.scope === "partner"
      && relation.kind.includes("三合")
      && relation.memberIds?.includes("a-year-b")
      && relation.memberIds.includes("a-day-b")
      && relation.memberIds.includes("b-month-b"),
    );

    expect(crossGroupEdge).toBeTruthy();
    expect(crossGroupEdge?.memberIds).toEqual(["a-year-b", "a-day-b", "b-month-b"]);
    expect(crossGroupEdge?.description).toMatch(/本人年柱巳.*本人日柱酉.*相手月柱丑/);
    expect(crossGroupEdge?.description).not.toMatch(/[ab]-(year|month|day|hour)-b/);
  });

  it("keeps a two-branch punishment as a conditional candidate", () => {
    const chart = buildBaziChart({ ...summer, year: 1990, month: 1, day: 1, hour: 12, minute: 0 });
    const candidate = chart.relations.find((relation) => relation.kind.includes("刑候補"));

    expect(candidate).toMatchObject({
      fromId: "a-day-b",
      toId: "a-year-b",
      scope: "natal",
      conditional: true,
    });
  });

  it("enumerates cross-person self-punishment candidates by pillar ID", () => {
    const same = { ...summer, year: 1990, month: 1, day: 3, hour: 8, minute: 0 };
    const context = buildBaziContext({ person: same, partner: same, focus: "compatibility", question: "相性" });

    expect(context.person.pillars.map((pillar) => pillar.branch)).toEqual(["巳", "子", "辰", "辰"]);
    expect(context.relations.some((relation) =>
      relation.scope === "partner"
      && relation.kind.includes("自刑")
      && relation.fromId === "a-day-b"
      && relation.toId === "b-day-b",
    )).toBe(true);
  });

  it("keeps partner relations cross-person and cannot use a partner branch as a natal root", () => {
    const natalOnly = buildBaziContext({ person: summer, focus: "yongshen", question: "用神" });
    const paired = buildBaziContext({
      person: summer,
      partner: winter,
      focus: "compatibility",
      question: "相性",
    });

    expect(paired.person.strength.roots).toEqual(natalOnly.person.strength.roots);
    expect(paired.person.strength.roots.every((root) => root.pillarId.startsWith("a-"))).toBe(true);
    expect(paired.relations.filter((relation) => relation.scope === "partner").length).toBeGreaterThan(0);
    expect(paired.relations.filter((relation) => relation.scope === "partner").every((relation) =>
      (relation.fromId.startsWith("a-") && relation.toId.startsWith("b-"))
      || (relation.fromId.startsWith("b-") && relation.toId.startsWith("a-")),
    )).toBe(true);
  });

  it("does not call the partner's hidden stem person A's root", () => {
    const context = buildBaziContext({
      person: { ...summer, hour: 4, minute: 0 },
      partner: { ...summer, day: 20, hour: 16, minute: 0 },
      focus: "compatibility",
      question: "相性",
    });

    expect(context.relations.some((relation) =>
      relation.kind.includes("根の動揺")
      && relation.fromId === "a-hour-b"
      && relation.toId === "b-hour-b",
    )).toBe(false);
  });

  it("attributes a clashed root to its owner even when that owner is person B", () => {
    const other = { ...summer, day: 20, hour: 22, minute: 0 };
    const asA = buildBaziContext({ person: summer, partner: other, focus: "compatibility", question: "相性" });
    const asB = buildBaziContext({ person: other, partner: summer, focus: "compatibility", question: "相性" });
    const aRoot = asA.relations.find((relation) =>
      relation.kind.includes("根の動揺")
      && relation.fromId === "a-month-b"
      && relation.toId === "b-hour-b",
    );
    const bRoot = asB.relations.find((relation) =>
      relation.kind.includes("根の動揺")
      && relation.fromId === "a-hour-b"
      && relation.toId === "b-month-b"
      && relation.description.startsWith("B"),
    );

    expect(aRoot?.description).toMatch(/A.*日主庚.*本人月柱巳.*庚.*余気/);
    expect(bRoot?.description).toMatch(/B.*日主庚.*相手月柱巳.*庚.*余気/);
  });

  it("adds luck relations without changing the natal month order or chart", () => {
    const noLuck = buildBaziContext({ person: summer, focus: "yongshen", question: "用神" });
    const original = structuredClone(noLuck.person);
    const withLuck = buildBaziContext({ person: summer, luckIndex: 2, focus: "yongshen", question: "大運" });

    expect(withLuck.luck?.id).toBe("a-luck-2");
    expect(withLuck.person.monthBranch).toBe("巳");
    expect(withLuck.person).toEqual(original);
    expect(withLuck.relations.some((relation) => relation.scope === "luck")).toBe(true);
    expect(withLuck.relations.some((relation) => relation.scope === "luck" && relation.kind.includes("刑候補"))).toBe(true);
  });

  it("allows evidence references only to the selected luck period", () => {
    const selected = buildBaziContext({ person: summer, luckIndex: 0, focus: "yongshen", question: "大運" });
    const paired = buildBaziContext({ person: summer, partner: winter, focus: "compatibility", question: "相性" });

    expect(selected.factIds).toEqual(expect.arrayContaining([
      "a-luck-0", "a-luck-0-s", "a-luck-0-b", "a-luck-0-h-丁", "a-luck-0-h-己",
    ]));
    expect(selected.factIds.some((id) => id.startsWith("a-luck-1"))).toBe(false);
    expect(selected.factIds.some((id) => id.startsWith("a-luck-7"))).toBe(false);
    expect(paired.factIds.some((id) => id.startsWith("a-luck-") || id.startsWith("b-luck-"))).toBe(false);
  });

  it("does not reissue a natal-only three-harmony group as a luck relation", () => {
    const context = buildBaziContext({
      person: { ...summer, year: 1990, month: 1, day: 8, hour: 12, minute: 0 },
      luckIndex: 0,
      focus: "yongshen",
      question: "大運",
    });

    expect(context.person.pillars.map((pillar) => pillar.branch)).toEqual(["巳", "丑", "酉", "午"]);
    expect(context.luck?.branch).toBe("子");
    expect(context.relations.some((relation) =>
      relation.scope === "luck" && relation.kind.includes("三合"),
    )).toBe(false);
  });

  it("rejects compatibility without a partner and out-of-range luck indices", () => {
    expect(() => buildBaziContext({ person: summer, focus: "compatibility", question: "相性" })).toThrow(/partner/i);
    expect(() => buildBaziContext({ person: summer, luckIndex: 8, focus: "yongshen", question: "大運" })).toThrow(/luckIndex/i);
    expect(() => buildBaziContext({ person: summer, luckIndex: -1, focus: "yongshen", question: "大運" })).toThrow(/luckIndex/i);
  });

  it("returns conservative, traceable and versioned strength evidence", () => {
    const strength = buildBaziChart(summer).strength;

    expect(["身強寄り", "身弱寄り", "判定保留"]).toContain(strength.label);
    expect(strength.status).toBe("rule-estimate");
    expect(strength.seasonalState).toContain("月令");
    expect(strength.reasons.length).toBeGreaterThan(0);
    expect(strength.caveats.join(" ")).toMatch(/最終|格局|調候/);
    expect(strength.ruleVersion).toMatch(/^shichusuimei-strength-/);
  });

  it("classifies a seasonally supported, well-rooted and visibly supported chart as strong-leaning", () => {
    const chart = buildBaziChart({
      year: 1988, month: 1, day: 1, hour: 12, minute: 0, utcOffset: 9, sex: "male",
    });

    expect(chart.pillars.map((pillar) => pillar.ganzhi)).toEqual(["丁卯", "壬子", "乙卯", "壬午"]);
    expect(chart.strength.label).toBe("身強寄り");
    expect(chart.strength.reasons.join(" ")).toMatch(/月令.*扶助.*透干.*生扶側2件.*泄耗克側1件/);
    expect(chart.strength.caveats.join(" ")).toMatch(/特殊格.*合化/);
  });

  it("classifies a seasonally unsupported, root-light and visibly pressured chart as weak-leaning", () => {
    const chart = buildBaziChart({
      year: 1988, month: 2, day: 8, hour: 12, minute: 0, utcOffset: 9, sex: "male",
    });

    expect(chart.pillars.map((pillar) => pillar.ganzhi)).toEqual(["戊辰", "甲寅", "癸巳", "戊午"]);
    expect(chart.strength.label).toBe("身弱寄り");
    expect(chart.strength.reasons.join(" ")).toMatch(/月令.*直接は扶助しない.*透干.*生扶側0件.*泄耗克側3件/);
    expect(chart.strength.caveats.join(" ")).toMatch(/特殊格.*合化/);
  });
});
