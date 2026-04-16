import { describe, expect, it } from "vitest";

import { findTrigramByLines } from "./dannekiTrigram";

describe("findTrigramByLines", () => {
  it("resolves known trigram patterns", () => {
    expect(findTrigramByLines(["陽", "陽", "陽"]).key).toBe("乾");
    expect(findTrigramByLines(["陰", "陰", "陰"]).key).toBe("坤");
  });

  it("throws instead of silently falling back for impossible patterns", () => {
    expect(() => findTrigramByLines(["陽", "陽"] as unknown as ["陽", "陽", "陽"])).toThrow(/Unknown trigram/i);
  });
});
