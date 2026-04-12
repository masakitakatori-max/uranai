import type { KingoketsuChart } from "../lib/types";

interface KingoketsuHelperPanelProps {
  chart: KingoketsuChart;
}

export function KingoketsuHelperPanel({ chart }: KingoketsuHelperPanelProps) {
  return (
    <section className="panel helper-panel">
      <div className="panel-heading">
        <p className="eyebrow">判定補助層</p>
        <h2>参照情報</h2>
        <p>補正の内訳、四位の旺相休囚死、干支関係、採用した作盤規則を一覧で確認できます。</p>
      </div>

      <div className="basis-grid">
        <div>
          <span>入力時刻</span>
          <strong>{chart.basis.wallClockDateTime}</strong>
        </div>
        <div>
          <span>占的</span>
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
          <span>将神起点</span>
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
              {position.isUseYao ? <span>用爻</span> : null}
            </div>
          </article>
        ))}
      </div>

      <div className="annotation-list helper-section-list">
        {chart.helperSections.map((section) => (
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

      <div className="trace-block">
        <div className="section-label">Rule Trace</div>
        <div className="trace-list">
          {chart.traces.map((trace) => (
            <article className="trace-item" key={`${trace.step}-${trace.source}`}>
              <span>{trace.step}</span>
              <strong>{trace.value}</strong>
              <small>{trace.source}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
