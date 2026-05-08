import { useMemo, useState } from "react";
import { SynthesisInputPanel } from "../SynthesisInputPanel";
import { ChartSummaryPanel } from "../ChartSummaryPanel";
import {
  buildSynthesisContext,
  getAiFeedbackClientConfig,
  hasMinimumAiQuestionText,
  requestAiFeedback,
} from "../../lib/aiFeedback";
import { buildLiurenChart, LOCATION_OFFSETS } from "../../lib/engine";
import { buildKingoketsuChart } from "../../lib/kingoketsu";
import { buildQimenChart } from "../../lib/qimen";
import { buildDannekiChart } from "../../lib/danneki";
import { buildTaiitsuChart } from "../../lib/taiitsu";
import type { SynthesisInput } from "../../lib/types";
import type { WorkspaceProps } from "./shared";

void LOCATION_OFFSETS;

type AiFeedbackResult = Awaited<ReturnType<typeof requestAiFeedback>>;

function getString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function getStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => getString(x)).filter(Boolean) : [];
}

function FeedbackList({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) return null;
  return (
    <div className="ai-results-block">
      <h3>{title}</h3>
      <ul className="ai-feedback-list">
        {items.map((item, i) => <li className="annotation-item" key={i}>{item}</li>)}
      </ul>
    </div>
  );
}

export function SynthesisWorkspace({ input, years, daysInMonth, onApplyNow, onInputChange }: WorkspaceProps<SynthesisInput>) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiFeedbackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientConfig = getAiFeedbackClientConfig();

  const liurenInput = useMemo(() => ({
    year: input.year, month: input.month, day: input.day,
    hour: input.hour, minute: input.minute, locationId: input.locationId,
    topic: input.topic, questionText: input.questionText,
    manualOverrides: { dayGanzhi: "", monthGeneral: "", hourBranch: "" },
  }), [input]);

  const qimenInput = useMemo(() => ({
    year: input.year, month: input.month, day: input.day,
    hour: input.hour, minute: input.minute, locationId: input.locationId,
    topic: input.topic, questionText: input.questionText,
    targetDirection: input.targetDirection,
  }), [input]);

  const kingoketsuInput = useMemo(() => ({
    year: input.year, month: input.month, day: input.day,
    hour: input.hour, minute: input.minute, locationId: input.locationId,
    difen: input.difen, topic: input.topic, questionText: input.questionText,
    nobleChoice: input.nobleChoice, dstMinutes: input.dstMinutes,
  }), [input]);

  const dannekiInput = useMemo(() => ({
    year: input.year, month: input.month, day: input.day,
    hour: input.hour, minute: input.minute, locationId: input.locationId,
    topic: input.topic, questionText: input.questionText,
    lineInputMode: "auto" as const, manualLineValues: null,
  }), [input]);

  const taiitsuInput = useMemo(() => ({
    year: input.year, month: input.month, day: input.day,
    hour: input.hour, minute: input.minute, locationId: input.locationId,
    direction: input.taiitsuDirection, startCondition: input.startCondition,
    topic: input.topic, questionText: input.questionText,
  }), [input]);

  const liuren = useMemo(() => buildLiurenChart(liurenInput), [liurenInput]);
  const qimen = useMemo(() => buildQimenChart(qimenInput), [qimenInput]);
  const kingoketsu = useMemo(() => buildKingoketsuChart(kingoketsuInput), [kingoketsuInput]);
  const danneki = useMemo(() => buildDannekiChart(dannekiInput), [dannekiInput]);
  const taiitsu = useMemo(() => buildTaiitsuChart(taiitsuInput), [taiitsuInput]);

  const synthContext = useMemo(
    () => buildSynthesisContext({ liuren, qimen, kingoketsu, danneki, taiitsu }),
    [liuren, qimen, kingoketsu, danneki, taiitsu],
  );

  const hasQuestion = hasMinimumAiQuestionText(input.questionText);
  const canRequest = !isLoading && clientConfig.gateMode !== "disabled" && hasQuestion;

  async function handleRequest() {
    if (!canRequest) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await requestAiFeedback(synthContext));
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "AI解説の生成に失敗しました。";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  const feedbackRecord = result ? (result.feedback as unknown as Record<string, unknown>) : null;

  return (
    <>
      <SynthesisInputPanel
        input={input}
        locations={LOCATION_OFFSETS}
        daysInMonth={daysInMonth}
        years={years}
        onApplyNow={onApplyNow}
        onInputChange={onInputChange}
      />

      <section className="panel synthesis-grid-panel">
        <div className="panel-heading">
          <p className="eyebrow">三式・卜術</p>
          <h2>五術一覧</h2>
          <p>同一条件から生成した五種の盤サマリです。各占術の詳細は個別モードでご確認ください。</p>
        </div>
        <div className="synthesis-summary-grid">
          <ChartSummaryPanel
            modeLabel="六壬神課"
            headline={`${liuren.resolvedTopic} / ${liuren.lessonType ?? "未確定"}`}
            correctedDateTime={liuren.basis.correctedDateTime}
            certainty={liuren.certainty}
            caveat={liuren.messages[0] ?? ""}
            sourceCount={liuren.sourceReferences.length}
            details={[
              { label: "課式", value: liuren.lessonType ?? "未確定" },
              { label: "月将", value: liuren.basis.monthGeneral },
              { label: "三伝", value: liuren.threeTransmissions.map((t) => t.branch).join("→") || "未確定" },
            ]}
          />
          <ChartSummaryPanel
            modeLabel="奇門遁甲"
            headline={`${qimen.resolvedTopic} / ${qimen.selectedDirectionJudgment.direction}${qimen.selectedDirectionJudgment.label}`}
            correctedDateTime={qimen.basis.correctedDateTime}
            certainty={qimen.certainty}
            caveat={qimen.messages[0] ?? ""}
            sourceCount={qimen.sourceReferences.length}
            details={[
              { label: "時盤", value: `${qimen.primaryBoard.basis.yinYang}${qimen.primaryBoard.basis.juNumber}局` },
              { label: "選択方位", value: qimen.selectedDirectionJudgment.direction },
              { label: "方位判断", value: qimen.selectedDirectionJudgment.label },
            ]}
          />
          <ChartSummaryPanel
            modeLabel="金口訣"
            headline={`${kingoketsu.resolvedTopic} / ${kingoketsu.basis.useYao}`}
            correctedDateTime={kingoketsu.basis.correctedDateTime}
            certainty={kingoketsu.certainty}
            caveat={kingoketsu.basis.useYaoReason}
            sourceCount={kingoketsu.sourceReferences.length}
            details={[
              { label: "地分", value: input.difen },
              { label: "用爻", value: kingoketsu.basis.useYao },
              { label: "月将", value: kingoketsu.basis.monthGeneral },
            ]}
          />
          <ChartSummaryPanel
            modeLabel="断易"
            headline={`${danneki.resolvedTopic} / ${danneki.basis.useDeity}`}
            correctedDateTime={danneki.basis.correctedDateTime}
            certainty={danneki.certainty}
            caveat={danneki.basis.useGodReason}
            sourceCount={danneki.sourceReferences.length}
            details={[
              { label: "本卦", value: `${danneki.basis.upperTrigram.key}/${danneki.basis.lowerTrigram.key}` },
              { label: "動爻", value: danneki.basis.movingLines.join(", ") || "なし" },
              { label: "用神", value: danneki.basis.useDeity },
            ]}
          />
          <ChartSummaryPanel
            modeLabel="太乙神数"
            headline={taiitsu.summary?.headline ?? `${taiitsu.resolvedTopic} / ${taiitsu.basis.cycleIndex + 1}局`}
            correctedDateTime={taiitsu.basis.correctedDateTime}
            certainty={taiitsu.certainty}
            caveat={taiitsu.messages[0] ?? ""}
            sourceCount={taiitsu.sourceReferences.length}
            details={[
              { label: "方位", value: taiitsu.basis.direction },
              { label: "起局条件", value: taiitsu.basis.startCondition },
              { label: "局序", value: `${taiitsu.basis.cycleIndex + 1}局` },
            ]}
          />
        </div>
      </section>

      <section className="panel ai-feedback-panel">
        <div className="panel-heading">
          <p className="eyebrow">AI 統合解釈</p>
          <h2>三式・卜術の横断分析</h2>
          <p>五種の盤面を同時にAIへ渡し、各占術の収束点・相違点・総合的な判断材料を整理します。</p>
        </div>

        {!hasQuestion ? (
          <div className="ai-empty-state">AIに渡す相談文が短すぎます。相談内容を入力してから実行してください。</div>
        ) : null}

        {clientConfig.gateMode === "disabled" ? (
          <div className="ai-empty-state">AI解説は現在停止中です。</div>
        ) : null}

        <div className="ai-feedback-actions">
          <button disabled={!canRequest} onClick={handleRequest} type="button">
            {isLoading ? "統合AI解説を生成中..." : "統合AI解説を生成"}
          </button>
        </div>

        {error ? <div className="ai-error-note" role="alert"><p>{error}</p></div> : null}

        {feedbackRecord ? (
          <>
            <div className="ai-results-block" aria-live="polite">
              <h3>統合解説</h3>
              {getString(feedbackRecord.overview) ? <p>{getString(feedbackRecord.overview)}</p> : null}
              {getString(feedbackRecord.confidence) ? (
                <p><strong>信頼度:</strong> {getString(feedbackRecord.confidence)}</p>
              ) : null}
            </div>
            <FeedbackList items={getStringArray(feedbackRecord.keySignals)} title="主要シグナル（共通点）" />
            <FeedbackList items={getStringArray(feedbackRecord.cautions)} title="注意点・占術間の相違" />
            <FeedbackList items={getStringArray(feedbackRecord.nextActions)} title="次に見る観点" />
            <FeedbackList items={getStringArray(feedbackRecord.followUpQuestions)} title="追加確認質問" />
            {getString(feedbackRecord.disclaimer) ? (
              <div className="ai-empty-state">
                <strong>免責:</strong> {getString(feedbackRecord.disclaimer)}
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </>
  );
}
