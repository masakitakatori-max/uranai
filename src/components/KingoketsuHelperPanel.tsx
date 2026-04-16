import { ChartEvidencePanel } from "./ChartEvidencePanel";
import { getSafeList } from "../lib/uiUtils";
import type { KingoketsuChart, KingoketsuHelperSection, KingoketsuNarrativeSection } from "../lib/types";

interface KingoketsuHelperPanelProps {
  chart: KingoketsuChart;
}

export function KingoketsuHelperPanel({ chart }: KingoketsuHelperPanelProps) {
  const helperSections = getSafeList<KingoketsuHelperSection>(chart.helperSections);
  const explanationSections = getSafeList<KingoketsuNarrativeSection>(chart.explanationSections);
  const interpretationSections = getSafeList<KingoketsuNarrativeSection>(chart.interpretationSections);
  return (
    <section className="panel helper-panel">
      <div className="panel-heading">
        <p className="eyebrow">補助判断資料</p>
        <h2>機械解説</h2>
        <p>金口訣の盤面・旺相休囚死・関係性を、人間が読み下す前提で見やすくまとめています。</p>
      </div>

      <div className="basis-grid">
        <div>
          <span>入力時刻</span>
          <strong>{chart.basis.wallClockDateTime}</strong>
        </div>
        <div>
          <span>占題</span>
          <strong>{chart.topic}</strong>
        </div>
        <div>
          <span>地分</span>
          <strong>{chart.positions.find((item) => item.key === "地分")?.displayValue}</strong>
        </div>
        <div>
          <span>貴神起点</span>
          <strong>
            {chart.basis.nobleChoice} / {chart.basis.nobleStartBranch}
          </strong>
        </div>
        <div>
          <span>月将起点</span>
          <strong>
            時支 {chart.basis.hourPillar.branch} / 月将 {chart.basis.monthGeneral}
          </strong>
        </div>
      </div>

      {chart.questionText.trim() ? (
        <div className="consultation-note">
          <span>相談文</span>
          <p>{chart.questionText}</p>
        </div>
      ) : null}

      <div className="annotation-list">
        {chart.positions.map((position) => (
          <article className="annotation-item" key={position.key}>
            <header>
              <span>{position.key}</span>
              <strong>{position.displayValue}</strong>
            </header>
            <div className="annotation-meta">
              <span>{position.title}</span>
              <span>{position.wuxing}</span>
              <span>{position.state}</span>
              <span>{position.yinYang}</span>
              {position.convertedBranch ? <span>変換 {position.convertedBranch}</span> : null}
              {position.isUseYao ? <span>用神</span> : null}
            </div>
          </article>
        ))}
      </div>

      <div className="annotation-list helper-section-list">
        {helperSections.map((section) => (
          <article className="annotation-item" key={section.title}>
            <header>
              <span>{section.title}</span>
              <strong>{section.value}</strong>
            </header>
            {section.note ? <p>{section.note}</p> : null}
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
