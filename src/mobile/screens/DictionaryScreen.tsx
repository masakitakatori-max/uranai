import { useMemo } from "react";

import { buildLiurenChart } from "../../lib/engine";
import { formatSourceReference } from "../../lib/uiUtils";
import { wuxingVar } from "../liurenSupport";
import type { SavedReading } from "../storage";

export function DictionaryScreen({ latestReading }: { latestReading: SavedReading | null }) {
  const chart = useMemo(
    () => (latestReading ? buildLiurenChart(latestReading.input) : null),
    [latestReading],
  );

  if (!chart) {
    return (
      <div className="screen dictionary-screen">
        <h1 className="mincho screen-title">辞典</h1>
        <div className="empty-state">
          <p>盤を起こすと、その盤の用語と参照情報がここに表示されます。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen dictionary-screen">
      <h1 className="mincho screen-title">辞典</h1>
      <p className="screen-lead">最新の盤（{chart.basis.dayGanzhi}日）の用語と原典参照です。</p>

      <section className="record-group" aria-label="用語">
        <p className="record-group-label">この盤の用語</p>
        <div className="reading-list">
          {chart.helperAnnotations.map((annotation) => (
            <div key={annotation.key} className="glossary-row">
              <span className="glossary-branch mincho" style={{ color: wuxingVar(annotation.wuxing) }}>
                {annotation.branch}
              </span>
              <span className="reading-text">
                <span className="reading-question">
                  {annotation.label} ・ {annotation.heavenlyGeneral} ・ {annotation.sixKin}
                </span>
                <span className="reading-meta">
                  {annotation.wuxing}行 ・ {annotation.seasonalState}
                  {annotation.isVoid ? " ・ 空亡" : ""}
                  {annotation.relations.length ? ` ・ ${annotation.relations.join("、")}` : ""}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="record-group" aria-label="原典参照">
        <p className="record-group-label">原典参照</p>
        <div className="reading-list">
          {chart.sourceReferences.map((reference) => (
            <div key={reference.id} className="glossary-row">
              <span className="reading-text">
                <span className="reading-question">{reference.label}</span>
                <span className="reading-meta">{formatSourceReference(reference)}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
