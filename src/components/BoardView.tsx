import { PLATE_GRID_POSITIONS } from "../lib/engine";
import { getSafeList } from "../lib/uiUtils";
import type { LiurenChart } from "../lib/types";

interface BoardViewProps {
  chart: LiurenChart;
}

function badgeClassName(isActive: boolean, tone: "gold" | "warning" | "accent" = "gold") {
  return isActive ? `marker marker-${tone}` : "marker";
}

export function BoardView({ chart }: BoardViewProps) {
  const plateCells = getSafeList(chart.plateCells);
  const fourLessons = getSafeList(chart.fourLessons);
  const threeTransmissions = getSafeList(chart.threeTransmissions);
  const messages = getSafeList(chart.messages);

  return (
    <section className="panel board-panel">
      <div className="panel-heading">
        <p className="eyebrow">盤生成層</p>
        <h2>六壬神課盤</h2>
        <p>地盤・天盤・四課・三伝を、巻末フォーマットの雰囲気を残したまま現代的に再配置しています。</p>
      </div>

      <div className="board-meta">
        <div>
          <span>補正日時</span>
          <strong>{chart.basis.correctedDateTime}</strong>
        </div>
        <div>
          <span>日干支</span>
          <strong>{chart.basis.dayGanzhi}</strong>
        </div>
        <div>
          <span>月将 / 占時</span>
          <strong>
            {chart.basis.monthGeneral} / {chart.basis.hourBranch}
          </strong>
        </div>
        <div>
          <span>課式 / 局数</span>
          <strong>
            {chart.lessonType ?? "未詳"} / {chart.basis.juNumber}局
          </strong>
        </div>
      </div>

      <div className="board-canvas">
        <div className="plate-shell">
          <div className="plate-grid">
            {plateCells.map((cell) => {
              const position = PLATE_GRID_POSITIONS[cell.earth];
              return (
                <div className={cell.isVoid ? "plate-cell plate-cell-void" : "plate-cell"} key={cell.earth} style={{ gridRow: position.row, gridColumn: position.column }}>
                  <span className={badgeClassName(cell.isNobleSeat)}>{cell.general}</span>
                  <strong className={badgeClassName(cell.isMonthGeneral, "accent")}>{cell.heaven}</strong>
                  <span className={badgeClassName(cell.isVoid, "warning")}>{cell.earth}</span>
                  {cell.isHourSeat ? <em>占時</em> : null}
                </div>
              );
            })}
            <div className="plate-center">
              <span>天盤</span>
              <strong>{chart.basis.generalOrder}行</strong>
              <small>
                貴人 {chart.basis.nobleMode}
                {chart.basis.nobleBranch}
              </small>
            </div>
          </div>
        </div>

        <div className="board-side">
          <div className="lesson-block">
            <div className="section-label">四課</div>
            <div className="lesson-grid">
              {fourLessons.map((lesson) => (
                <article className="lesson-card" key={lesson.index}>
                  <header>
                    <span>第{lesson.index}課</span>
                    <strong>{lesson.heavenlyGeneral}</strong>
                  </header>
                  <div className="lesson-pair">
                    <span><small>上</small>{lesson.upper}</span>
                    <span><small>下</small>{lesson.lower}</span>
                  </div>
                  <footer>
                    <span>{lesson.sixKin}</span>
                    <span>{lesson.isVoid ? "空亡" : "実神"}</span>
                  </footer>
                </article>
              ))}
            </div>
          </div>

          <div className="transmission-block">
            <div className="section-label">三伝</div>
            <div className="transmission-stack">
              {threeTransmissions.length ? (
                threeTransmissions.map((item) => (
                  <article className="transmission-card" key={item.stage}>
                    <span>{item.stage}</span>
                    <strong>{item.dunStem ? `${item.dunStem}${item.branch}` : item.branch}</strong>
                    <small>{item.heavenlyGeneral}</small>
                    <em>{item.sixKin}</em>
                  </article>
                ))
              ) : (
                <article className="transmission-card transmission-card-empty">
                  <span>三伝</span>
                  <strong>未収録</strong>
                  <small>lookup が存在しません</small>
                </article>
              )}
            </div>
          </div>
        </div>
      </div>

      {messages.length ? (
        <div className="message-strip">
          {messages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
