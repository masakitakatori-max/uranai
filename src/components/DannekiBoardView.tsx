import type { DannekiChart, DannekiLine, YinYang } from "../lib/types";

interface DannekiBoardViewProps {
  chart: DannekiChart;
}

function lineClassName(value: YinYang, isMoving: boolean) {
  return `danneki-line ${value === "陽" ? "is-yang" : "is-yin"}${isMoving ? " is-moving" : ""}`;
}

function lineLabel(position: number) {
  return ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"][position - 1] ?? `${position}爻`;
}

function renderHexagram(title: string, lines: DannekiLine[], changed = false) {
  const source = changed ? [...lines].map((line) => ({ ...line, original: line.changed })) : lines;
  return (
    <article className="danneki-card">
      <header>
        <span>{title}</span>
      </header>
      <div className="danneki-line-stack">
        {[...source]
          .reverse()
          .map((line) => (
            <div className="danneki-line-row" key={`${title}-${line.position}`}>
              <small>{lineLabel(line.position)}</small>
              <div className={lineClassName(line.original, line.isMoving)}>
                <span />
                {line.original === "陰" ? <span /> : null}
              </div>
            </div>
          ))}
      </div>
    </article>
  );
}

export function DannekiBoardView({ chart }: DannekiBoardViewProps) {
  const focusLines =
    chart.basis.useDeity === "世応"
      ? chart.lines.filter((line) => line.position === 3 || line.position === 6)
      : chart.lines.filter((line) => line.relation === chart.basis.useDeity);

  return (
    <section className="panel board-panel">
      <div className="panel-heading">
        <p className="eyebrow">盤面表示</p>
        <h2>断易モード</h2>
        <p>本卦と之卦の切り替わり、動爻、六親の寄り方を一画面で確認できます。</p>
      </div>

      <div className="board-meta danneki-meta">
        <div>
          <span>基準時刻</span>
          <strong>{chart.basis.correctedDateTime}</strong>
        </div>
        <div>
          <span>上 / 下卦</span>
          <strong>
            {chart.basis.upperTrigram.key} / {chart.basis.lowerTrigram.key}
          </strong>
        </div>
        <div>
          <span>動爻</span>
          <strong>{chart.basis.movingLines.length ? chart.basis.movingLines.map((value) => lineLabel(value)).join(" / ") : "なし"}</strong>
        </div>
        <div>
          <span>用神候補</span>
          <strong>{chart.basis.useDeity}</strong>
        </div>
      </div>

      <div className="board-canvas danneki-canvas">
        <div className="plate-shell danneki-shell">
          <div className="danneki-board">
            <div className="danneki-hexagrams">
              {renderHexagram("本卦", chart.lines)}
              {renderHexagram("之卦", chart.lines, true)}
            </div>

            <div className="danneki-trigram-row">
              <article className="danneki-trigram-card">
                <span>内卦</span>
                <strong>
                  {chart.basis.lowerTrigram.key}
                  {chart.basis.lowerTrigram.symbol}
                </strong>
                <small>
                  {chart.basis.lowerTrigram.image} / {chart.basis.lowerTrigram.element}
                </small>
              </article>
              <article className="danneki-trigram-card">
                <span>外卦</span>
                <strong>
                  {chart.basis.upperTrigram.key}
                  {chart.basis.upperTrigram.symbol}
                </strong>
                <small>
                  {chart.basis.upperTrigram.image} / {chart.basis.upperTrigram.element}
                </small>
              </article>
              <article className="danneki-trigram-card">
                <span>之卦</span>
                <strong>
                  {chart.basis.changedLowerTrigram.key} / {chart.basis.changedUpperTrigram.key}
                </strong>
                <small>
                  {chart.basis.changedLowerTrigram.image} / {chart.basis.changedUpperTrigram.image}
                </small>
              </article>
            </div>
          </div>
        </div>

        <div className="board-side">
          <div className="transmission-block">
            <div className="section-label">焦点線</div>
            <div className="transmission-stack">
              {focusLines.length ? (
                focusLines.map((line) => (
                  <article className="transmission-card" key={`focus-${line.position}`}>
                    <span>{lineLabel(line.position)}</span>
                    <strong>{line.relation}</strong>
                    <small>{line.note}</small>
                  </article>
                ))
              ) : (
                <article className="transmission-card transmission-card-empty">
                  <span>焦点線</span>
                  <strong>分散</strong>
                  <small>一か所に偏らず、複数条件を同時に見る盤です。</small>
                </article>
              )}
            </div>
          </div>

          <div className="transmission-block">
            <div className="section-label">卦象メモ</div>
            <div className="transmission-stack">
              <article className="transmission-card">
                <span>内卦</span>
                <strong>{chart.basis.lowerTrigram.keywords.join(" / ")}</strong>
              </article>
              <article className="transmission-card">
                <span>外卦</span>
                <strong>{chart.basis.upperTrigram.keywords.join(" / ")}</strong>
              </article>
              <article className="transmission-card">
                <span>之卦</span>
                <strong>{chart.basis.changedLowerTrigram.keywords[0]} / {chart.basis.changedUpperTrigram.keywords[0]}</strong>
              </article>
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
