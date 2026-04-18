import { getChartCertaintyLabel, getChartCertaintyTone } from "../lib/chartUx";
import type { ChartCertainty } from "../lib/types";

export interface SummaryField {
  label: string;
  value: string;
  note?: string;
}

interface ChartSummaryPanelProps {
  modeLabel: string;
  headline: string;
  correctedDateTime: string;
  certainty: ChartCertainty;
  caveat: string;
  sourceCount: number;
  details: readonly SummaryField[];
}

export function ChartSummaryPanel({
  modeLabel,
  headline,
  correctedDateTime,
  certainty,
  caveat,
  sourceCount,
  details,
}: ChartSummaryPanelProps) {
  const certaintyTone = getChartCertaintyTone(certainty);

  return (
    <section className="panel summary-panel">
      <div className="panel-heading summary-heading">
        <p className="eyebrow">結果サマリ</p>
        <div className="summary-heading-row">
          <div>
            <h2>{modeLabel}</h2>
            <p className="summary-headline">{headline}</p>
          </div>
          <div className="summary-chips" aria-label="確度と参照情報">
            <span className={`summary-pill summary-pill-${certaintyTone}`}>{getChartCertaintyLabel(certainty)}</span>
            <span className="summary-pill">参照 {sourceCount}件</span>
          </div>
        </div>
        <p className="summary-caveat">{caveat}</p>
      </div>

      <div className="summary-detail-grid">
        <article className="summary-detail summary-detail-wide">
          <span>補正日時</span>
          <strong>{correctedDateTime}</strong>
        </article>
        {details.map((item, index) => (
          <article className="summary-detail" key={`${item.label}-${item.value}-${index}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            {item.note ? <small>{item.note}</small> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
