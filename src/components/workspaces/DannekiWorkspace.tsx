import { AiFeedbackPanel } from "../AiFeedbackPanel";
import { DannekiBoardView } from "../DannekiBoardView";
import { DannekiHelperPanel } from "../DannekiHelperPanel";
import { DannekiInputPanel } from "../DannekiInputPanel";
import { ChartSummaryPanel } from "../ChartSummaryPanel";
import { LOCATION_OFFSETS } from "../../lib/engine";
import { buildDannekiChart } from "../../lib/danneki";
import type { DannekiInput } from "../../lib/types";
import type { WorkspaceProps } from "./shared";

export function DannekiWorkspace({ input, years, daysInMonth, onApplyNow, onInputChange }: WorkspaceProps<DannekiInput>) {
  const chart = buildDannekiChart(input);
  const summaryDetails = [
    { label: "用神候補", value: chart.basis.useDeity },
    { label: "用神決定", value: chart.basis.useGodLine ? `${chart.basis.useGodLine}爻` : "未確定" },
    { label: "世 / 応", value: `${chart.basis.worldLine ?? "未確定"} / ${chart.basis.responseLine ?? "未確定"}` },
    { label: "動爻", value: chart.basis.movingLines.length ? chart.basis.movingLines.join(", ") : "なし" },
  ];

  return (
    <>
      <DannekiInputPanel
        input={input}
        locations={LOCATION_OFFSETS}
        daysInMonth={daysInMonth}
        years={years}
        onApplyNow={onApplyNow}
        onInputChange={onInputChange}
      />
      <ChartSummaryPanel
        modeLabel="断易"
        headline={`${chart.resolvedTopic} / ${chart.basis.useDeity}`}
        correctedDateTime={chart.basis.correctedDateTime}
        certainty={chart.certainty}
        caveat={chart.basis.useGodReason}
        sourceCount={chart.sourceReferences.length}
        details={summaryDetails}
      />
      <DannekiBoardView chart={chart} />
      <DannekiHelperPanel chart={chart} />
      <AiFeedbackPanel chart={chart} mode="danneki" />
    </>
  );
}
