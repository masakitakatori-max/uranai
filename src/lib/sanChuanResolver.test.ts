import { describe, expect, it } from "vitest";

import { BRANCHES, GANZHI_CYCLE } from "./data/core";
import { SAN_CHUAN_MISSING_ROWS } from "./data/sanChuanCoverage";
import { SAN_CHUAN_LOOKUP } from "./data/sanChuanLookup";
import { resolveSanChuanRow } from "./sanChuanResolver";
import type { Branch, Ganzhi } from "./types";

function findFirstLookupPair() {
  for (const [dayGanzhi, rows] of Object.entries(SAN_CHUAN_LOOKUP) as Array<[Ganzhi, Partial<Record<Branch, unknown>>]>) {
    for (const [upper] of Object.entries(rows) as Array<[Branch, unknown]>) {
      return { dayGanzhi, upper };
    }
  }

  throw new Error("No san-chuan lookup rows found.");
}

describe("resolveSanChuanRow", () => {
  it("returns lookup-backed rows as lookup results", () => {
    const sample = findFirstLookupPair();
    const resolved = resolveSanChuanRow(sample.dayGanzhi, sample.upper);

    expect(resolved.source).toBe("lookup");
    expect(resolved.row).toBeTruthy();
    expect(resolved.row?.middle).toBe(SAN_CHUAN_LOOKUP[sample.dayGanzhi]?.[sample.upper]?.middle);
    expect(resolved.row?.final).toBe(SAN_CHUAN_LOOKUP[sample.dayGanzhi]?.[sample.upper]?.final);
    expect(resolved.trace.length).toBeGreaterThan(0);
  });

  it("resolves every documented missing row into a complete derived triple", () => {
    for (const missingRow of SAN_CHUAN_MISSING_ROWS) {
      const resolved = resolveSanChuanRow(missingRow.dayGanzhi, missingRow.upper);

      expect(resolved.source, `${missingRow.dayGanzhi}/${missingRow.upper}`).toBe("derived");
      expect(resolved.row, `${missingRow.dayGanzhi}/${missingRow.upper}`).toBeTruthy();
      expect(resolved.row?.initial, `${missingRow.dayGanzhi}/${missingRow.upper}`).toBeTruthy();
      expect(resolved.row?.middle, `${missingRow.dayGanzhi}/${missingRow.upper}`).toBeTruthy();
      expect(resolved.row?.final, `${missingRow.dayGanzhi}/${missingRow.upper}`).toBeTruthy();
      expect(resolved.row?.lessonType, `${missingRow.dayGanzhi}/${missingRow.upper}`).toBeTruthy();
      expect(resolved.trace.length, `${missingRow.dayGanzhi}/${missingRow.upper}`).toBeGreaterThan(0);
    }
  });

  it("keeps derived rows deterministic across repeated resolution", () => {
    for (const missingRow of SAN_CHUAN_MISSING_ROWS) {
      const first = resolveSanChuanRow(missingRow.dayGanzhi, missingRow.upper);
      const second = resolveSanChuanRow(missingRow.dayGanzhi, missingRow.upper);

      expect(first).toEqual(second);
    }
  });

  it("resolves every supported day and upper-branch pair without returning null", () => {
    for (const dayGanzhi of GANZHI_CYCLE) {
      for (const upper of BRANCHES) {
        const resolved = resolveSanChuanRow(dayGanzhi, upper);

        expect(resolved.row, `${dayGanzhi}/${upper}`).toBeTruthy();
        expect(resolved.row?.initial, `${dayGanzhi}/${upper}`).toBeTruthy();
        expect(resolved.row?.middle, `${dayGanzhi}/${upper}`).toBeTruthy();
        expect(resolved.row?.final, `${dayGanzhi}/${upper}`).toBeTruthy();
        expect(resolved.row?.lessonType, `${dayGanzhi}/${upper}`).toBeTruthy();
      }
    }
  });
});
