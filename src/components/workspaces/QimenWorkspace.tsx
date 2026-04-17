import { ChartSummaryPanel } from "../ChartSummaryPanel";
import { QimenBoardView } from "../QimenBoardView";
import { QimenHelperPanel } from "../QimenHelperPanel";
import { QimenInputPanel } from "../QimenInputPanel";
import { LOCATION_OFFSETS, buildQimenChart } from "../../lib/qimen";
import type { QimenInput } from "../../lib/types";
import type { WorkspaceProps } from "./shared";

export function QimenWorkspace({ input, years, daysInMonth, onApplyNow, onInputChange }: WorkspaceProps<QimenInput>) {
  const chart = buildQimenChart(input);
  const summaryDetails = [
    { label: "年盤", value: `${chart.basis.yearPillar.ganzhi} / ${chart.boards[0]?.basis.yinYang}${chart.boards[0]?.basis.juNumber}局` },
    { label: "月盤", value: `${chart.basis.monthPillar.ganzhi} / ${chart.boards[1]?.basis.yinYang}${chart.boards[1]?.basis.juNumber}局` },
    { label: "日盤", value: `${chart.basis.dayPillar.ganzhi} / ${chart.boards[2]?.basis.yinYang}${chart.boards[2]?.basis.juNumber}局` },
    { label: "時盤", value: `${chart.basis.hourPillar.ganzhi} / ${chart.primaryBoard.basis.yinYang}${chart.primaryBoard.basis.juNumber}局` },
    { label: "選択方位", value: `${chart.selectedDirectionJudgment.direction} ${chart.selectedDirectionJudgment.label}` },
  ];

  return (
    <>
      <QimenInputPanel
        input={input}
        locations={LOCATION_OFFSETS}
        daysInMonth={daysInMonth}
        years={years}
        onApplyNow={onApplyNow}
        onInputChange={onInputChange}
      />
      <ChartSummaryPanel
        modeLabel="奇門遁甲"
        headline={`${chart.resolvedTopic} / ${chart.selectedDirectionJudgment.direction}${chart.selectedDirectionJudgment.label}`}
        correctedDateTime={chart.basis.correctedDateTime}
        certainty={chart.certainty}
        caveat={chart.messages[0] ?? "書籍本文の活盤式を基準に、四盤と時盤方位を生成しています。"}
        sourceCount={chart.sourceReferences.length}
        details={summaryDetails}
      />
      <QimenBoardView chart={chart} />
      <QimenHelperPanel chart={chart} />
    </>
  );
}
