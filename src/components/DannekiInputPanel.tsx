import type { DannekiInput, DannekiTopic, LocationOffset } from "../lib/types";

interface DannekiInputPanelProps {
  input: DannekiInput;
  locations: readonly LocationOffset[];
  daysInMonth: number;
  years: number[];
  onApplyNow: () => void;
  onInputChange: (updater: (draft: DannekiInput) => DannekiInput) => void;
}

export function DannekiInputPanel({ input, locations, daysInMonth, years, onApplyNow, onInputChange }: DannekiInputPanelProps) {
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const minutes = Array.from({ length: 60 }, (_, index) => index);
  const topics = ["総合", "仕事", "金運", "恋愛", "結婚", "健康", "失せ物", "天気"] as const satisfies readonly DannekiTopic[];

  const updateNumber = (key: keyof Pick<DannekiInput, "year" | "month" | "day" | "hour" | "minute">, value: string) => {
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
            <h2>断易 / 五行易 入力</h2>
          </div>
          <button className="utility-button" onClick={onApplyNow} type="button">
            今日
          </button>
        </div>
        <p>相談文を起点に、日時と地点から本卦・之卦・動爻を立てる試作モードです。まずは論点整理と読み筋の比較に向けた土台として使えます。</p>
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
          <span>解釈軸</span>
          <select
            value={input.topic}
            onChange={(event) =>
              onInputChange((draft) => ({
                ...draft,
                topic: event.target.value as DannekiTopic,
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
            placeholder="たとえば: 今の転職活動でA社に寄せるべきか、それとも独立準備を優先すべきか。"
            rows={6}
          />
        </label>
      </div>
    </section>
  );
}
