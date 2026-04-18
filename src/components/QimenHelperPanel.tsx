import { ChartEvidencePanel } from "./ChartEvidencePanel";
import { getSafeList } from "../lib/uiUtils";
import type { QimenChart, QimenDirectionJudgment } from "../lib/types";

interface QimenHelperPanelProps {
  chart: QimenChart;
}

function getJudgmentClassName(judgment: QimenDirectionJudgment) {
  return `qimen-direction-row qimen-direction-row-${judgment.tone}`;
}

export function QimenHelperPanel({ chart }: QimenHelperPanelProps) {
  const directionJudgments = getSafeList(chart.directionJudgments);
  const explanationSections = getSafeList(chart.explanationSections);
  const interpretationSections = getSafeList(chart.interpretationSections);
  const selected = chart.selectedDirectionJudgment;

  return (
    <section className="panel helper-panel qimen-helper-panel">
      <div className="panel-heading">
        <p className="eyebrow">方位判断層</p>
        <h2>全方位一覧と選択方位</h2>
        <p>時盤を主盤にして八方位を点数化し、選択した方位の格局候補と注意点を表示します。</p>
      </div>

      <div className="basis-grid">
        <div>
          <span>地点</span>
          <strong>
            {chart.basis.locationLabel} {chart.basis.locationOffsetMinutes >= 0 ? `+${chart.basis.locationOffsetMinutes}` : chart.basis.locationOffsetMinutes}分
          </strong>
        </div>
        <div>
          <span>対応範囲</span>
          <strong>{chart.basis.supportRange}</strong>
        </div>
        <div>
          <span>選択方位</span>
          <strong>{chart.basis.selectedDirection}</strong>
        </div>
        <div>
          <span>補正日時</span>
          <strong>{chart.basis.correctedDateTime}</strong>
        </div>
      </div>

      <article className={`qimen-selected-direction qimen-selected-direction-${selected.tone}`}>
        <span>選択方位</span>
        <strong>
          {selected.direction} / {selected.label} / {selected.score}点
        </strong>
        <p>{selected.patterns.join(" / ")}</p>
        {selected.warnings.length ? <p className="qimen-warning-text">注意: {selected.warnings.join(" / ")}</p> : null}
      </article>

      <div className="qimen-direction-list" aria-label="奇門遁甲 全方位一覧" role="list">
        {directionJudgments.map((judgment) => (
          <article className={getJudgmentClassName(judgment)} key={judgment.direction} role="listitem">
            <div>
              <span>
                {judgment.direction} / {judgment.palace}宮
              </span>
              <strong>{judgment.label}</strong>
            </div>
            <div>
              <span>{judgment.patterns.slice(0, 2).join(" / ")}</span>
              <strong>{judgment.score}点</strong>
            </div>
          </article>
        ))}
      </div>

      {chart.questionText.trim() ? (
        <div className="consultation-note">
          <span>相談文</span>
          <p>{chart.questionText}</p>
        </div>
      ) : null}

      <ChartEvidencePanel certainty={chart.certainty} traces={chart.traces} sourceReferences={chart.sourceReferences} />

      <div className="narrative-block">
        <div className="section-label">作盤メモ</div>
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
        <div className="section-label">選択方位の解釈</div>
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
    </section>
  );
}
