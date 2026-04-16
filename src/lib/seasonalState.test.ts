import { describe, expect, it } from "vitest";

import { requireSeasonalState } from "./seasonalState";

describe("requireSeasonalState", () => {
  it("returns the mapped state when present", () => {
    expect(requireSeasonalState(new Map([["木", "旺"]]), "木", "test-position")).toBe("旺");
  });

  it("throws instead of defaulting to 旺 when the state is missing", () => {
    expect(() => requireSeasonalState(new Map(), "木", "test-position")).toThrow(/Missing seasonal state/i);
  });
});
