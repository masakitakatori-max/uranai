import type { BirthInput } from '../../lib/shichusuimeiTypes';

const YEARS = Array.from({ length: 201 }, (_, index) => 1900 + index);
const range = (length: number, from = 0) => Array.from({ length }, (_, index) => from + index);

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function BirthEditor({ value, onChange, label }: { value: BirthInput; onChange: (input: BirthInput) => void; label: string }) {
  // 月末より後ろの日を選んだまま月や年が変わらないよう、その月の日数に丸める。
  const update = (patch: Partial<BirthInput>) => {
    const next = { ...value, ...patch };
    onChange({ ...next, day: Math.min(next.day, daysInMonth(next.year, next.month)) });
  };
  const select = (name: string, current: number, options: number[], unit: string, onSelect: (chosen: number) => void) =>
    <label>{name}<select aria-label={`${label}の${name}`} value={current} onChange={event => onSelect(Number(event.target.value))}>
      {options.map(option => <option key={option} value={option}>{option}{unit}</option>)}
    </select></label>;

  return <fieldset className="bazi-birth">
    <legend>{label}の出生情報</legend>
    <div className="bazi-birth-when">
      {select('生まれた年', value.year, YEARS, '年', year => update({ year }))}
      {select('生まれた月', value.month, range(12, 1), '月', month => update({ month }))}
      {select('生まれた日', value.day, range(daysInMonth(value.year, value.month), 1), '日', day => update({ day }))}
      {select('生まれた時', value.hour, range(24), '時', hour => update({ hour }))}
      {select('生まれた分', value.minute, range(60), '分', minute => update({ minute }))}
    </div>
    <label>UTCとの時差<input aria-label={`${label}のUTC時差`} type="number" min="-12" max="14" step="0.25" value={value.utcOffset} onChange={e => update({ utcOffset: Number(e.target.value) })} /></label>
    <label>大運の順逆<select aria-label={`${label}の大運の順逆`} value={value.sex} onChange={e => update({ sex: e.target.value as BirthInput['sex'] })}><option value="male">男性の規則</option><option value="female">女性の規則</option></select></label>
    <small>時計に記録された現地時刻。日本は UTC+9。時刻不明のまま仮の時刻を入れず、確かな範囲で確認してください。</small>
  </fieldset>;
}
