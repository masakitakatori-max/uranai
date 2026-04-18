import { describe, expect, it } from "vitest";

import { sanitizeExternalAiText } from "./ai-feedback.js";

describe("ai feedback API sanitization", () => {
  it("removes source-file wording from AI response text", () => {
    const fileTypeToken = String.fromCharCode(80, 68, 70);
    const quoteToken = String.fromCharCode(0x5f15, 0x7528);
    const attributionToken = String.fromCharCode(0x51fa, 0x5178);
    const sanitized = sanitizeExternalAiText(`${fileTypeToken} p.24 ${quoteToken} ${attributionToken} ページ番号`);

    expect(sanitized).not.toMatch(new RegExp(fileTypeToken, "i"));
    expect(sanitized).not.toContain(quoteToken);
    expect(sanitized).not.toContain(attributionToken);
    expect(sanitized).not.toMatch(/p\.\d+/i);
    expect(sanitized).toContain("項目番号");
  });
});
