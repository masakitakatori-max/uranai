import { ChartEvidencePanel } from "./ChartEvidencePanel";
import { getDannekiLineLabel, getSafeList } from "../lib/uiUtils";
import type { DannekiChart } from "../lib/types";

interface DannekiHelperPanelProps {
  chart: DannekiChart;
}

export function DannekiHelperPanel({ chart }: DannekiHelperPanelProps) {
  const lines = getSafeList(chart.lines);
  const explanationSections = getSafeList(chart.explanationSections);
  const interpretationSections = getSafeList(chart.interpretationSections);

  return (
    <section className="panel helper-panel">
      <div className="panel-heading">
        <p className="eyebrow">判定補助層</p>
        <h2>参照情報</h2>
        <p>相談文、卦象の構造、用神候補、動爻の位置を横断して確認できます。</p>
      </div>

      <div className="basis-grid">
        <div>
          <span>占的</span>
          <strong>{chart.topic}</strong>
        </div>
        <div>
          <span>日辰</span>
          <strong>{chart.basis.dayGanzhi}</strong>
        </div>
        <div>
          <span>月建</span>
          <strong>{chart.basis.monthBranch}</strong>
        </div>
        <div>
          <span>空亡</span>
          <strong>{chart.basis.voidBranches.join(" / ")}</strong>
        </div>
        <div>
          <span>用神候補</span>
          <strong>{chart.basis.useDeity}</strong>
        </div>
        <div>
          <span>用神決定</span>
          <strong>{chart.basis.useGodLine ? getDannekiLineLabel(chart.basis.useGodLine) : "未確定"}</strong>
        </div>
        <div>
          <span>世 / 応</span>
          <strong>
            {chart.basis.worldLine ? getDannekiLineLabel(chart.basis.worldLine) : "未確定"} /{" "}
            {chart.basis.responseLine ? getDannekiLineLabel(chart.basis.responseLine) : "未確定"}
          </strong>
        </div>
        <div>
          <span>内卦</span>
          <strong>
            {chart.basis.lowerTrigram.key} / {chart.basis.lowerTrigram.image}
          </strong>
        </div>
        <div>
          <span>外卦</span>
          <strong>
            {chart.basis.upperTrigram.key} / {chart.basis.upperTrigram.image}
          </strong>
        </div>
        <div>
          <span>動爻</span>
          <strong>{chart.basis.movingLines.length ? chart.basis.movingLines.map((value) => getDannekiLineLabel(value)).join(" / ") : "なし"}</strong>
        </div>
      </div>

      {chart.questionText.trim() ? (
        <div className="consultation-note">
          <span>相談文</span>
          <p>{chart.questionText}</p>
        </div>
      ) : null}

      <ChartEvidencePanel certainty={chart.certainty} traces={chart.traces} sourceReferences={chart.sourceReferences} />

      <div className="annotation-list">
        {lines.map((line) => (
          <article className="annotation-item" key={line.position}>
            <header>
              <span>
                {getDannekiLineLabel(line.position)}
                {line.role ? ` (${line.role})` : ""}
              </span>
              <strong>
                {line.relation} / {line.element} / {line.stem}
                {line.branch}
              </strong>
            </header>
            <div className="annotation-meta">
              <span>{line.original} → {line.changed}</span>
              <span>{line.isMoving ? `動爻(${line.value})` : `静爻(${line.value})`}</span>
              <span>{line.seasonalState}</span>
              <span>{line.sixSpirit}</span>
              <span>{line.useGodRole ? `役割:${line.useGodRole}` : "役割:なし"}</span>
              <span>{line.dayRelations.length ? `日辰:${line.dayRelations.join("・")}` : "日辰:影響薄"}</span>
              <span>{line.isVoid ? "空亡" : "非空亡"}</span>
              <span>{line.isMonthBroken ? "月破" : "月破なし"}</span>
            </div>
            <p>{line.note}</p>
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
