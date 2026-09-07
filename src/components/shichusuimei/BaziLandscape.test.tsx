import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildBaziChart } from '../../lib/shichusuimei';
import { BaziLandscape } from './BaziLandscape';
const birth = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, utcOffset: 9, sex: 'male' as const };
const svg = (html: string) => html.slice(html.indexOf('<svg'), html.indexOf('</svg>'));
describe('changing the actual landscape', () => {
  it('visibly adds 壬 water even when rooted 癸 already exists', () => {
    const chart = buildBaziChart(birth);
    expect(chart.luck[0].stem).toBe('壬');
    const before = renderToStaticMarkup(<BaziLandscape chart={chart} title="原局" />);
    const after = renderToStaticMarkup(<BaziLandscape chart={chart} luck={chart.luck[0]} title="大運" />);
    expect(svg(after)).not.toBe(svg(before));
    expect(after).toContain('data-scene-stem="壬"');
    expect(before).toContain('data-scene-stem="辛"');
    expect(before).toContain('data-scene-stem="癸"');
  });
  it('keeps the birth season fixed while every selected luck changes the scene', () => {
    const chart = buildBaziChart(birth);
    const scenes = chart.luck.map(luck => svg(renderToStaticMarkup(<BaziLandscape chart={chart} luck={luck} title="大運" />)));
    expect(new Set(scenes).size).toBe(8);
    expect(chart.monthBranch).toBe('巳');
  });
});
