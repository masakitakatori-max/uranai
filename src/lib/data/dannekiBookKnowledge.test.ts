import { describe, expect, it } from "vitest";

import { DANNEKI_BOOK_CASES, DANNEKI_BOOK_RULES } from "./dannekiBookKnowledge";

describe("dannekiBookKnowledge", () => {
  it("contains a book-backed rule set with representative source images", () => {
    expect(DANNEKI_BOOK_RULES).toHaveLength(8);
    expect(DANNEKI_BOOK_RULES.map((rule) => rule.id)).toEqual(
      expect.arrayContaining([
        "question-focus",
        "use-god-by-topic",
        "world-response",
        "palace-as-root",
        "strength-by-time",
        "moving-line",
        "hidden-and-broken",
        "practical-result",
      ]),
    );
    expect(DANNEKI_BOOK_RULES.flatMap((rule) => rule.sourceImages)).toEqual(
      expect.arrayContaining(["img_0003", "img_0018", "img_0033", "img_0044", "img_0065", "img_0069", "img_0073", "img_0079", "img_0081"]),
    );
  });

  it("contains representative cases that mirror the OCR examples", () => {
    expect(DANNEKI_BOOK_CASES).toHaveLength(7);
    expect(DANNEKI_BOOK_CASES.map((item) => item.sourceImage)).toEqual(
      expect.arrayContaining(["img_0003", "img_0044", "img_0065", "img_0069", "img_0073", "img_0079", "img_0081"]),
    );
    for (const item of DANNEKI_BOOK_CASES) {
      expect(item.coreLesson.length).toBeGreaterThan(10);
      expect(item.tags.length).toBeGreaterThan(0);
      expect(item.matchTokens.length).toBeGreaterThan(0);
      expect(item.matchThreshold).toBeGreaterThan(0);
    }
  });
});
