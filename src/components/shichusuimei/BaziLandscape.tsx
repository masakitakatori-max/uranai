import { useId } from 'react';
import type { BaziChart, LuckPeriod, Stem } from '../../lib/shichusuimeiTypes';
import { buildScene, rootAppearance, type SceneStem } from './baziScene';

type Props = { chart: BaziChart; luck?: LuckPeriod | null; title: string; selected?: string[]; onSelect?: (ids: string[], detail: string) => void };
const position: Record<Stem, [number, number]> = { 甲: [144, 182], 乙: [68, 212], 丙: [325, 60], 丁: [375, 207], 戊: [70, 126], 己: [198, 224], 庚: [287, 188], 辛: [420, 179], 壬: [224, 125], 癸: [430, 59] };

function Glyph({ entity, cold }: { entity: SceneStem; cold: boolean }) {
  const stem = entity.stem;
  if (stem === '甲' || stem === '乙') return <g>
    <path d={stem === '甲' ? 'M0 0 V-74 M0 -34 L-25 -59 M0 -51 L22 -76' : 'M0 0 Q-15 -25 1 -49 M-1 -20 Q-33 -49 -30 -23 M-1 -29 Q29 -66 27 -37'} stroke="#73694b" strokeWidth={stem === '甲' ? 7 : 3} fill="none" />
    {stem === '甲' ? <g fill={cold ? '#a3b4ac' : '#759365'}><ellipse cx="-20" cy="-65" rx="24" ry="21" /><ellipse cy="-83" rx="28" ry="24" /><ellipse cx="23" cy="-72" rx="23" ry="22" /></g> : <g fill={cold ? '#9bad98' : '#86a866'}><ellipse cx="-20" cy="-27" rx="15" ry="7" transform="rotate(28 -20 -27)" /><ellipse cx="18" cy="-39" rx="17" ry="8" transform="rotate(-40 18 -39)" /></g>}
    {entity.roots.length > 0 && <g stroke="#837354" fill="none" strokeWidth="2">{entity.roots.map((r, i) => <path key={r.id} d={`M0 0 Q${(i % 2 ? 1 : -1) * (10 + i * 4)} 14 ${(i % 2 ? 1 : -1) * (18 + i * 5)} ${22 + i * 2}`} />)}</g>}
  </g>;
  if (stem === '丙') return <g fill="#e4b45d"><circle r="25" /><circle r="34" fill="none" stroke="#e4b45d" strokeWidth="1" opacity=".4" />{[0, 45, 90, 135].map(a => <path key={a} d="M0 -40 V-46 M0 40 V46" transform={`rotate(${a})`} stroke="#d6a24d" strokeWidth="2" />)}</g>;
  if (stem === '丁') return <g><path d="M0 0 Q-27 -19 -3 -52 Q-10 -28 6 -34 Q26 -14 0 0Z" fill="#db9555" /><path d="M-2 -3 Q-13 -15 1 -31 Q11 -13 -2 -3Z" fill="#f3d89d" /><path d="M-19 4 H18" stroke="#8c7251" strokeWidth="5" /></g>;
  if (stem === '戊') return <g><path d="M-55 10 L-9 -63 L15 -25 L36 -47 L65 10Z" fill="#a9a48a" /><path d="M-9 -63 L-1 -10 L15 -25 L28 10" fill="none" stroke="#d7ceb5" strokeWidth="3" /></g>;
  if (stem === '己') return <g><path d="M-53 5 L-28 -19 H52 L29 9Z" fill="#af9870" />{[0, 1, 2, 3].map(i => <path key={i} d={`M${-41 + i * 23} 4 l19 -20`} stroke="#dac9a3" strokeWidth="3" />)}</g>;
  if (stem === '庚') return entity.form.includes('刀') ? <g transform="rotate(19)"><path d="M-7 3 V-67 L0 -85 L7 -67 V3Z" fill="#a1b5b8" stroke="#657d80" strokeWidth="2" /><path d="M-18 4 H18 M0 4 V24" stroke="#a78850" strokeWidth="6" /></g> : <g><path d="M-30 5 L-28 -33 L0 -57 L30 -31 L36 8 L4 18Z" fill="#9ba49b" stroke="#76847d" /><path d="M-28 -33 L2 -14 L0 -57 M2 -14 L30 -31 M2 -14 L4 18" stroke="#d5dbcc" strokeWidth="2" fill="none" /></g>;
  if (stem === '辛') return <g><path d="M-27 -25 L-14 -42 H15 L29 -25 L0 14Z" fill="#b5d1d5" stroke="#7ba2ab" strokeWidth="2" /><path d="M-27 -25 H29 M-14 -42 L-15 -25 L0 14 L17 -25 L15 -42 M-15 -25 L0 -42 L17 -25" fill="none" stroke="#f6fbec" strokeWidth="2" /></g>;
  if (stem === '壬') return <g><path d="M-7 0 Q-38 30 -5 55 Q35 91 -17 123 H25 Q71 87 29 51 Q1 23 20 0Z" fill={cold ? '#b8cddc' : '#7aaab4'} /><path d="M4 16 Q-15 32 9 56 T8 110" fill="none" stroke="#dbe9e6" strokeWidth="3" /></g>;
  return <g>{entity.form.includes('露') ? <g><path d="M-34 12 Q0 -13 31 10" stroke="#7a9668" strokeWidth="4" fill="none" />{[-21, 0, 20].map((x, i) => <circle key={x} cx={x} cy={3 + i % 2 * 5} r="4" fill="#a1c7d0" />)}</g> : <g><path d="M-35 0 Q-47 -18 -25 -23 Q-18 -47 4 -29 Q30 -42 35 -17 Q54 -5 31 3Z" fill={cold ? '#d3dce3' : '#afc7cd'} />{[-26, -8, 12, 30].map((x, i) => cold ? <path key={x} d={`M${x - 4} ${19 + i % 2 * 12} h8 M${x} ${15 + i % 2 * 12} v8`} stroke="#f9fcff" strokeWidth="2" /> : <path key={x} d={`M${x} 13 l-5 11 M${x + 3} 35 l-5 11`} stroke="#78a8b9" strokeWidth="2" />)}</g>}</g>;
}

export function BaziLandscape({ chart, luck, title, selected = [], onSelect }: Props) {
  const scene = buildScene(chart, luck);
  const gradient = useId().replace(/:/g, '');
  const palette = { 春: ['#e5eee0', '#d6e3c4'], 夏: ['#f5e9c8', '#e1d19f'], 秋: ['#edf0e8', '#d5d3b9'], 冬: ['#dce5ef', '#c7d3dd'] }[chart.season];
  const choose = (entity: SceneStem) => onSelect?.([...entity.pillars.map(p => p.id + '-s'), ...entity.roots.map(r => r.id)], `${entity.pillars.map(p => p.label).join('・')}の${entity.stem}：${entity.form}。根は${entity.roots.length ? entity.roots.map(r => `${r.branch}中${r.stem}（${r.main ? '本気' : '余気'}）`).join('・') : 'なし'}。比喩の成立と用神の適否は別に検討します。`);
  return <figure className="bazi-landscape bazi-live-landscape">
    <figcaption><strong>{title}</strong><span>{chart.monthBranch}月・{chart.season} {luck && `＋${luck.ganzhi}`}</span></figcaption>
    <svg viewBox="0 0 500 320" role="group" aria-label={`${title}の風景`}>
      <defs><linearGradient id={gradient} x2="0" y2="1"><stop stopColor={palette[0]} /><stop offset="1" stopColor={palette[1]} /></linearGradient></defs>
      <rect width="500" height="320" fill={`url(#${gradient})`} />
      <path d="M0 197 Q120 162 237 201 T500 180 V320 H0Z" fill={scene.cold ? '#c0cbd0' : '#c8c8a8'} />
      <path d="M0 228 Q130 205 244 233 T500 211 V320 H0Z" fill={scene.wet.length > scene.dry.length ? '#b4b9a4' : '#bcad8c'} />
      {[...scene.entities].sort((a, b) => '壬戊己甲乙庚辛丙丁癸'.indexOf(a.stem) - '壬戊己甲乙庚辛丙丁癸'.indexOf(b.stem)).map(entity => {
        const appearance = rootAppearance(entity.roots);
        const [x, y] = position[entity.stem];
        const active = entity.pillars.some(p => selected.includes(p.id + '-s')) || entity.roots.some(r => selected.includes(r.id));
        const labelY = entity.stem === '丙' || entity.stem === '癸' ? 73 : entity.stem === '戊' ? 33 : entity.stem === '壬' ? -17 : entity.stem === '己' ? 25 : entity.stem === '丁' ? 44 : 37;
        return <g key={entity.stem} data-scene-stem={entity.stem} data-root-branches={appearance.branches} data-incoming={entity.incoming} role="button" tabIndex={onSelect ? 0 : undefined} aria-label={`${entity.pillars.map(p => p.label).join('・')} ${entity.stem} ${entity.form} 根${appearance.branches}支${entity.incoming ? ' 大運で追加' : ''}`} className={`bazi-scene-object ${active ? 'is-selected' : ''}`} transform={`translate(${x} ${y})`} onClick={() => choose(entity)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(entity); } }}>
          <rect className="bazi-scene-hit" x="-48" y={entity.stem === '丙' || entity.stem === '癸' ? -49 : -100} width="96" height={entity.stem === '壬' ? 231 : 141} rx="18" fill="transparent" />
          <g className="bazi-scene-shape" style={{ transform: `scale(${appearance.scale})`, opacity: appearance.opacity }}><Glyph entity={entity} cold={scene.cold} /></g>
          <g transform={`translate(0 ${labelY})`}><rect x="-43" y="-12" width="86" height="34" rx="5" fill={entity.incoming ? '#d9eff0' : entity.day ? '#f4e5bb' : '#f6f5e9'} stroke={entity.incoming ? '#609fa8' : entity.day ? '#af8a40' : '#c0c7b5'} /><text textAnchor="middle" y="1" fontSize="12" fill="#354b3d">{entity.day ? '日主 ' : ''}{entity.stem}{entity.incoming ? ' ＋大運' : ''}</text><text textAnchor="middle" y="14" fontSize="9" fill="#526550">根{appearance.branches}支・本気{appearance.main}</text></g>
        </g>;
      })}
      <g transform="translate(12 275)">{scene.pillars.map((p, i) => <g key={p.id} transform={`translate(${i * (476 / scene.pillars.length)} 0)`}>
        <rect width={476 / scene.pillars.length - 5} height="35" rx="4" fill={p.id === luck?.id ? '#cde8ea' : p.storage?.moisture === '湿土' ? '#cdd9cf' : '#ddd0b4'} />
        <text x="7" y="14" fontSize="11" fill="#3e5141">{p.id === luck?.id ? '大運' : p.label} {p.branch}</text><text x="7" y="27" fontSize="10" fill="#59634c">{p.hidden.map(h => h.stem).join('・')}{p.storage ? ` / ${p.storage.moisture}` : ''}</text>
      </g>)}</g>
    </svg>
    <div className="bazi-scene-description"><strong>{chart.dayMaster}を取り巻く景色</strong><span>金枠＝日主 / 青枠＝大運で加わる干。絵を選ぶと命式の根拠が光ります。</span></div>
    <div className="bazi-scene-legend">{scene.entities.map(entity => <button type="button" key={entity.stem} onClick={() => choose(entity)} aria-pressed={entity.pillars.some(p => selected.includes(p.id + '-s'))}><b>{entity.stem}</b><span>{entity.form}<small>{entity.pillars.map(p => p.label).join('・')}</small></span></button>)}</div>
  </figure>;
}
