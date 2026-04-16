import { collectSourceReferences, formatSourceReference, getChartCertaintyLabel, getChartCertaintyTone } from "../lib/chartUx";
import { getSafeList } from "../lib/uiUtils";
import type { ChartCertainty, RuleTrace, SourceReference } from "../lib/types";

interface ChartEvidencePanelProps {
  certainty: ChartCertainty;
  traces: readonly RuleTrace[] | undefined;
  sourceReferences?: readonly SourceReference[] | undefined;
}

export function ChartEvidencePanel({ certainty, traces, sourceReferences }: ChartEvidencePanelProps) {
  const traceList = getSafeList(traces);
  const sources = collectSourceReferences(traceList, sourceReferences);
  const certaintyTone = getChartCertaintyTone(certainty);

  return (
    <>
      <div className="trace-block">
        <div className="section-label">Trace</div>
        <div className="trace-summary">
          <span className={`summary-pill summary-pill-${certaintyTone}`}>{getChartCertaintyLabel(certainty)}</span>
          <span className="summary-pill">traces {traceList.length}</span>
          <span className="summary-pill">sources {sources.length}</span>
        </div>
        <div className="trace-list">
          {traceList.length ? (
            traceList.map((trace, index) => (
              <article className="trace-item" key={`${trace.ruleId}-${index}`}>
                <header className="trace-item-header">
                  <span>{trace.step}</span>
                  <strong>{trace.value}</strong>
                </header>
                <div className="trace-item-meta">
                  <span>{trace.ruleId}</span>
                  <span>{trace.source}</span>
                  <span>{trace.certainty}</span>
                  {trace.approximation ? <span>{trace.approximation}</span> : null}
                </div>
                <p>{trace.reason}</p>
                <small>{formatSourceReference(trace.sourceRef)}</small>
              </article>
            ))
          ) : (
            <article className="trace-item trace-item-empty">
              <span>Trace</span>
              <strong>unresolved</strong>
              <p>No trace data was attached to this chart.</p>
            </article>
          )}
        </div>
      </div>

      <details className="source-drawer" open>
        <summary>Source-backed drawer</summary>
        <div className="source-drawer-grid">
          {sources.length ? (
            sources.map((source) => (
              <article className="source-card" key={source.id}>
                <header>
                  <span>{source.label}</span>
                  <strong>{source.imageId ?? source.chapter ?? source.id}</strong>
                </header>
                {source.detail ? <p>{source.detail}</p> : null}
              </article>
            ))
          ) : (
            <article className="source-card source-card-empty">
              <span>Sources</span>
              <strong>none</strong>
              <p>No source references were attached to this chart.</p>
            </article>
          )}
        </div>
      </details>
    </>
  );
}
