import { PLATE_GRID_POSITIONS } from "../lib/engine";
import { getSafeList } from "../lib/uiUtils";
import type { TaiitsuChart } from "../lib/types";

interface TaiitsuBoardViewProps {
  chart: TaiitsuChart;
}

export function TaiitsuBoardView({ chart }: TaiitsuBoardViewProps) {
  const cycleGrid = getSafeList(chart.cycleGrid);
  const signals = getSafeList(chart.signals);
  const messages = getSafeList(chart.messages);

  return (
    <section className="panel board-panel">
      <div className="panel-heading">
        <p className="eyebrow">盤面生成層</p>
        <h2>太乙神数盤</h2>
        <p>起局条件、方位、日辰、時支を固定し、構造化根拠へ接続できる中間盤面として表示します。</p>
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
          <span>方位 / 起点</span>
          <strong>
            {chart.basis.direction} / {chart.basis.directionAnchor}
          </strong>
        </div>
        <div>
          <span>局序</span>
          <strong>{chart.basis.cycleIndex + 1}局</strong>
        </div>
      </div>

      <div className="board-canvas">
        <div className="plate-shell">
          <div className="plate-grid">
            {cycleGrid.map((cell) => {
              const position = PLATE_GRID_POSITIONS[cell.branch];
              return (
                <div className="plate-cell" key={`${cell.label}-${cell.branch}`} style={{ gridRow: position.row, gridColumn: position.column }}>
                  <span>{cell.label}</span>
                  <strong>{cell.branch}</strong>
                  <em>{cell.source}</em>
                </div>
              );
            })}
            <div className="plate-center">
              <span>太乙</span>
              <strong>{chart.basis.directionAnchor}</strong>
              <small>{chart.basis.cycleIndex + 1}局</small>
            </div>
          </div>
        </div>

        <div className="board-side">
          <div className="lesson-block">
            <div className="section-label">Signals</div>
            <div className="transmission-stack">
              {signals.map((signal) => (
                <article className="transmission-card" key={signal.key}>
                  <span>{signal.title}</span>
                  <strong>{signal.value}</strong>
                  <small>{signal.isPrimary ? "primary" : "support"}</small>
                </article>
              ))}
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
