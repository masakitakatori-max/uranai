import type { DannekiChart, DannekiLine, YinYang } from "../lib/types";
import { getDannekiLineLabel, getSafeList } from "../lib/uiUtils";

interface DannekiBoardViewProps {
  chart: DannekiChart;
}

function lineClassName(value: YinYang, isMoving: boolean) {
  return `danneki-line ${value === "陽" ? "is-yang" : "is-yin"}${isMoving ? " is-moving" : ""}`;
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
              <small>{getDannekiLineLabel(line.position)}</small>
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
  const lines = getSafeList(chart.lines);
  const messages = getSafeList(chart.messages);
  const focusLines =
    chart.basis.useDeity === "世応"
      ? lines.filter((line) => line.role === "世" || line.role === "応")
      : lines.filter((line) => line.relation === chart.basis.useDeity);

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
          <span>日辰</span>
          <strong>{chart.basis.dayGanzhi}</strong>
        </div>
        <div>
          <span>月建</span>
          <strong>{chart.basis.monthBranch}</strong>
        </div>
        <div>
          <span>上 / 下卦</span>
          <strong>
            {chart.basis.upperTrigram.key} / {chart.basis.lowerTrigram.key}
          </strong>
        </div>
        <div>
          <span>動爻</span>
          <strong>{chart.basis.movingLines.length ? chart.basis.movingLines.map((value) => getDannekiLineLabel(value)).join(" / ") : "なし"}</strong>
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
      </div>

      <div className="board-canvas danneki-canvas">
        <div className="plate-shell danneki-shell">
          <div className="danneki-board">
            <div className="danneki-hexagrams">
              {renderHexagram("本卦", lines)}
              {renderHexagram("之卦", lines, true)}
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
                    <span>
                      {getDannekiLineLabel(line.position)}
                      {line.role ? ` (${line.role})` : ""}
                    </span>
                    <strong>
                      {line.relation} / {line.seasonalState}
                    </strong>
                    <small>
                      {line.note}（{line.sixSpirit} / {line.stem}
                      {line.branch} / {line.element}{line.useGodRole ? ` / ${line.useGodRole}` : ""}）
                    </small>
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
