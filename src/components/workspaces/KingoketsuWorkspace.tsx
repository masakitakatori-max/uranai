import { AiFeedbackPanel } from "../AiFeedbackPanel";
import { ChartSummaryPanel } from "../ChartSummaryPanel";
import { KingoketsuBoardView } from "../KingoketsuBoardView";
import { KingoketsuHelperPanel } from "../KingoketsuHelperPanel";
import { KingoketsuInputPanel } from "../KingoketsuInputPanel";
import { LOCATION_OFFSETS } from "../../lib/engine";
import { buildKingoketsuChart } from "../../lib/kingoketsu";
import type { KingoketsuInput } from "../../lib/types";
import type { WorkspaceProps } from "./shared";

export function KingoketsuWorkspace({ input, years, daysInMonth, onApplyNow, onInputChange }: WorkspaceProps<KingoketsuInput>) {
  const chart = buildKingoketsuChart(input);
  const summaryDetails = [
    { label: "用爻", value: chart.basis.useYao },
    { label: "月将", value: `${chart.basis.monthGeneral} / ${chart.basis.monthGeneralTitle}` },
    { label: "地分", value: input.difen },
    { label: "空亡", value: chart.basis.voidBranches.join(" / ") },
  ];

  return (
    <>
      <KingoketsuInputPanel
        input={input}
        locations={LOCATION_OFFSETS}
        daysInMonth={daysInMonth}
        years={years}
        onApplyNow={onApplyNow}
        onInputChange={onInputChange}
      />
      <ChartSummaryPanel
        modeLabel="金口訣"
        headline={`${chart.resolvedTopic} / ${chart.basis.useYao}`}
        correctedDateTime={chart.basis.correctedDateTime}
        certainty={chart.certainty}
        caveat={chart.basis.useYaoReason}
        sourceCount={chart.sourceReferences.length}
        details={summaryDetails}
      />
      <KingoketsuBoardView chart={chart} />
      <KingoketsuHelperPanel chart={chart} />
      <AiFeedbackPanel chart={chart} mode="kingoketsu" />
    </>
  );
}
