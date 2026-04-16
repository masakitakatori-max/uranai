import { AiFeedbackPanel } from "../AiFeedbackPanel";
import { BoardView } from "../BoardView";
import { ChartSummaryPanel } from "../ChartSummaryPanel";
import { HelperPanel } from "../HelperPanel";
import { InputPanel } from "../InputPanel";
import { GANZHI_CYCLE, LOCATION_OFFSETS, buildLiurenChart } from "../../lib/engine";
import type { LiurenInput } from "../../lib/types";
import type { WorkspaceProps } from "./shared";

export function LiurenWorkspace({ input, years, daysInMonth, onApplyNow, onInputChange }: WorkspaceProps<LiurenInput>) {
  const chart = buildLiurenChart(input);
  const summaryDetails = [
    { label: "占的", value: chart.resolvedTopic },
    { label: "課式", value: chart.lessonType ?? "未確定" },
    { label: "月将", value: chart.basis.monthGeneral },
    { label: "時支", value: chart.basis.hourBranch },
  ];

  return (
    <>
      <InputPanel
        input={input}
        locations={LOCATION_OFFSETS}
        daysInMonth={daysInMonth}
        years={years}
        ganzhiOptions={GANZHI_CYCLE}
        onApplyNow={onApplyNow}
        onInputChange={onInputChange}
      />
      <ChartSummaryPanel
        modeLabel="六壬神課"
        headline={`${chart.resolvedTopic} / ${chart.lessonType ?? "未確定"}`}
        correctedDateTime={chart.basis.correctedDateTime}
        certainty={chart.certainty}
        caveat={chart.messages[0] ?? "lookup / derived / 未確定 の判定過程は trace に保存されます。"}
        sourceCount={chart.sourceReferences.length}
        details={summaryDetails}
      />
      <BoardView chart={chart} />
      <HelperPanel chart={chart} />
      <AiFeedbackPanel chart={chart} mode="liuren" />
    </>
  );
}
