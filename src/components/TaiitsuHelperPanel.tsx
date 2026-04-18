import { ChartEvidencePanel } from "./ChartEvidencePanel";
import { getSafeList } from "../lib/uiUtils";
import type { NarrativeSection, TaiitsuChart } from "../lib/types";

interface TaiitsuHelperPanelProps {
  chart: TaiitsuChart;
}

export function TaiitsuHelperPanel({ chart }: TaiitsuHelperPanelProps) {
  const explanationSections = getSafeList<NarrativeSection>(chart.explanationSections);
  const interpretationSections = getSafeList<NarrativeSection>(chart.interpretationSections);

  return (
    <section className="panel helper-panel">
      <div className="panel-heading">
        <p className="eyebrow">補助判断資料</p>
        <h2>太乙神数の根拠</h2>
        <p>構造化ルールインデックス、入力条件、局序算出の trace をまとめています。</p>
      </div>

      <div className="basis-grid">
        <div>
          <span>入力時刻</span>
          <strong>{chart.basis.wallClockDateTime}</strong>
        </div>
        <div>
          <span>地点</span>
          <strong>{chart.basis.locationLabel}</strong>
        </div>
        <div>
          <span>時支</span>
          <strong>{chart.basis.hourBranch}</strong>
        </div>
        <div>
          <span>占的</span>
          <strong>{chart.resolvedTopic}</strong>
        </div>
      </div>

      {chart.questionText.trim() ? (
        <div className="consultation-note">
          <span>相談文</span>
          <p>{chart.questionText}</p>
        </div>
      ) : null}

      <div className="annotation-list">
        {chart.summary.coreSignals.map((signal) => (
          <article className="annotation-item" key={signal.key}>
            <header>
              <span>{signal.title}</span>
              <strong>{signal.value}</strong>
            </header>
          </article>
        ))}
      </div>

      <div className="narrative-block">
        <div className="section-label">解説</div>
        <div className="narrative-list">
          {explanationSections.map((section) => (
            <article className="annotation-item" key={section.key}>
              <header>
                <span>{section.title}</span>
              </header>
              {section.paragraphs.map((paragraph) => (
                <p key={`${section.key}-${paragraph}`}>{paragraph}</p>
              ))}
            </article>
          ))}
        </div>
      </div>

      <div className="narrative-block">
        <div className="section-label">解釈</div>
        <div className="narrative-list">
          {interpretationSections.map((section) => (
            <article className="annotation-item" key={section.key}>
              <header>
                <span>{section.title}</span>
              </header>
              {section.paragraphs.map((paragraph) => (
                <p key={`${section.key}-${paragraph}`}>{paragraph}</p>
              ))}
            </article>
          ))}
        </div>
      </div>

      <ChartEvidencePanel certainty={chart.certainty} traces={chart.traces} sourceReferences={chart.sourceReferences} />
    </section>
  );
}
