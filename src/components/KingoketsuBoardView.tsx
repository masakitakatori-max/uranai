import type { KingoketsuChart } from "../lib/types";

interface KingoketsuBoardViewProps {
  chart: KingoketsuChart;
}

function toneClassName(tone: "neutral" | "good" | "alert") {
  if (tone === "good") return "mini-badge mini-badge-good";
  if (tone === "alert") return "mini-badge mini-badge-alert";
  return "mini-badge";
}

export function KingoketsuBoardView({ chart }: KingoketsuBoardViewProps) {
  return (
    <section className="panel board-panel">
      <div className="panel-heading">
        <p className="eyebrow">盤生成層</p>
        <h2>金口訣 盤</h2>
        <p>書籍の例題ページを意識して、白い記入枠の中心に四柱と課内四位を配置しています。</p>
      </div>

      <div className="board-meta kingoketsu-meta">
        <div>
          <span>真太陽時</span>
          <strong>{chart.basis.correctedDateTime}</strong>
        </div>
        <div>
          <span>月将</span>
          <strong>
            {chart.basis.monthGeneral} {chart.basis.monthGeneralTitle}
          </strong>
        </div>
        <div>
          <span>用爻</span>
          <strong>{chart.basis.useYao}</strong>
        </div>
        <div>
          <span>空亡</span>
          <strong>
            {chart.basis.voidBranches[0]} {chart.basis.voidBranches[1]}
          </strong>
        </div>
      </div>

      <div className="board-canvas kingoketsu-canvas">
        <div className="plate-shell kingoketsu-shell">
          <div className="kingoketsu-board">
            <div className="kingoketsu-pillars">
              {[chart.basis.yearPillar, chart.basis.monthPillar, chart.basis.dayPillar, chart.basis.hourPillar].map((pillar) => (
                <div key={pillar.label}>
                  <span>{pillar.label}</span>
                  <strong>{pillar.ganzhi}</strong>
                </div>
              ))}
            </div>

            <div className="kingoketsu-void-line">
              <span>空亡</span>
              <strong>
                {chart.basis.voidBranches[0]}
                {chart.basis.voidBranches[1]}
              </strong>
              <small>四大空亡 {chart.basis.fourMajorVoid}</small>
            </div>

            <div className="kingoketsu-position-list">
              {chart.positions.map((position) => (
                <article className={`kingoketsu-position ${position.isUseYao ? "is-useyao" : ""}`} key={position.key}>
                  <div>
                    <span>{position.key}</span>
                    <strong>{position.displayValue}</strong>
                  </div>
                  <div className="kingoketsu-position-meta">
                    <span className={toneClassName(position.titleTone)}>{position.title}</span>
                    <span>{position.wuxing}</span>
                    <span>{position.state}</span>
                    <span>{position.yinYang}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="board-side">
          <div className="transmission-block">
            <div className="section-label">要点</div>
            <div className="transmission-stack">
              {chart.helperSections.slice(0, 4).map((section) => (
                <article className="transmission-card" key={section.title}>
                  <span>{section.title}</span>
                  <strong>{section.value}</strong>
                  {section.note ? <small>{section.note}</small> : null}
                </article>
              ))}
            </div>
          </div>

          <div className="transmission-block">
            <div className="section-label">関係</div>
            <div className="transmission-stack">
              {chart.relationSummary.map((item) => (
                <article className="transmission-card" key={item.key}>
                  <span>{item.label}</span>
                  <strong>{item.badges.join(" / ")}</strong>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      {chart.messages.length ? (
        <div className="message-strip">
          {chart.messages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
