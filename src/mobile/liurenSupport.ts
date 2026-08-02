import { BRANCH_WUXING } from "../lib/data/rules";
import type { LiurenChart, Wuxing } from "../lib/types";
import type { MobileCertainty } from "./storage";

export const CERTAINTY_LABELS: Record<MobileCertainty, string> = {
  high: "確度 高",
  medium: "確度 中",
  review: "要検証",
};

export function certaintyFromChart(chart: LiurenChart, nearBoundary: boolean): MobileCertainty {
  if (nearBoundary || chart.certainty === "unresolved") {
    return "review";
  }
  return chart.certainty === "confirmed" ? "high" : "medium";
}

export interface EvidenceRow {
  text: string;
  source: string;
  wuxing: Wuxing;
}

export function buildEvidenceRows(chart: LiurenChart): EvidenceRow[] {
  const rows: EvidenceRow[] = [];
  const [initial, middle, final] = chart.threeTransmissions;

  if (initial) {
    rows.push({
      text: `初伝 ${initial.branch}（${initial.sixKin}）${initial.isVoid ? "。空亡のため実現は中伝以降にずれる" : ""}`,
      source: `三伝 初伝 ・ 天将 ${initial.heavenlyGeneral}`,
      wuxing: BRANCH_WUXING[initial.branch],
    });
  }

  const voidStage = [middle, final].find((item) => item?.isVoid);
  const secondLesson = chart.fourLessons[1];
  if (voidStage) {
    rows.push({
      text: `${voidStage.stage} ${voidStage.branch} が空亡（旬空）`,
      source: `三伝 ${voidStage.stage} ・ 天将 ${voidStage.heavenlyGeneral}`,
      wuxing: BRANCH_WUXING[voidStage.branch],
    });
  } else if (secondLesson) {
    rows.push({
      text: `日干に対し 第2課 ${secondLesson.upper} は ${secondLesson.sixKin}`,
      source: `四課 第2課 ・ 天将 ${secondLesson.heavenlyGeneral}`,
      wuxing: BRANCH_WUXING[secondLesson.upper],
    });
  }

  rows.push({
    text: `課式は ${chart.lessonType ?? "未確定"}。貴人 ${chart.basis.nobleBranch}（${chart.basis.nobleMode}貴・${chart.basis.generalOrder}行）`,
    source: `課式判定 ・ 月将 ${chart.basis.monthGeneral}`,
    wuxing: BRANCH_WUXING[chart.basis.nobleBranch],
  });

  return rows.slice(0, 3);
}

export function buildKeyPoint(chart: LiurenChart) {
  const topicSection = chart.interpretationSections.find((section) => section.title.endsWith("の見立て"));
  const paragraph =
    topicSection?.paragraphs.find((text) => text.trim().length > 0) ??
    chart.interpretationSections
      .filter((section) => !section.title.includes("機械解釈"))
      .flatMap((section) => section.paragraphs)
      .find((text) => text.trim().length > 0);

  if (paragraph) {
    return paragraph.length > 90 ? `${paragraph.slice(0, 88)}…` : paragraph;
  }

  return `${chart.lessonType ?? "未確定"}の局。三伝は${chart.threeTransmissions
    .map((item) => item.branch)
    .join("・")}と推移します。`;
}

/** 補正後時刻が時支の境界（奇数時 0分）±5分以内かどうか */
export function isNearHourBoundary(correctedDateTime: string) {
  const match = correctedDateTime.match(/(\d{1,2}):(\d{2})/);
  if (!match) {
    return false;
  }
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  for (let boundaryHour = 1; boundaryHour <= 25; boundaryHour += 2) {
    if (Math.abs(minutes - boundaryHour * 60) <= 5) {
      return true;
    }
  }
  return minutes <= 5; // 23時台終端→1:00 の折返し近傍
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

export function formatHomeDate(now: Date) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}.${m}.${d} ${WEEKDAYS[now.getDay()]}`;
}

export function formatClock(now: Date) {
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function formatReadingTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const time = `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  if (sameDay) {
    return `今日 ${time}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `昨日 ${time}`;
  }
  return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
}

export function wuxingVar(wuxing: Wuxing) {
  switch (wuxing) {
    case "木":
      return "var(--wuxing-wood)";
    case "火":
      return "var(--wuxing-fire)";
    case "土":
      return "var(--wuxing-earth)";
    case "金":
      return "var(--wuxing-metal)";
    case "水":
      return "var(--wuxing-water)";
  }
}

export { BRANCH_WUXING };
