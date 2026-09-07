import type { BirthInput } from '../../lib/shichusuimeiTypes';

export function BirthEditor({ value, onChange, label }: { value: BirthInput; onChange: (input: BirthInput) => void; label: string }) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return <fieldset className="bazi-birth"><legend>{label}の出生情報</legend>
    <label>生年月日<input aria-label={`${label}の生年月日`} type="date" min="1900-01-01" max="2100-12-31" value={`${value.year}-${pad(value.month)}-${pad(value.day)}`} onChange={e => {
      const [year, month, day] = e.target.value.split('-').map(Number); onChange({ ...value, year, month, day });
    }} /></label>
    <label>出生時刻<input aria-label={`${label}の出生時刻`} type="time" value={`${pad(value.hour)}:${pad(value.minute)}`} onChange={e => {
      const [hour, minute] = e.target.value.split(':').map(Number); onChange({ ...value, hour, minute });
    }} /></label>
    <label>UTCとの時差<input aria-label={`${label}のUTC時差`} type="number" min="-12" max="14" step="0.25" value={value.utcOffset} onChange={e => onChange({ ...value, utcOffset: Number(e.target.value) })} /></label>
    <label>大運の順逆<select aria-label={`${label}の大運の順逆`} value={value.sex} onChange={e => onChange({ ...value, sex: e.target.value as BirthInput['sex'] })}><option value="male">男性の規則</option><option value="female">女性の規則</option></select></label>
    <small>時計に記録された現地時刻。日本は UTC+9。時刻不明のまま仮の時刻を入れず、確かな範囲で確認してください。</small>
  </fieldset>;
}
