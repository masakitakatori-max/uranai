import { useEffect, useMemo, useState } from "react";

import {
  buildAiChartContext,
  getAiFeedbackClientConfig,
  getEntitlementToken,
  hasMinimumAiQuestionText,
  requestAiFeedback,
} from "../../lib/aiFeedback";
import { buildLiurenChart } from "../../lib/engine";
import { CERTAINTY_LABELS, buildEvidenceRows, buildKeyPoint, wuxingVar } from "../liurenSupport";
import type { SavedReading } from "../storage";

interface SummaryScreenProps {
  reading: SavedReading;
  onBack: () => void;
  onOpenBoard: () => void;
  onOpenPaywall: () => void;
  entitlementVersion: number;
}

type AiFeedbackResult = Awaited<ReturnType<typeof requestAiFeedback>>;

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => getString(item)).filter((item) => item.length > 0);
}

function isRequiresPaymentError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as { requiresPayment?: unknown }).requiresPayment === true);
}

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  if (error && typeof error === "object" && "error" in error) {
    const message = (error as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return "AI解説の生成に失敗しました。";
}

export function SummaryScreen({ reading, onBack, onOpenBoard, onOpenPaywall, entitlementVersion }: SummaryScreenProps) {
  const chart = useMemo(() => buildLiurenChart(reading.input), [reading]);
  const evidence = useMemo(() => buildEvidenceRows(chart), [chart]);
  const keyPoint = useMemo(() => buildKeyPoint(chart), [chart]);
  const correctedLabel = chart.basis.correctedDateTime.replace(/^\d{4}-/, "").replace("-", "/");
  const boardDigest = useMemo(
    () => chart.explanationSections.filter((section) => section.key === "liuren-foundation" || section.key === "liuren-structure"),
    [chart],
  );

  const clientConfig = getAiFeedbackClientConfig();
  const context = useMemo(() => buildAiChartContext("liuren", chart), [chart]);
  const hasQuestionText = hasMinimumAiQuestionText(context.questionText);
  const isAiDisabled = clientConfig.gateMode === "disabled";
  const requiresEntitlement = clientConfig.gateMode === "paid";

  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiFeedbackResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isEntitled, setIsEntitled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!requiresEntitlement) {
      return;
    }
    let cancelled = false;
    getEntitlementToken().then((token) => {
      if (!cancelled) {
        setIsEntitled(Boolean(token));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [requiresEntitlement, entitlementVersion]);

  const needsPurchase = requiresEntitlement && isEntitled !== true;
  const canRequestAi = !isLoading && !isAiDisabled && !needsPurchase && hasQuestionText;
  const feedback = aiResult ? (aiResult.feedback as unknown as Record<string, unknown>) : null;

  async function handleAiRequest() {
    if (needsPurchase) {
      onOpenPaywall();
      return;
    }
    if (!canRequestAi) {
      return;
    }
    setIsLoading(true);
    setAiError(null);
    try {
      const next = await requestAiFeedback(context);
      setAiResult(next);
    } catch (caughtError) {
      if (isRequiresPaymentError(caughtError)) {
        setIsEntitled(false);
        onOpenPaywall();
      } else {
        setAiError(extractErrorMessage(caughtError));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="screen flow-screen">
      <nav className="flow-nav">
        <button type="button" className="nav-button" onClick={onBack}>
          ‹
        </button>
        <span className="nav-title">六壬神課</span>
        <span className="nav-button nav-button-sub" aria-hidden="true">
          保存済
        </span>
      </nav>

      <div className="flow-body">
        <div className="status-row">
          <span className={`pill pill-${reading.certainty}`}>{CERTAINTY_LABELS[reading.certainty]}</span>
          <span className="pill pill-neutral">原典参照 {chart.sourceReferences.length}件</span>
          <span className="status-date">
            {chart.basis.dayGanzhi}日 {correctedLabel.slice(-5)}
          </span>
        </div>

        {reading.question ? <p className="summary-question">「{reading.question}」</p> : null}

        <section className="keypoint-card">
          <span className="eyebrow-label">要点</span>
          <p className="keypoint-text mincho">{keyPoint}</p>
        </section>

        {boardDigest.length ? (
          <section className="board-digest" aria-label="盤の構成">
            <p className="field-label">盤の構成</p>
            <div className="board-digest-list">
              {boardDigest.map((section) => (
                <div key={section.key} className="board-digest-item">
                  <span className="board-digest-title">{section.title}</span>
                  {section.paragraphs.filter((paragraph) => paragraph.trim().length > 0).map((paragraph) => (
                    <p key={paragraph} className="board-digest-text">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="evidence-block" aria-label="読みの根拠">
          <p className="field-label">読みの根拠</p>
          <div className="evidence-list">
            {evidence.map((row) => (
              <div key={row.source} className="evidence-row">
                <span className="evidence-bar" style={{ background: wuxingVar(row.wuxing) }} />
                <span className="evidence-text">
                  <span>{row.text}</span>
                  <span className="evidence-source">{row.source}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {reading.nearBoundary ? (
          <div className="warning-banner" role="note">
            補正後時刻が時支の境界（±5分）に近いため、判断が分かれる可能性があります。
          </div>
        ) : null}

        {feedback ? (
          <section className="ai-result-card" aria-live="polite">
            <span className="eyebrow-label">AI 解説</span>
            {getString(feedback.overview) ? <p className="ai-result-overview">{getString(feedback.overview)}</p> : null}
            {getStringArray(feedback.keySignals).length ? (
              <div className="ai-result-block">
                <p className="field-label">主要シグナル</p>
                <ul className="ai-result-list">
                  {getStringArray(feedback.keySignals).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {getStringArray(feedback.cautions).length ? (
              <div className="ai-result-block">
                <p className="field-label">注意点</p>
                <ul className="ai-result-list">
                  {getStringArray(feedback.cautions).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {getStringArray(feedback.nextActions).length ? (
              <div className="ai-result-block">
                <p className="field-label">次に見る観点</p>
                <ul className="ai-result-list">
                  {getStringArray(feedback.nextActions).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {getString(feedback.disclaimer) ? <p className="field-note">{getString(feedback.disclaimer)}</p> : null}
          </section>
        ) : null}

        <p className="disclaimer">本アプリは書籍準拠の方式で盤を自動作成します。最終判断は原典と占式でご確認ください。</p>
      </div>

      <footer className="flow-footer">
        {aiError ? (
          <div className="warning-banner" role="alert">
            {aiError}
          </div>
        ) : null}
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onOpenBoard}>
            盤を見る
          </button>
          <button type="button" className="primary-button" disabled={isLoading || (!needsPurchase && !canRequestAi)} onClick={handleAiRequest}>
            {isLoading ? "生成中…" : needsPurchase ? "AI解説を購入" : "AI解説"}
          </button>
        </div>
      </footer>
    </div>
  );
}
