import { describe, expect, it } from "vitest";

import { buildDannekiChart } from "./danneki";
import { buildLiurenChart } from "./engine";
import { buildKingoketsuChart, KINGOKETSU_FIXTURES } from "./kingoketsu";
import { buildQimenChart } from "./qimen";
import { buildTaiitsuChart } from "./taiitsu";
import { getWuxingRelation, WUXING_COLORS } from "./relationships";
import type { DannekiInput, LiurenInput, QimenInput, TaiitsuInput } from "./types";

describe("relationship utilities", () => {
  it("uses the requested five-element colors", () => {
    expect(WUXING_COLORS).toEqual({
      火: "#d83b3b",
      水: "#1f78d1",
      金: "#f2c94c",
      土: "#8a5a36",
      木: "#2f9e44",
    });
  });

  it("classifies five-element relation directions", () => {
    expect(getWuxingRelation("木", "火")).toMatchObject({ kind: "generates", label: "生じる" });
    expect(getWuxingRelation("火", "木")).toMatchObject({ kind: "generated-by", label: "生じられる" });
    expect(getWuxingRelation("水", "火")).toMatchObject({ kind: "overcomes", label: "剋す" });
    expect(getWuxingRelation("火", "水")).toMatchObject({ kind: "overcome-by", label: "剋される" });
    expect(getWuxingRelation("金", "金")).toMatchObject({ kind: "same", label: "同気" });
  });
});

describe("chart relationship graphs", () => {
  it("builds relation graphs for all modes", () => {
    const liurenInput: LiurenInput = {
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
    const dannekiInput: DannekiInput = {
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
    const qimenInput: QimenInput = {
      year: 2026,
      month: 4,
      day: 18,
      hour: 12,
      minute: 0,
      locationId: "akashi",
      topic: "総合",
      questionText: "",
      targetDirection: "東",
    };
    const taiitsuInput: TaiitsuInput = {
      year: 2026,
      month: 4,
      day: 16,
      hour: 12,
      minute: 0,
      locationId: "akashi",
      direction: "午",
      startCondition: "time-and-direction",
      topic: "総合",
      questionText: "",
    };
    const charts = [
      buildLiurenChart(liurenInput),
      buildKingoketsuChart(KINGOKETSU_FIXTURES[0].input),
      buildDannekiChart(dannekiInput),
      buildQimenChart(qimenInput),
      buildTaiitsuChart(taiitsuInput),
    ];

    charts.forEach((chart) => {
      expect(chart.relations.nodes.length).toBeGreaterThan(0);
      expect(chart.relations.edges.length).toBeGreaterThan(0);
    });
  });
});
