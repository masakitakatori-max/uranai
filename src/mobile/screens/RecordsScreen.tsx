import { useMemo, useState } from "react";

import { CERTAINTY_LABELS, formatReadingTimestamp } from "../liurenSupport";
import type { SavedReading } from "../storage";

type RecordsFilter = "all" | "review";

interface RecordsScreenProps {
  history: SavedReading[];
  onOpenReading: (reading: SavedReading) => void;
}

function groupLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return "今日";
  }
  if (date.getFullYear() === today.getFullYear()) {
    return `${date.getMonth() + 1}月`;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export function RecordsScreen({ history, onOpenReading }: RecordsScreenProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RecordsFilter>("all");

  const filtered = useMemo(() => {
    const normalized = query.trim();
    return history.filter((reading) => {
      if (filter === "review" && reading.certainty !== "review") {
        return false;
      }
      if (!normalized) {
        return true;
      }
      return (
        reading.question.includes(normalized) ||
        reading.dayGanzhi.includes(normalized) ||
        (reading.lessonType ?? "").includes(normalized)
      );
    });
  }, [history, query, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, SavedReading[]>();
    filtered.forEach((reading) => {
      const label = groupLabel(reading.createdAt);
      const bucket = map.get(label) ?? [];
      bucket.push(reading);
      map.set(label, bucket);
    });
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="screen records-screen">
      <h1 className="mincho screen-title">記録</h1>
      <input
        type="search"
        className="search-field"
        placeholder="質問文・干支で検索"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="chip-row">
        <button
          type="button"
          className={filter === "all" ? "chip is-selected" : "chip"}
          onClick={() => setFilter("all")}
        >
          すべて
        </button>
        <button
          type="button"
          className={filter === "review" ? "chip is-selected" : "chip"}
          onClick={() => setFilter("review")}
        >
          要検証
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="empty-state">
          <p>まだ記録がありません</p>
        </div>
      ) : (
        groups.map(([label, readings]) => (
          <section key={label} className="record-group">
            <p className="record-group-label">{label}</p>
            <div className="reading-list">
              {readings.map((reading) => (
                <button key={reading.id} type="button" className="reading-row" onClick={() => onOpenReading(reading)}>
                  <span className="reading-glyph mincho">壬</span>
                  <span className="reading-text">
                    <span className="reading-question">{reading.question || `${reading.topic}を占う`}</span>
                    <span className="reading-meta">
                      {formatReadingTimestamp(reading.createdAt)} ・ {reading.dayGanzhi}日
                      {reading.lessonType ? ` ・ ${reading.lessonType}` : ""}
                    </span>
                  </span>
                  <span
                    className={`certainty-dot dot-${reading.certainty}`}
                    aria-label={CERTAINTY_LABELS[reading.certainty]}
                  />
                </button>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
