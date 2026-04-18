import type { Branch, DivinationTopic, LocationOffset, TaiitsuInput, TaiitsuStartCondition } from "../lib/types";

interface TaiitsuInputPanelProps {
  input: TaiitsuInput;
  locations: readonly LocationOffset[];
  daysInMonth: number;
  years: number[];
  onApplyNow: () => void;
  onInputChange: (updater: (draft: TaiitsuInput) => TaiitsuInput) => void;
}

const BRANCH_OPTIONS = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const satisfies readonly Branch[];
const TOPICS = ["総合", "仕事", "金運", "恋愛", "結婚", "健康", "失せ物", "天気"] as const satisfies readonly DivinationTopic[];
const START_CONDITIONS: Array<{ value: TaiitsuStartCondition; label: string }> = [
  { value: "time", label: "時刻起局" },
  { value: "direction", label: "方位起局" },
  { value: "time-and-direction", label: "時刻・方位併用" },
];

export function TaiitsuInputPanel({ input, locations, daysInMonth, years, onApplyNow, onInputChange }: TaiitsuInputPanelProps) {
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const minutes = Array.from({ length: 60 }, (_, index) => index);

  const updateNumber = (key: keyof Pick<TaiitsuInput, "year" | "month" | "day" | "hour" | "minute">, value: string) => {
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
            <p className="eyebrow">入力設定</p>
            <h2>太乙神数 起局条件</h2>
          </div>
          <button className="utility-button" onClick={onApplyNow} type="button">
            今日
          </button>
        </div>
        <p>起局日時、地点、方位、起局条件を固定し、術式根拠と照合できる盤面を生成します。</p>
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
        <label>
          <span>方位</span>
          <select
            value={input.direction}
            onChange={(event) =>
              onInputChange((draft) => ({
                ...draft,
                direction: event.target.value as Branch,
              }))
            }
          >
            {BRANCH_OPTIONS.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>起局条件</span>
          <select
            value={input.startCondition}
            onChange={(event) =>
              onInputChange((draft) => ({
                ...draft,
                startCondition: event.target.value as TaiitsuStartCondition,
              }))
            }
          >
            {START_CONDITIONS.map((condition) => (
              <option key={condition.value} value={condition.value}>
                {condition.label}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2">
          <span>解釈軸</span>
          <select
            value={input.topic}
            onChange={(event) =>
              onInputChange((draft) => ({
                ...draft,
                topic: event.target.value as DivinationTopic,
              }))
            }
          >
            {TOPICS.map((topic) => (
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
            placeholder="占いたい対象、時期、方位や移動の有無を入力してください。"
            rows={6}
          />
        </label>
      </div>
    </section>
  );
}
