import type { ChartCertainty, RuleTrace, SourceReference } from "./types";
import { formatSourceReference as normalizeSourceReference } from "./uiUtils";

const CERTAINTY_LABELS: Record<ChartCertainty, string> = {
  confirmed: "confirmed",
  derived: "derived",
  unresolved: "unresolved",
};

const CERTAINTY_ORDER: Record<ChartCertainty, number> = {
  confirmed: 2,
  derived: 1,
  unresolved: 0,
};

export function resolveChartCertainty(
  traces: readonly Pick<RuleTrace, "certainty">[] | undefined,
  fallback: ChartCertainty = "unresolved",
) {
  if (!Array.isArray(traces) || !traces.length) {
    return fallback;
  }

  return traces.reduce<ChartCertainty>((current, trace) => {
    const next = (trace.certainty ?? fallback) as ChartCertainty;
    if (CERTAINTY_ORDER[next] < CERTAINTY_ORDER[current]) {
      return next;
    }
    return current;
  }, "confirmed");
}

export function getChartCertaintyLabel(certainty: ChartCertainty) {
  return CERTAINTY_LABELS[certainty];
}

export function getChartCertaintyTone(certainty: ChartCertainty) {
  switch (certainty) {
    case "confirmed":
      return "good";
    case "derived":
      return "warning";
    case "unresolved":
      return "alert";
  }
}

export function collectSourceReferences(
  traces: readonly RuleTrace[] | undefined,
  sourceReferences: readonly SourceReference[] | undefined = [],
) {
  const refs = new Map<string, SourceReference>();

  sourceReferences.forEach((ref) => {
    refs.set(ref.id, ref);
  });

  traces?.forEach((trace) => {
    if (!trace.sourceRef) {
      return;
    }
    if (!refs.has(trace.sourceRef.id)) {
      refs.set(trace.sourceRef.id, trace.sourceRef);
    }
  });

  return [...refs.values()];
}

export function formatSourceReference(reference?: SourceReference | null) {
  return normalizeSourceReference(reference);
}
