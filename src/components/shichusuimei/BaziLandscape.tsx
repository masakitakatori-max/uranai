import { elementOf, rootsForStem } from '../../lib/shichusuimei';
import type { BaziChart, LuckPeriod } from '../../lib/shichusuimeiTypes';

export function BaziLandscape({ chart, luck, title }: { chart: BaziChart; luck?: LuckPeriod | null; title: string }) {
  const pillars = [...chart.pillars, ...(luck ? [luck] : [])];
  const rooted = (element: string) => pillars.some(p => elementOf(p.stem) === element && rootsForStem(chart, p.stem, luck || undefined).length);
  const cold = chart.season === '冬' && !rooted('火'), dry = chart.season === '夏' && !rooted('水');
  const roots = rootsForStem(chart, chart.dayMaster, luck || undefined);
  const strongRoot = roots.some(r => r.main);
  const forge = pillars.some(p => p.stem === '丁') && rootsForStem(chart, '丁', luck || undefined).length > 0 && rootsForStem(chart, '庚', luck || undefined).length > 0;
  const stem = chart.dayMaster;
  const form = stem === '庚' ? forge ? '鍛えられる刀の候補' : '形になる前の金属' : stem === '辛' ? '光を受ける宝石' : stem === '戊' ? dry ? '乾いた山肌' : '厚みのある山と堤' : stem === '己' ? dry ? '水を待つ耕土' : '水を受け止める耕土' : stem === '癸' ? cold ? '冷えの中の雪' : strongRoot ? '土を潤す雨' : '葉に宿る露' : stem === '壬' ? cold ? '凍りを帯びた川' : '地形に沿って流れる水' : stem === '丙' ? '空を照らす太陽' : stem === '丁' ? '支えを受ける灯火' : cold ? '冷えた土に立つ木' : dry ? '乾いた土に立つ木' : '土に根を張る木';
  return <figure className="bazi-landscape"><figcaption><strong>{title}</strong><span>{chart.monthBranch}月・{chart.season}</span></figcaption>
    <svg viewBox="0 0 360 195" role="img" aria-label={`${stem}：${form}。${roots.length ? '根あり' : '同五行の根なし'}。`}>
      <rect width="360" height="195" fill={cold ? '#e4eaf0' : '#eaf0e0'} />
      <path d="M0 123 Q65 72 133 111 T260 104 T360 119 V195 H0Z" fill="#d7dfcd" />
      <path d="M0 150 Q90 164 180 148 T360 151 V195 H0Z" fill={dry ? '#c9bb9e' : cold ? '#c3cacf' : '#b9bca7'} />
      {rooted('火') && stem !== '丙' && <circle cx="302" cy="38" r="15" fill="#dcb769" opacity=".7" />}
      {rooted('水') && stem !== '癸' && <g stroke="#82acb7" strokeWidth="2" opacity=".7">{[40, 90, 135, 245, 280, 320].map(x => <path key={x} d={`M${x} 78 l-3 8 M${x + 8} 115 l-3 8`} />)}</g>}
      {'甲乙'.includes(stem) && <g transform={`translate(180 149) scale(${strongRoot ? 1.04 : .78})`}>
        <path d="M0 0 V-78 M0 -44 L-34 -72 M0 -60 L24 -89" stroke="#827456" strokeWidth={stem === '甲' ? 10 : 5} fill="none" />
        {roots.length > 0 && <path d="M0 0 L-17 26 M0 4 L26 23 M-11 15 L-28 18 M17 16 L30 16" fill="none" stroke="#827456" strokeWidth={strongRoot ? 4 : 2} />}
        {[-32, 0, 28].map((x, i) => <ellipse key={x} cx={x} cy={[-73, -96, -86][i]} rx={dry ? 23 : 31} ry={dry ? 17 : 25} fill={cold ? '#a7b6ae' : dry ? '#a6a271' : '#708b66'} />)}
      </g>}
      {stem === '庚' && (forge ? <g transform="translate(183 119) rotate(25)"><path d="M-6 0 V-89 L0 -103 L6 -89 V0Z" fill="#96a5a3" stroke="#677875" strokeWidth="2" /><path d="M-18 0 H18 M0 0 V27" stroke="#9e8354" strokeWidth="7" /><path d="M44 26 Q26 9 40 -11 Q37 10 50 0 Q68 21 44 26Z" fill="#cd9358" /></g> : <g><path d="M140 143 L147 100 L178 78 L211 104 L220 151 L177 161Z" fill="#a4a594" /><path d="M147 100 L177 119 L178 78 M177 119 L211 104 M177 119 L177 161 M177 119 L140 143" fill="none" stroke="#e4e2cd" strokeWidth="2" /></g>)}
      {stem === '辛' && <g><path d="M142 105 L164 84 H197 L219 105 L180 151Z" fill="#b7c9ca" stroke="#7d9d9d" strokeWidth="2" /><path d="M142 105 H219 M164 84 L158 105 L180 151 L203 105 L197 84 M158 105 L180 84 L203 105" fill="none" stroke="#f1f1dc" strokeWidth="2" /></g>}
      {stem === '戊' && <path d="M85 156 L157 64 L189 104 L215 78 L277 156Z" fill={dry ? '#a69b7b' : '#9fa388'} stroke="#8e937b" strokeWidth="2" />}
      {stem === '己' && <g stroke="#958460" strokeWidth="3">{[0, 1, 2, 3, 4].map(i => <path key={i} d={`M${70 + i * 36} 172 L${116 + i * 25} 137`} />)}<path d="M168 151 V131 M168 137 q-13 -13 -18 -7 M168 139 q12 -13 18 -6" stroke="#799269" fill="none" /></g>}
      {stem === '壬' && <path d="M224 130 Q132 139 180 155 Q242 177 146 195 H222 Q290 173 221 154 Q187 140 260 130Z" fill={cold ? '#c5d7e0' : '#87b0b8'} />}
      {stem === '癸' && <g fill="#86adb9" stroke="#86adb9">{[65, 116, 163, 215, 266, 307].map((x, i) => cold ? <path key={x} d={`M${x - 4} ${48 + i % 3 * 30} h8 M${x} ${44 + i % 3 * 30} v8`} strokeWidth="2" /> : strongRoot ? <path key={x} d={`M${x} ${45 + i % 3 * 24} q-9 14 0 14 q9 0 0 -14Z`} /> : <circle key={x} cx={x} cy={143 + i % 2 * 4} r="3" />)}</g>}
      {stem === '丙' && <g fill="#dfbb70"><circle cx="180" cy="67" r={strongRoot ? 32 : 24} /><g stroke="#dfbb70" strokeWidth="3">{[0,45,90,135].map(a => <path key={a} transform={`rotate(${a} 180 67)`} d="M180 22 V12 M180 112 V122" />)}</g></g>}
      {stem === '丁' && <g><path d="M182 142 Q144 120 177 77 Q170 110 188 97 Q215 130 182 142Z" fill="#d99760" /><path d="M163 145 H198" stroke="#9c835a" strokeWidth="5" /></g>}
    </svg><div className="bazi-scene-description"><strong>{stem}・{form}</strong><span>{cold ? '冷え' : dry ? '暑さ・乾き' : '寒暖と潤いを確認'} / {strongRoot ? '本気の根' : roots.length ? '蔵干の根' : '同五行の根なし'}</span></div>
  </figure>;
}
