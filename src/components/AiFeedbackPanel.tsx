import { useMemo, useState } from "react";
import {
  buildAiChartContext,
  getAiFeedbackClientConfig,
  hasMinimumAiQuestionText,
  requestAiFeedback,
} from "../lib/aiFeedback";
import type { DannekiChart, KingoketsuChart, LiurenChart, TaiitsuChart } from "../lib/types";

type AiFeedbackPanelProps =
  | { mode: "liuren"; chart: LiurenChart }
  | { mode: "kingoketsu"; chart: KingoketsuChart }
  | { mode: "danneki"; chart: DannekiChart }
  | { mode: "taiitsu"; chart: TaiitsuChart };

type AiFeedbackResult = Awaited<ReturnType<typeof requestAiFeedback>>;

type NormalizedAiError = {
  message: string;
  status?: number;
  requiresPayment?: boolean;
  checkoutUrl?: string;
};

const MODE_LABELS: Record<AiFeedbackPanelProps["mode"], string> = {
  liuren: "六壬神課",
  kingoketsu: "金口訣",
  danneki: "断易",
  taiitsu: "太乙神数",
};

const GATE_LABELS = {
  disabled: "停止中",
  preview: "プレビュー",
  paid: "有料ゲート",
} as const;

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getDisplayValue(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return getString(value);
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => getString(item))
    .filter((item) => item.length > 0);
}

function normalizeAiError(error: unknown): NormalizedAiError {
  if (error instanceof Error) {
    const record = error as Error & {
      status?: number;
      requiresPayment?: boolean;
      checkoutUrl?: string;
    };

    return {
      message: record.message || "AI 解説の生成に失敗しました。",
      status: record.status,
      requiresPayment: record.requiresPayment,
      checkoutUrl: record.checkoutUrl,
    };
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;

    return {
      message: getString(record.message) || "AI 解説の生成に失敗しました。",
      status: typeof record.status === "number" ? record.status : undefined,
      requiresPayment: record.requiresPayment === true,
      checkoutUrl: getString(record.checkoutUrl) || undefined,
    };
  }

  return { message: "AI 解説の生成に失敗しました。" };
}

function FeedbackList({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="ai-results-block">
      <h3>{title}</h3>
      <ul className="ai-feedback-list">
        {items.map((item, index) => (
          <li className="annotation-item" key={`${title}-${index}`}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiFeedbackPanel(props: AiFeedbackPanelProps) {
  const { chart, mode } = props;
  const clientConfig = getAiFeedbackClientConfig();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiFeedbackResult | null>(null);
  const [error, setError] = useState<NormalizedAiError | null>(null);

  const context = useMemo(() => buildAiChartContext(mode, chart), [chart, mode]);
  const hasQuestionText = hasMinimumAiQuestionText(context.questionText);
  const isDisabled = clientConfig.gateMode === "disabled";
  const canRequest = !isLoading && !isDisabled && hasQuestionText;
  const highlights = Array.isArray(context.highlights)
    ? context.highlights.map((highlight) => highlight as unknown as Record<string, unknown>)
    : [];

  const feedbackRecord = result
    ? (result.feedback as unknown as Record<string, unknown>)
    : null;
  const resultRecord = result ? (result as unknown as Record<string, unknown>) : null;
  const overview = feedbackRecord ? getString(feedbackRecord.overview) : "";
  const confidence = feedbackRecord ? getDisplayValue(feedbackRecord.confidence) : "";
  const disclaimer =
    (feedbackRecord ? getString(feedbackRecord.disclaimer) : "") ||
    (resultRecord ? getString(resultRecord.disclaimer) : "");
  const model = resultRecord ? getString(resultRecord.model) : "";
  const generatedAt = resultRecord ? getString(resultRecord.generatedAt) : "";
  const checkoutUrl = error?.checkoutUrl || clientConfig.checkoutUrl;

  async function handleRequest() {
    if (!canRequest) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const nextResult = await requestAiFeedback(context);
      setResult(nextResult);
    } catch (caughtError) {
      setError(normalizeAiError(caughtError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="panel ai-feedback-panel">
      <div className="panel-heading">
        <p className="eyebrow">AI 解説</p>
        <h2>{MODE_LABELS[mode]}の補助解釈</h2>
        <p>
          盤面・入力・抽出シグナルをAIへ渡し、判断材料の整理、注意点、次に見るべき観点を生成します。
        </p>
      </div>

      <div className="ai-highlight-grid">
        <article className="ai-highlight-card">
          <span>利用状態</span>
          <strong>{GATE_LABELS[clientConfig.gateMode]}</strong>
          <p>
            {clientConfig.gateMode === "preview"
              ? "現在の環境ではAI生成を試行できます。"
              : clientConfig.gateMode === "paid"
                ? "本番利用では有料ゲートの状態を確認します。"
                : "環境設定でAI解説が停止されています。"}
          </p>
        </article>

        {highlights.map((highlight, index) => {
          const label = getString(highlight.label) || getString(highlight.title) || "注目点";
          const value =
            getDisplayValue(highlight.value) ||
            getDisplayValue(highlight.text) ||
            getDisplayValue(highlight.summary);
          const description =
            getString(highlight.description) ||
            getString(highlight.detail) ||
            getString(highlight.note);

          return (
            <article className="ai-highlight-card" key={`${label}-${index}`}>
              <span>{label}</span>
              <strong>{value || "-"}</strong>
              {description ? <p>{description}</p> : null}
            </article>
          );
        })}
      </div>

      <div className="ai-results-block">
        <h3>AI 参照コンテキスト</h3>
        <p>{context.questionText}</p>
      </div>

      {!hasQuestionText ? (
        <div className="ai-empty-state">
          AIに渡す照会文が短すぎます。起局条件または盤面情報を更新してから再実行してください。
        </div>
      ) : null}

      {isDisabled ? (
        <div className="ai-empty-state">
          AI解説は現在停止中です。`AI_FEEDBACK_MODE` または `VITE_AI_FEEDBACK_MODE` を `preview` にすると生成できます。
        </div>
      ) : null}

      {clientConfig.gateMode === "paid" ? (
        <div className="paywall-note">
          本番環境では有料利用として扱います。
          {clientConfig.checkoutUrl ? (
            <>
              {" "}
              <a href={clientConfig.checkoutUrl} rel="noreferrer" target="_blank">
                利用手続きへ進む
              </a>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="ai-feedback-actions">
        <button disabled={!canRequest} onClick={handleRequest} type="button">
          {isLoading ? "AI解説を生成中..." : "AI解説を生成"}
        </button>
      </div>

      {error ? (
        <div className="ai-error-note" role="alert">
          <p>{error.message}</p>
          {error.requiresPayment && checkoutUrl ? (
            <a href={checkoutUrl} rel="noreferrer" target="_blank">
              利用手続きへ進む
            </a>
          ) : null}
        </div>
      ) : null}

      {feedbackRecord ? (
        <div className="ai-results-block" aria-live="polite">
          <h3>AI 解説結果</h3>
          {overview ? <p>{overview}</p> : null}
          {confidence ? (
            <p>
              <strong>信頼度:</strong> {confidence}
            </p>
          ) : null}
          {model || generatedAt ? (
            <p>
              {model ? `Model: ${model}` : null}
              {model && generatedAt ? " / " : null}
              {generatedAt ? `Generated: ${generatedAt}` : null}
            </p>
          ) : null}
        </div>
      ) : null}

      {feedbackRecord ? (
        <>
          <FeedbackList items={getStringArray(feedbackRecord.keySignals)} title="主要シグナル" />
          <FeedbackList items={getStringArray(feedbackRecord.cautions)} title="注意点" />
          <FeedbackList items={getStringArray(feedbackRecord.nextActions)} title="次に見る観点" />
          <FeedbackList items={getStringArray(feedbackRecord.followUpQuestions)} title="追加確認質問" />
          {disclaimer ? (
            <div className="ai-empty-state">
              <strong>免責:</strong> {disclaimer}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
