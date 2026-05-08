import type { Branch, DivinationTopic, NobleChoice, QimenDirection, SynthesisInput, TaiitsuStartCondition } from "../lib/types";

interface SynthesisInputPanelProps {
  input: SynthesisInput;
  locations: readonly { id: string; label: string; offsetMinutes: number }[];
  daysInMonth: number;
  years: number[];
  onApplyNow: () => void;
  onInputChange: (updater: (draft: SynthesisInput) => SynthesisInput) => void;
}

const BRANCH_OPTIONS = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const satisfies readonly Branch[];
const QIMEN_DIRECTIONS = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"] as const satisfies readonly QimenDirection[];
const TOPICS = ["総合", "仕事", "金運", "恋愛", "結婚", "健康", "失せ物", "天気"] as const satisfies readonly DivinationTopic[];

export function SynthesisInputPanel({ input, locations, daysInMonth, years, onApplyNow, onInputChange }: SynthesisInputPanelProps) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const update = <K extends keyof SynthesisInput>(key: K, value: SynthesisInput[K]) => {
    onInputChange((draft) => {
      const updated = { ...draft, [key]: value };
      if (["year", "month"].includes(key as string)) {
        const maxDay = new Date(updated.year, updated.month, 0).getDate();
        if (updated.day > maxDay) updated.day = maxDay;
      }
      return updated;
    });
  };

  return (
    <section className="panel input-panel">
      <div className="panel-heading">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">統合入力</p>
            <h2>作盤条件（共通）</h2>
          </div>
          <button className="utility-button" onClick={onApplyNow} type="button">
            今日
          </button>
        </div>
        <p>単一の日時・地点・相談文から三式（六壬・奇門・太乙）と卜術（金口訣・断易）を同時に作盤します。</p>
      </div>

      <div className="input-grid">
        <label className="input-field">
          <span>年</span>
          <select value={input.year} onChange={(e) => update("year", Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="input-field">
          <span>月</span>
          <select value={input.month} onChange={(e) => update("month", Number(e.target.value))}>
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="input-field">
          <span>日</span>
          <select value={input.day} onChange={(e) => update("day", Number(e.target.value))}>
            {days.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="input-field">
          <span>時</span>
          <select value={input.hour} onChange={(e) => update("hour", Number(e.target.value))}>
            {hours.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
        <label className="input-field">
          <span>分</span>
          <select value={input.minute} onChange={(e) => update("minute", Number(e.target.value))}>
            {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="input-field">
          <span>地点</span>
          <select value={input.locationId} onChange={(e) => update("locationId", e.target.value)}>
            {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.label}</option>)}
          </select>
        </label>
        <label className="input-field">
          <span>占的</span>
          <select value={input.topic} onChange={(e) => update("topic", e.target.value as DivinationTopic)}>
            {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>

      <label className="input-field input-field-full">
        <span>相談文</span>
        <textarea
          value={input.questionText}
          onChange={(e) => update("questionText", e.target.value)}
          placeholder="相談内容を入力（AI解説に使用）"
          rows={2}
        />
      </label>

      <details className="input-subgroup">
        <summary>奇門遁甲・金口訣・太乙神数 個別設定</summary>
        <div className="input-grid">
          <label className="input-field">
            <span>奇門 目標方位</span>
            <select value={input.targetDirection} onChange={(e) => update("targetDirection", e.target.value as QimenDirection)}>
              {QIMEN_DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="input-field">
            <span>金口訣 地分</span>
            <select value={input.difen} onChange={(e) => update("difen", e.target.value as Branch)}>
              {BRANCH_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label className="input-field">
            <span>金口訣 貴神</span>
            <select value={input.nobleChoice} onChange={(e) => update("nobleChoice", e.target.value as NobleChoice)}>
              <option value="陽貴">陽貴</option>
              <option value="陰貴">陰貴</option>
            </select>
          </label>
          <label className="input-field">
            <span>太乙 方位</span>
            <select value={input.taiitsuDirection} onChange={(e) => update("taiitsuDirection", e.target.value as Branch)}>
              {BRANCH_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label className="input-field">
            <span>太乙 起局条件</span>
            <select value={input.startCondition} onChange={(e) => update("startCondition", e.target.value as TaiitsuStartCondition)}>
              <option value="time">時刻</option>
              <option value="direction">方位</option>
              <option value="time-and-direction">時刻・方位</option>
            </select>
          </label>
        </div>
      </details>
    </section>
  );
}
