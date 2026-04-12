import type { Branch, Ganzhi, LiurenInput, LiurenTopic, LocationOffset } from "../lib/types";

interface InputPanelProps {
  input: LiurenInput;
  locations: readonly LocationOffset[];
  daysInMonth: number;
  years: number[];
  ganzhiOptions: readonly Ganzhi[];
  onApplyNow: () => void;
  onInputChange: (updater: (draft: LiurenInput) => LiurenInput) => void;
}

function overrideLabel<T extends string>(value: T | "") {
  return value || "自動";
}

export function InputPanel({ input, locations, daysInMonth, years, ganzhiOptions, onApplyNow, onInputChange }: InputPanelProps) {
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const minutes = Array.from({ length: 60 }, (_, index) => index);
  const branchOptions = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const satisfies readonly Branch[];
  const topics = ["総合", "仕事", "金運", "恋愛", "結婚", "健康", "失せ物", "天気"] as const satisfies readonly LiurenTopic[];

  const updateNumber = (key: keyof Pick<LiurenInput, "year" | "month" | "day" | "hour" | "minute">, value: string) => {
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
            <h2>作盤条件</h2>
          </div>
          <button className="utility-button" onClick={onApplyNow} type="button">
            今日
          </button>
        </div>
        <p>地方時差を反映した補正時刻を基準に、日干支・月将・占時を決定します。</p>
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
                {location.label} {location.offsetMinutes > 0 ? `+${location.offsetMinutes}` : location.offsetMinutes}分
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
                topic: event.target.value as LiurenTopic,
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
            placeholder="占いたい事象を自由に入力。入力内容から近い占的へ解釈を寄せます。"
            rows={5}
          />
        </label>
      </div>

      <details className="override-panel">
        <summary>詳細設定</summary>
        <div className="override-grid">
          <label>
            <span>日干支</span>
            <select
              value={input.manualOverrides.dayGanzhi}
              onChange={(event) =>
                onInputChange((draft) => ({
                  ...draft,
                  manualOverrides: {
                    ...draft.manualOverrides,
                    dayGanzhi: event.target.value as Ganzhi | "",
                  },
                }))
              }
            >
              <option value="">{overrideLabel(input.manualOverrides.dayGanzhi)}</option>
              {ganzhiOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>月将</span>
            <select
              value={input.manualOverrides.monthGeneral}
              onChange={(event) =>
                onInputChange((draft) => ({
                  ...draft,
                  manualOverrides: {
                    ...draft.manualOverrides,
                    monthGeneral: event.target.value as Branch | "",
                  },
                }))
              }
            >
              <option value="">{overrideLabel(input.manualOverrides.monthGeneral)}</option>
              {branchOptions.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>占時</span>
            <select
              value={input.manualOverrides.hourBranch}
              onChange={(event) =>
                onInputChange((draft) => ({
                  ...draft,
                  manualOverrides: {
                    ...draft.manualOverrides,
                    hourBranch: event.target.value as Branch | "",
                  },
                }))
              }
            >
              <option value="">{overrideLabel(input.manualOverrides.hourBranch)}</option>
              {branchOptions.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>
    </section>
  );
}
