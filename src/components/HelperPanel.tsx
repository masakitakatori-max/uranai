import { ChartEvidencePanel } from "./ChartEvidencePanel";
import { getSafeList } from "../lib/uiUtils";
import type { LiurenChart } from "../lib/types";

interface HelperPanelProps {
  chart: LiurenChart;
}

export function HelperPanel({ chart }: HelperPanelProps) {
  const helperAnnotations = getSafeList(chart.helperAnnotations);
  const explanationSections = getSafeList(chart.explanationSections);
  const interpretationSections = getSafeList(chart.interpretationSections);

  return (
    <section className="panel helper-panel">
      <div className="panel-heading">
        <p className="eyebrow">判定補助層</p>
        <h2>参照情報</h2>
        <p>六親・天将・旺相休囚死と支関係を横断して確認できます。</p>
      </div>

      <div className="basis-grid">
        <div>
          <span>地点</span>
          <strong>
            {chart.basis.locationLabel} {chart.basis.offsetMinutes > 0 ? `+${chart.basis.offsetMinutes}` : chart.basis.offsetMinutes}分
          </strong>
        </div>
        <div>
          <span>占的</span>
          <strong>{chart.topic}</strong>
        </div>
        <div>
          <span>月支</span>
          <strong>{chart.basis.monthBranch}</strong>
        </div>
        <div>
          <span>空亡</span>
          <strong>
            {chart.basis.voidBranches[0]} {chart.basis.voidBranches[1]}
          </strong>
        </div>
        <div>
          <span>貴人</span>
          <strong>
            {chart.basis.nobleMode}
            {chart.basis.nobleBranch}
          </strong>
        </div>
      </div>

      {chart.questionText.trim() ? (
        <div className="consultation-note">
          <span>相談文</span>
          <p>{chart.questionText}</p>
        </div>
      ) : null}

      {chart.basis.appliedOverrides.length ? <div className="override-note">手動補正中: {chart.basis.appliedOverrides.join(" / ")}</div> : null}

      <ChartEvidencePanel certainty={chart.certainty} traces={chart.traces} sourceReferences={chart.sourceReferences} />

      <div className="annotation-list">
        {helperAnnotations.map((item) => (
          <article className="annotation-item" key={item.key}>
            <header>
              <span>{item.label}</span>
              <strong>{item.branch}</strong>
            </header>
            <div className="annotation-meta">
              <span>{item.heavenlyGeneral}</span>
              <span>{item.sixKin}</span>
              <span>{item.wuxing}</span>
              <span>{item.seasonalState}</span>
              <span>{item.isVoid ? "空亡" : "実神"}</span>
            </div>
            <p>{item.relations.length ? item.relations.join(" / ") : "対照枝との特記なし"}</p>
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
    </section>
  );
}
