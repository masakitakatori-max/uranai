import { AiFeedbackPanel } from "../AiFeedbackPanel";
import { ChartSummaryPanel } from "../ChartSummaryPanel";
import { TaiitsuBoardView } from "../TaiitsuBoardView";
import { TaiitsuHelperPanel } from "../TaiitsuHelperPanel";
import { TaiitsuInputPanel } from "../TaiitsuInputPanel";
import { LOCATION_OFFSETS } from "../../lib/engine";
import { buildTaiitsuChart } from "../../lib/taiitsu";
import type { TaiitsuInput } from "../../lib/types";
import type { WorkspaceProps } from "./shared";

export function TaiitsuWorkspace({ input, years, daysInMonth, onApplyNow, onInputChange }: WorkspaceProps<TaiitsuInput>) {
  const chart = buildTaiitsuChart(input);
  const summaryDetails = [
    { label: "方位", value: chart.basis.direction },
    { label: "起点", value: chart.basis.directionAnchor },
    { label: "日干支", value: chart.basis.dayGanzhi },
    { label: "時支", value: chart.basis.hourBranch },
  ];

  return (
    <>
      <TaiitsuInputPanel
        input={input}
        locations={LOCATION_OFFSETS}
        daysInMonth={daysInMonth}
        years={years}
        onApplyNow={onApplyNow}
        onInputChange={onInputChange}
      />
      <ChartSummaryPanel
        modeLabel="太乙神数"
        headline={chart.summary.headline}
        correctedDateTime={chart.basis.correctedDateTime}
        certainty={chart.certainty}
        caveat={chart.messages[0] ?? "PDF構造化インデックスを参照して判定しています。"}
        sourceCount={chart.sourceReferences.length}
        details={summaryDetails}
      />
      <TaiitsuBoardView chart={chart} />
      <TaiitsuHelperPanel chart={chart} />
      <AiFeedbackPanel chart={chart} mode="taiitsu" />
    </>
  );
}
