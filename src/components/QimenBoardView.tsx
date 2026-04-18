import { useState } from "react";
import type { CSSProperties } from "react";

import { STEM_WUXING } from "../lib/data/rules";
import { getWuxingColor } from "../lib/relationships";
import { getSafeList } from "../lib/uiUtils";
import type { QimenBoardKind, QimenChart, QimenPalace } from "../lib/types";
import { ElementBadge } from "./ElementBadge";
import { RelationshipMap } from "./RelationshipMap";

interface QimenBoardViewProps {
  chart: QimenChart;
}

const BOARD_ORDER = ["year", "month", "day", "time"] as const satisfies readonly QimenBoardKind[];

function markerClassName(isActive: boolean, tone: "gold" | "warning" | "accent" = "gold") {
  return isActive ? `marker marker-${tone}` : "marker";
}

function getPalaceClassName(palace: QimenPalace) {
  const classes = ["qimen-palace"];
  if (palace.direction === "中宮") classes.push("qimen-palace-center");
  if (palace.isVoid) classes.push("qimen-palace-void");
  if (palace.isXunLeaderSeat) classes.push("qimen-palace-xun");
  return classes.join(" ");
}

export function QimenBoardView({ chart }: QimenBoardViewProps) {
  const [activeKind, setActiveKind] = useState<QimenBoardKind>("time");
  const boards = getSafeList(chart.boards);
  const board = boards.find((candidate) => candidate.kind === activeKind) ?? chart.primaryBoard;
  const palaces = getSafeList(board.palaces);
  const messages = getSafeList(chart.messages);

  return (
    <section className="panel board-panel qimen-board-panel">
      <div className="panel-heading">
        <p className="eyebrow">盤生成層</p>
        <div className="panel-heading-row">
          <div>
            <h2>奇門遁甲 四盤</h2>
            <p>活盤式の手順に沿って、地盤干・天盤干・八門・九星・八神を九宮へ配置します。</p>
          </div>
          <div className="mode-switch qimen-board-tabs" role="tablist" aria-label="奇門遁甲の盤種">
            {BOARD_ORDER.map((kind) => {
              const targetBoard = boards.find((candidate) => candidate.kind === kind);
              return (
                <button
                  className={activeKind === kind ? "mode-button is-active" : "mode-button"}
                  key={kind}
                  onClick={() => setActiveKind(kind)}
                  role="tab"
                  type="button"
                  aria-selected={activeKind === kind}
                >
                  {targetBoard?.label ?? kind}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="board-meta qimen-board-meta">
        <div>
          <span>盤種 / 干支</span>
          <strong>
            {board.label} {board.basis.pillar.ganzhi}
          </strong>
        </div>
        <div>
          <span>陰陽遁 / 局数</span>
          <strong>
            {board.basis.yinYang}
            {board.basis.juNumber}局
          </strong>
        </div>
        <div>
          <span>旬首 / 空亡</span>
          <strong>
            {board.basis.xunLeader} / {board.basis.voidBranches.join(" ")}
          </strong>
        </div>
        <div>
          <span>直使 / 直符</span>
          <strong>
            {board.basis.directOfficer ?? "未定"} / {board.basis.directStar}
          </strong>
        </div>
      </div>

      <div className="board-canvas qimen-canvas">
        <div className="qimen-plate-grid" aria-label={`${board.label} 九宮盤`}>
          {palaces.map((palace) => (
            <article
              className={getPalaceClassName(palace)}
              key={palace.palace}
              style={{ gridRow: palace.gridRow, gridColumn: palace.gridColumn, "--element-color": getWuxingColor(palace.element) } as CSSProperties}
            >
              <header>
                <span>{palace.direction}</span>
                <strong>
                  {palace.palace}
                  {palace.palaceNumber}
                </strong>
              </header>
              <ElementBadge compact element={palace.element} />
              <div className="qimen-palace-core">
                <span className={markerClassName(palace.god === "直符", "accent")}>{palace.god ?? "八神なし"}</span>
                <span>{palace.star}</span>
                <span className={markerClassName(palace.door === "休門" || palace.door === "生門" || palace.door === "開門")}>{palace.door ?? "中宮"}</span>
              </div>
              <div className="qimen-stem-pair">
                <span>
                  <small>天</small>
                  {palace.heavenStem}
                  <ElementBadge compact element={STEM_WUXING[palace.heavenStem]} />
                </span>
                <span>
                  <small>地</small>
                  {palace.earthStem}
                  <ElementBadge compact element={STEM_WUXING[palace.earthStem]} />
                </span>
              </div>
              <footer>
                {palace.isXunLeaderSeat ? <em>旬首</em> : null}
                {palace.isHourStemSeat ? <em>盤干</em> : null}
                {palace.isVoid ? <em>空亡</em> : null}
              </footer>
            </article>
          ))}
        </div>
        <RelationshipMap graph={chart.relations} />
      </div>

      {messages.length ? (
        <div className="message-strip">
          {messages.slice(0, 4).map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
