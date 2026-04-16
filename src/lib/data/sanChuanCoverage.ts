import type { Branch, Ganzhi } from "../types";
import { BRANCHES, GANZHI_CYCLE } from "./core";
import { SAN_CHUAN_LOOKUP } from "./sanChuanLookup";

export interface MissingSanChuanRow {
  dayGanzhi: Ganzhi;
  upper: Branch;
}

export const SAN_CHUAN_EXPECTED_ROW_COUNT = GANZHI_CYCLE.length * BRANCHES.length;

export const SAN_CHUAN_MISSING_ROWS: readonly MissingSanChuanRow[] = GANZHI_CYCLE.flatMap((dayGanzhi) =>
  BRANCHES.filter((upper) => !SAN_CHUAN_LOOKUP[dayGanzhi]?.[upper]).map((upper) => ({
    dayGanzhi,
    upper,
  })),
);

export const SAN_CHUAN_ROW_COUNT = SAN_CHUAN_EXPECTED_ROW_COUNT - SAN_CHUAN_MISSING_ROWS.length;

export const SAN_CHUAN_MISSING_ROWS_BY_DAY = GANZHI_CYCLE.reduce(
  (result, dayGanzhi) => {
    result[dayGanzhi] = SAN_CHUAN_MISSING_ROWS.filter((item) => item.dayGanzhi === dayGanzhi);
    return result;
  },
  {} as Record<Ganzhi, readonly MissingSanChuanRow[]>,
);

const SAN_CHUAN_MISSING_ROW_KEY_SET = new Set(SAN_CHUAN_MISSING_ROWS.map((item) => `${item.dayGanzhi}:${item.upper}`));

export const SAN_CHUAN_SHARED_SCREENSHOT_GAP = {
  after: "スクリーンショット 2026-04-08 220117.png",
  before: "スクリーンショット 2026-04-08 220127.png",
  missingDays: ["壬寅", "癸卯"] as const satisfies readonly Ganzhi[],
  manuallyRecoveredRows: [{ dayGanzhi: "癸卯", upper: "辰" }] as const satisfies readonly MissingSanChuanRow[],
} as const;

export function isMissingSanChuanRow(dayGanzhi: Ganzhi, upper: Branch) {
  return SAN_CHUAN_MISSING_ROW_KEY_SET.has(`${dayGanzhi}:${upper}`);
}

export function getMissingSanChuanRowsForDay(dayGanzhi: Ganzhi) {
  return SAN_CHUAN_MISSING_ROWS_BY_DAY[dayGanzhi];
}
