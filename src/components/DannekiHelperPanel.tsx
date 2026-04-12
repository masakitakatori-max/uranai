import type { DannekiChart } from "../lib/types";

interface DannekiHelperPanelProps {
  chart: DannekiChart;
}

function lineLabel(position: number) {
  return ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"][position - 1] ?? `${position}爻`;
}

export function DannekiHelperPanel({ chart }: DannekiHelperPanelProps) {
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
          <span>用神候補</span>
          <strong>{chart.basis.useDeity}</strong>
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
          <strong>{chart.basis.movingLines.map((value) => lineLabel(value)).join(" / ")}</strong>
        </div>
      </div>

      {chart.questionText.trim() ? (
        <div className="consultation-note">
          <span>相談文</span>
          <p>{chart.questionText}</p>
        </div>
      ) : null}

      <div className="annotation-list">
        {chart.lines.map((line) => (
          <article className="annotation-item" key={line.position}>
            <header>
              <span>{lineLabel(line.position)}</span>
              <strong>{line.relation}</strong>
            </header>
            <div className="annotation-meta">
              <span>{line.original}</span>
              <span>{line.changed}</span>
              <span>{line.isMoving ? "動爻" : "静爻"}</span>
            </div>
            <p>{line.note}</p>
          </article>
        ))}
      </div>

      <div className="narrative-block">
        <div className="section-label">解説</div>
        <div className="narrative-list">
          {chart.explanationSections.map((section) => (
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
          {chart.interpretationSections.map((section) => (
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
