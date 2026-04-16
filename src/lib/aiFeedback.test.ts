import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AI_QUESTION_MIN_LENGTH,
  buildAiChartContext,
  clearAiMemberSession,
  hasMinimumAiQuestionText,
  requestAiFeedback,
  resolveAiApiUrl,
  resolveAiFeedbackClientConfig,
  saveAiMemberSession,
} from "./aiFeedback";
import { KINGOKETSU_FIXTURES, buildKingoketsuChart } from "./kingoketsu";
import type { KingoketsuChart } from "./types";

describe("aiFeedback helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves client config from env-like values", () => {
    expect(resolveAiFeedbackClientConfig({ VITE_AI_FEEDBACK_MODE: "paid", VITE_AI_CHECKOUT_URL: " https://checkout.example " })).toEqual({
      gateMode: "paid",
      checkoutUrl: "https://checkout.example",
    });

    expect(resolveAiFeedbackClientConfig({ VITE_AI_FEEDBACK_MODE: "unknown" })).toEqual({
      gateMode: "disabled",
      checkoutUrl: "",
    });
  });

  it("builds API URLs from an optional external API base", () => {
    expect(resolveAiApiUrl("/api/ai-feedback", {})).toBe("/api/ai-feedback");
    expect(resolveAiApiUrl("api/ai-feedback", { VITE_API_BASE_URL: "https://api.example.com/" })).toBe(
      "https://api.example.com/api/ai-feedback",
    );
  });

  it("shares the same minimum question length contract as the backend", () => {
    expect(AI_QUESTION_MIN_LENGTH).toBe(6);
    expect(hasMinimumAiQuestionText("12345")).toBe(false);
    expect(hasMinimumAiQuestionText("123456")).toBe(true);
    expect(hasMinimumAiQuestionText(" 123456 ")).toBe(true);
  });

  it("falls back to a safe summary when narrative arrays are missing", () => {
    const chart = buildKingoketsuChart(KINGOKETSU_FIXTURES[0].input);
    const brokenChart = {
      ...chart,
      explanationSections: undefined,
      interpretationSections: undefined,
    } as unknown as KingoketsuChart;

    const context = buildAiChartContext("kingoketsu", brokenChart);

    expect(context.summary).toContain("機械解説: 未生成");
    expect(context.summary).toContain("機械解釈: 未生成");
  });

  it("requests AI feedback with credentials included", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        model: "claude-test",
        feedback: {
          overview: "overview",
          keySignals: [],
          cautions: [],
          nextActions: [],
          followUpQuestions: [],
          confidence: "medium",
          disclaimer: "disclaimer",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await requestAiFeedback({
      mode: "liuren",
      modeLabel: "六壬神課",
      topic: "general",
      questionText: "123456",
      summary: "summary",
      highlights: [],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai-feedback",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
      }),
    );
  });

  it("uses secure session endpoints instead of localStorage persistence", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        sessionReady: true,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await saveAiMemberSession("legacy-pass");
    await clearAiMemberSession();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/member-session",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/member-session",
      expect.objectContaining({
        credentials: "include",
        method: "DELETE",
      }),
    );
  });
});
