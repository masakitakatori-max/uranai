import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AI_QUESTION_MIN_LENGTH,
  buildAiChartContext,
  getOrCreateDeviceId,
  hasMinimumAiQuestionText,
  requestAiFeedback,
  resolveAiApiUrl,
  resolveAiFeedbackClientConfig,
  sanitizeExternalAiText,
} from "./aiFeedback";
import { KINGOKETSU_FIXTURES, buildKingoketsuChart } from "./kingoketsu";
import { buildTaiitsuChart } from "./taiitsu";
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

  it("removes source-file wording from taiitsu AI context", () => {
    const fileTypeToken = String.fromCharCode(80, 68, 70);
    const quoteToken = String.fromCharCode(0x5f15, 0x7528);
    const attributionToken = String.fromCharCode(0x51fa, 0x5178);
    const chart = buildTaiitsuChart({
      year: 2026,
      month: 4,
      day: 16,
      hour: 12,
      minute: 0,
      locationId: "akashi",
      direction: "午",
      startCondition: "time-and-direction",
      topic: "総合",
      questionText: "太乙神数の流れを確認したい",
    });
    const context = buildAiChartContext("taiitsu", chart);

    expect(context.summary).not.toMatch(new RegExp(fileTypeToken, "i"));
    expect(context.summary).not.toContain(quoteToken);
    expect(context.summary).not.toContain(attributionToken);
    expect(context.summary).not.toMatch(/p\.\d+/i);
  });

  it("sanitizes AI response text before display", () => {
    const fileTypeToken = String.fromCharCode(80, 68, 70);
    const quoteToken = String.fromCharCode(0x5f15, 0x7528);
    const attributionToken = String.fromCharCode(0x51fa, 0x5178);
    const sanitized = sanitizeExternalAiText(`${fileTypeToken} p.12 ${quoteToken} ${attributionToken} ページ単位`);

    expect(sanitized).not.toMatch(new RegExp(fileTypeToken, "i"));
    expect(sanitized).not.toContain(quoteToken);
    expect(sanitized).not.toContain(attributionToken);
    expect(sanitized).not.toMatch(/p\.\d+/i);
    expect(sanitized).toContain("項目単位");
  });

  it("requests AI feedback with credentials included", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/entitlement/token")) {
        return Promise.resolve({ ok: true, json: async () => ({ ok: false, pending: true }) });
      }
      return Promise.resolve({
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
        headers: expect.objectContaining({ "X-Device-Id": expect.any(String) }),
      }),
    );
  });

  it("persists an anonymous device id across calls", () => {
    window.localStorage.clear();
    const first = getOrCreateDeviceId();
    const second = getOrCreateDeviceId();
    expect(first).toBeTruthy();
    expect(second).toBe(first);
  });

  it("attaches Authorization header when an entitlement token is cached", async () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "uranai.entitlement.token.v1",
      JSON.stringify({ token: "cached-jwt", expiresAt: Date.now() + 60 * 60 * 1000 }),
    );

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
        headers: expect.objectContaining({ Authorization: "Bearer cached-jwt" }),
      }),
    );

    window.localStorage.clear();
  });
});
