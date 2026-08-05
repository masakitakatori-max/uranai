import { useEffect, useMemo, useState } from "react";

import { LOCATION_OFFSETS, buildLiurenChart } from "../../lib/engine";
import { withCurrentDateTime } from "../../lib/currentDateTime";
import type { LiurenInput, LiurenTopic } from "../../lib/types";
import { CERTAINTY_LABELS, formatClock, formatHomeDate, formatReadingTimestamp } from "../liurenSupport";
import type { MobileDefaults, SavedReading } from "../storage";

const TOPIC_CHIPS: readonly LiurenTopic[] = ["仕事", "金運", "恋愛", "結婚", "健康", "失せ物"];

interface HomeScreenProps {
  defaults: MobileDefaults;
  history: SavedReading[];
  onStartNow: () => void;
  onSelectTopic: (topic: LiurenTopic) => void;
  onOpenReading: (reading: SavedReading) => void;
}

function buildNowInput(locationId: string): LiurenInput {
  return withCurrentDateTime({
    year: 2026,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
    locationId,
    topic: "総合",
    questionText: "",
    manualOverrides: { dayGanzhi: "", monthGeneral: "", hourBranch: "" },
  });
}

export function HomeScreen({ defaults, history, onStartNow, onSelectTopic, onOpenReading }: HomeScreenProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const nowChart = useMemo(
    () => buildLiurenChart(buildNowInput(defaults.locationId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaults.locationId, Math.floor(now.getTime() / 60_000)],
  );

  const location = LOCATION_OFFSETS.find((item) => item.id === defaults.locationId);
  const offsetLabel = location
    ? `真太陽時 ${location.offsetMinutes >= 0 ? "+" : "−"}${Math.abs(location.offsetMinutes)}分`
    : "";

  return (
    <div className="screen home-screen">
      <header className="home-header">
        <div>
          <p className="home-date">{formatHomeDate(now)}</p>
          <h1 className="mincho home-ganzhi">{nowChart.basis.dayGanzhi}日</h1>
        </div>
        <div className="home-header-side">
          <span className="home-side-label">月将</span>
          <span className="home-side-value mincho">{nowChart.basis.monthGeneral}</span>
        </div>
      </header>

      <section className="now-card" aria-label="現在の占時">
        <div className="now-card-top">
          <span className="eyebrow-label">NOW</span>
          <span className="now-meta">
            {location?.label} ・ {offsetLabel}
          </span>
        </div>
        <div className="now-card-main">
          <span className="now-branch mincho">{nowChart.basis.hourBranch}</span>
          <div className="now-time-block">
            <span className="now-clock">{formatClock(now)}</span>
            <span className="now-caption">占時 ・ 月将 {nowChart.basis.monthGeneral}</span>
          </div>
        </div>
        <button type="button" className="primary-button" onClick={onStartNow}>
          いま起局する
        </button>
      </section>

      <section className="home-section" aria-label="目的から選ぶ">
        <div className="section-heading">
          <span>目的から選ぶ</span>
        </div>
        <div className="chip-row">
          {TOPIC_CHIPS.map((topic) => (
            <button key={topic} type="button" className="chip" onClick={() => onSelectTopic(topic)}>
              {topic}
            </button>
          ))}
        </div>
      </section>

      {history.length > 0 ? (
        <section className="home-section" aria-label="続きから">
          <div className="section-heading">
            <span>続きから</span>
          </div>
          <div className="reading-list">
            {history.slice(0, 2).map((reading) => (
              <button key={reading.id} type="button" className="reading-row" onClick={() => onOpenReading(reading)}>
                <span className="reading-glyph mincho">壬</span>
                <span className="reading-text">
                  <span className="reading-question">{reading.question || `${reading.topic}を占う`}</span>
                  <span className="reading-meta">
                    {formatReadingTimestamp(reading.createdAt)} ・ {CERTAINTY_LABELS[reading.certainty]}
                  </span>
                </span>
                <span className="reading-chevron">›</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
