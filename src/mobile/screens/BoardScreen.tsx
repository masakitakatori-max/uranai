import { useMemo, useState } from "react";

import { PLATE_GRID_POSITIONS, buildLiurenChart } from "../../lib/engine";
import type { LiurenChart } from "../../lib/types";
import { BRANCH_WUXING, wuxingVar } from "../liurenSupport";
import type { SavedReading } from "../storage";

type BoardTab = "plate" | "lessons" | "transmissions" | "relations";

const BOARD_TABS: ReadonlyArray<{ id: BoardTab; label: string }> = [
  { id: "plate", label: "天地盤" },
  { id: "lessons", label: "四課" },
  { id: "transmissions", label: "三伝" },
  { id: "relations", label: "関係" },
];

const WUXING_LEGEND = ["木", "火", "土", "金", "水"] as const;

function PlateGrid({ chart }: { chart: LiurenChart }) {
  return (
    <div className="mplate-wrap">
      <div className="mplate-grid" role="img" aria-label="天地盤">
        {chart.plateCells.map((cell) => {
          const position = PLATE_GRID_POSITIONS[cell.earth];
          const wuxing = BRANCH_WUXING[cell.heaven];
          const color = wuxingVar(wuxing);
          return (
            <div
              key={cell.earth}
              className={cell.isNobleSeat ? "mplate-cell is-noble" : "mplate-cell"}
              style={{
                gridRow: position.row,
                gridColumn: position.column,
                background: `color-mix(in srgb, ${color} 12%, transparent)`,
                borderColor: cell.isNobleSeat ? undefined : `color-mix(in srgb, ${color} 38%, transparent)`,
              }}
            >
              <span className="mplate-general">{cell.general}</span>
              <span className="mplate-heaven mincho">{cell.heaven}</span>
              <span className="mplate-earth">{cell.earth}</span>
            </div>
          );
        })}
        <div className="mplate-center">
          <span className="mplate-center-label">天盤</span>
          <span className="mplate-center-order mincho">{chart.basis.generalOrder}行</span>
          <span className="mplate-center-noble">
            貴人 {chart.basis.nobleMode}貴 {chart.basis.nobleBranch}
          </span>
          <span className="mplate-center-lesson">{chart.lessonType ?? "未確定"}</span>
        </div>
      </div>
      <div className="mplate-legend">
        {WUXING_LEGEND.map((wuxing) => (
          <span key={wuxing} className="legend-item">
            <span className="legend-dot" style={{ background: wuxingVar(wuxing) }} />
            {wuxing}
          </span>
        ))}
      </div>
    </div>
  );
}

function LessonsView({ chart }: { chart: LiurenChart }) {
  return (
    <div className="stack-cards">
      {chart.fourLessons.map((lesson) => (
        <div key={lesson.index} className="stack-card">
          <span className="eyebrow-label">第{lesson.index}課</span>
          <span className="stack-main mincho">
            {lesson.lower} → {lesson.upper}
          </span>
          <span className="stack-meta">
            {lesson.sixKin} ・ {lesson.heavenlyGeneral}
            {lesson.isVoid ? " ・ 空亡" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function TransmissionsView({ chart }: { chart: LiurenChart }) {
  return (
    <div className="transmission-columns">
      {chart.threeTransmissions.map((item) => (
        <div key={item.stage} className="transmission-card">
          <span className="eyebrow-label">{item.stage}</span>
          <span className="transmission-branch mincho">
            {item.dunStem ?? ""}
            {item.branch}
          </span>
          <span className={item.isVoid ? "transmission-state is-void" : "transmission-state"}>
            {item.isVoid ? "空亡" : item.sixKin} ・ {item.heavenlyGeneral}
          </span>
        </div>
      ))}
    </div>
  );
}

function RelationsView({ chart }: { chart: LiurenChart }) {
  const nodeLabel = (id: string) => chart.relations.nodes.find((node) => node.id === id)?.value ?? id;
  return (
    <div className="relations-list">
      {chart.relations.summary.slice(0, 3).map((line) => (
        <p key={line} className="relations-summary">
          {line}
        </p>
      ))}
      {chart.relations.edges.map((edge) => (
        <div key={edge.id} className="relation-row">
          <span className="relation-pair mincho">
            {nodeLabel(edge.from)} → {nodeLabel(edge.to)}
          </span>
          <span className="relation-kind">{edge.label}</span>
        </div>
      ))}
      {chart.relations.edges.length === 0 ? <p className="empty-note">特筆すべき支関係はありません。</p> : null}
    </div>
  );
}

export function BoardScreen({ reading, onBack }: { reading: SavedReading; onBack: () => void }) {
  const chart = useMemo(() => buildLiurenChart(reading.input), [reading]);
  const [tab, setTab] = useState<BoardTab>("plate");

  return (
    <div className="screen flow-screen">
      <nav className="flow-nav">
        <button type="button" className="nav-button" onClick={onBack}>
          ‹ 要点
        </button>
        <span className="nav-title">盤</span>
        <span className="nav-button" aria-hidden="true" />
      </nav>

      <div className="segment-control board-segments" role="tablist" aria-label="盤の表示切替">
        {BOARD_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? "segment is-active" : "segment"}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flow-body board-body">
        {tab === "plate" ? <PlateGrid chart={chart} /> : null}
        {tab === "lessons" ? <LessonsView chart={chart} /> : null}
        {tab === "transmissions" ? <TransmissionsView chart={chart} /> : null}
        {tab === "relations" ? <RelationsView chart={chart} /> : null}
      </div>
    </div>
  );
}
