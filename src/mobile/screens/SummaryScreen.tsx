import { useMemo } from "react";

import { buildLiurenChart } from "../../lib/engine";
import { CERTAINTY_LABELS, buildEvidenceRows, buildKeyPoint, wuxingVar } from "../liurenSupport";
import type { SavedReading } from "../storage";

interface SummaryScreenProps {
  reading: SavedReading;
  onBack: () => void;
  onOpenBoard: () => void;
}

export function SummaryScreen({ reading, onBack, onOpenBoard }: SummaryScreenProps) {
  const chart = useMemo(() => buildLiurenChart(reading.input), [reading]);
  const evidence = useMemo(() => buildEvidenceRows(chart), [chart]);
  const keyPoint = useMemo(() => buildKeyPoint(chart), [chart]);
  const correctedLabel = chart.basis.correctedDateTime.replace(/^\d{4}-/, "").replace("-", "/");

  return (
    <div className="screen flow-screen">
      <nav className="flow-nav">
        <button type="button" className="nav-button" onClick={onBack}>
          ‹
        </button>
        <span className="nav-title">六壬神課</span>
        <span className="nav-button nav-button-sub" aria-hidden="true">
          保存済
        </span>
      </nav>

      <div className="flow-body">
        <div className="status-row">
          <span className={`pill pill-${reading.certainty}`}>{CERTAINTY_LABELS[reading.certainty]}</span>
          <span className="pill pill-neutral">原典参照 {chart.sourceReferences.length}件</span>
          <span className="status-date">
            {chart.basis.dayGanzhi}日 {correctedLabel.slice(-5)}
          </span>
        </div>

        {reading.question ? <p className="summary-question">「{reading.question}」</p> : null}

        <section className="keypoint-card">
          <span className="eyebrow-label">要点</span>
          <p className="keypoint-text mincho">{keyPoint}</p>
        </section>

        <section className="evidence-block" aria-label="読みの根拠">
          <p className="field-label">読みの根拠</p>
          <div className="evidence-list">
            {evidence.map((row) => (
              <div key={row.source} className="evidence-row">
                <span className="evidence-bar" style={{ background: wuxingVar(row.wuxing) }} />
                <span className="evidence-text">
                  <span>{row.text}</span>
                  <span className="evidence-source">{row.source}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {reading.nearBoundary ? (
          <div className="warning-banner" role="note">
            補正後時刻が時支の境界（±5分）に近いため、判断が分かれる可能性があります。
          </div>
        ) : null}

        <p className="disclaimer">本アプリは書籍準拠の方式で盤を自動作成します。最終判断は原典と占式でご確認ください。</p>
      </div>

      <footer className="flow-footer">
        <button type="button" className="primary-button" onClick={onOpenBoard}>
          盤を見る
        </button>
      </footer>
    </div>
  );
}
