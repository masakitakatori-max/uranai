import { useState } from "react";

import { buildAiChartContext, getAiFeedbackClientConfig, requestAiFeedback, type AiFeedbackError, type AiFeedbackPayload } from "../lib/aiFeedback";
import type { DannekiChart, KingoketsuChart, LiurenChart } from "../lib/types";

type AiFeedbackPanelProps =
  | { mode: "liuren"; chart: LiurenChart }
  | { mode: "kingoketsu"; chart: KingoketsuChart }
  | { mode: "danneki"; chart: DannekiChart };

function gateLabel(mode: ReturnType<typeof getAiFeedbackClientConfig>["gateMode"]) {
  if (mode === "preview") {
    return "管理プレビュー";
  }

  if (mode === "paid") {
    return "有料プラン";
  }

  return "準備中";
}

function gateTone(mode: ReturnType<typeof getAiFeedbackClientConfig>["gateMode"]) {
  if (mode === "preview") {
    return "is-ready";
  }

  if (mode === "paid") {
    return "is-paid";
  }

  return "is-muted";
}

function renderList(title: string, values: string[]) {
  if (!values.length) {
    return null;
  }

  return (
    <article className="annotation-item">
      <header>
        <span>{title}</span>
      </header>
      <div className="ai-feedback-list">
        {values.map((value) => (
          <p key={`${title}-${value}`}>{value}</p>
        ))}
      </div>
    </article>
  );
}

export function AiFeedbackPanel({ mode, chart }: AiFeedbackPanelProps) {
  const clientConfig = getAiFeedbackClientConfig();
  const context = buildAiChartContext(mode, chart);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<AiFeedbackPayload | null>(null);
  const [error, setError] = useState<AiFeedbackError | null>(null);

  const canRequest = clientConfig.gateMode === "preview";
  const hasQuestion = context.questionText.length > 0;

  const handleRequest = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await requestAiFeedback(context);
      setFeedback(response.feedback);
    } catch (caught) {
      const fallback: AiFeedbackError =
        typeof caught === "object" && caught && "error" in caught
          ? (caught as AiFeedbackError)
          : { ok: false, error: "AI フィードバックの取得に失敗しました。" };
      setFeedback(null);
      setError(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="panel ai-feedback-panel">
      <div className="panel-heading">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">AI 鑑定層</p>
            <h2>Claude フィードバック</h2>
          </div>
          <span className={`status-badge ${gateTone(clientConfig.gateMode)}`}>{gateLabel(clientConfig.gateMode)}</span>
        </div>
        <p>相談文と立式結果の要約を Claude に渡し、論点整理、見落とし、次の確認ポイントを日本語で返します。</p>
      </div>

      <div className="ai-highlight-grid">
        <article className="consultation-note">
          <span>送信対象</span>
          <p>
            {context.modeLabel} / {context.topic}
          </p>
        </article>
        {context.highlights.map((item) => (
          <article className="ai-highlight-card" key={`${mode}-${item.label}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      {!hasQuestion ? (
        <div className="ai-empty-state">
          <strong>相談文を入れると AI の精度が上がります。</strong>
          <p>まずは何を占いたいかを1文で入れてください。AI は相談文と立式結果の両方を参照して返答します。</p>
        </div>
      ) : null}

      {clientConfig.gateMode === "disabled" ? (
        <div className="paywall-note">
          <strong>AI フィードバックは未設定です。</strong>
          <p>Anthropic の API キーと公開モードを設定すると、このパネルから Claude を呼べます。</p>
        </div>
      ) : null}

      {clientConfig.gateMode === "paid" ? (
        <div className="paywall-note">
          <strong>公開版では有料プラン向けに切り替えられる構成です。</strong>
          <p>今は paywall の土台まで入れてあります。決済後の権限付与は、次段で Stripe などの会員連携をつなげる前提です。</p>
          {clientConfig.checkoutUrl ? (
            <a className="cta-link" href={clientConfig.checkoutUrl} rel="noreferrer" target="_blank">
              有料プラン導線を開く
            </a>
          ) : null}
        </div>
      ) : null}

      {canRequest ? (
        <div className="ai-feedback-actions">
          <button className="action-button" disabled={!hasQuestion || isLoading} onClick={handleRequest} type="button">
            {isLoading ? "Claude が読解中..." : "AI フィードバックを生成"}
          </button>
          <p>機械解釈の追認だけでなく、論点の抜け、優先順位、次に聞くべき問いまで返す設計です。</p>
        </div>
      ) : null}

      {error ? (
        <div className="override-note ai-error-note">
          {error.error}
          {error.requiresPayment && error.checkoutUrl ? (
            <>
              {" "}
              <a href={error.checkoutUrl} rel="noreferrer" target="_blank">
                アップグレード
              </a>
            </>
          ) : null}
        </div>
      ) : null}

      {feedback ? (
        <div className="narrative-block ai-results-block">
          <div className="section-label">AI 解釈</div>
          <div className="narrative-list">
            <article className="annotation-item">
              <header>
                <span>総評</span>
                <strong>{feedback.confidence}</strong>
              </header>
              <p>{feedback.overview}</p>
            </article>
            {renderList("注目信号", feedback.keySignals)}
            {renderList("注意点", feedback.cautions)}
            {renderList("次の一手", feedback.nextActions)}
            {renderList("追加で確認したいこと", feedback.followUpQuestions)}
            <article className="annotation-item">
              <header>
                <span>留意</span>
              </header>
              <p>{feedback.disclaimer}</p>
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}
