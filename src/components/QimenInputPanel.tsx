import { QIMEN_SUPPORTED_YEAR_RANGE } from "../lib/qimen";
import type { LocationOffset, QimenDirection, QimenInput, QimenTopic } from "../lib/types";

interface QimenInputPanelProps {
  input: QimenInput;
  locations: readonly LocationOffset[];
  daysInMonth: number;
  years: number[];
  onApplyNow: () => void;
  onInputChange: (updater: (draft: QimenInput) => QimenInput) => void;
}

const QIMEN_DIRECTIONS = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"] as const satisfies readonly QimenDirection[];

export function QimenInputPanel({ input, locations, daysInMonth, years, onApplyNow, onInputChange }: QimenInputPanelProps) {
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const minutes = Array.from({ length: 60 }, (_, index) => index);
  const topics = ["総合", "仕事", "金運", "恋愛", "結婚", "健康", "失せ物", "天気"] as const satisfies readonly QimenTopic[];

  const updateNumber = (key: keyof Pick<QimenInput, "year" | "month" | "day" | "hour" | "minute">, value: string) => {
    const next = Number(value);
    onInputChange((draft) => {
      const updated = { ...draft, [key]: next };
      const maxDay = new Date(updated.year, updated.month, 0).getDate();
      if (updated.day > maxDay) {
        updated.day = maxDay;
      }
      return updated;
    });
  };

  return (
    <section className="panel input-panel">
      <div className="panel-heading">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">入力層</p>
            <h2>奇門遁甲 四盤作成</h2>
          </div>
          <button className="utility-button" onClick={onApplyNow} type="button">
            今日
          </button>
        </div>
        <p>
          書籍表で検証できる {QIMEN_SUPPORTED_YEAR_RANGE.start}-{QIMEN_SUPPORTED_YEAR_RANGE.end} 年を安全範囲として、年盤・月盤・日盤・時盤と方位判断を作成します。
        </p>
      </div>

      <div className="form-grid">
        <label>
          <span>年</span>
          <select value={input.year} onChange={(event) => updateNumber("year", event.target.value)}>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>月</span>
          <select value={input.month} onChange={(event) => updateNumber("month", event.target.value)}>
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>日</span>
          <select value={input.day} onChange={(event) => updateNumber("day", event.target.value)}>
            {days.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>時</span>
          <select value={input.hour} onChange={(event) => updateNumber("hour", event.target.value)}>
            {hours.map((hour) => (
              <option key={hour} value={hour}>
                {String(hour).padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>分</span>
          <select value={input.minute} onChange={(event) => updateNumber("minute", event.target.value)}>
            {minutes.map((minute) => (
              <option key={minute} value={minute}>
                {String(minute).padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2">
          <span>地点</span>
          <select
            value={input.locationId}
            onChange={(event) =>
              onInputChange((draft) => ({
                ...draft,
                locationId: event.target.value,
              }))
            }
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.label} {location.offsetMinutes >= 0 ? `+${location.offsetMinutes}` : location.offsetMinutes}分
              </option>
            ))}
          </select>
        </label>
        <label className="span-2">
          <span>目的方位</span>
          <select
            value={input.targetDirection}
            onChange={(event) =>
              onInputChange((draft) => ({
                ...draft,
                targetDirection: event.target.value as QimenDirection,
              }))
            }
          >
            {QIMEN_DIRECTIONS.map((direction) => (
              <option key={direction} value={direction}>
                {direction}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2">
          <span>占的</span>
          <select
            value={input.topic}
            onChange={(event) =>
              onInputChange((draft) => ({
                ...draft,
                topic: event.target.value as QimenTopic,
              }))
            }
          >
            {topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2">
          <span>相談文</span>
          <textarea
            value={input.questionText}
            onChange={(event) =>
              onInputChange((draft) => ({
                ...draft,
                questionText: event.target.value,
              }))
            }
            placeholder="たとえば: 来週の商談に向けて、どの方位と時間を優先すべきか。"
            rows={5}
          />
        </label>
      </div>
    </section>
  );
}
