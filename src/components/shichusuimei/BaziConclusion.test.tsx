import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buildBaziChart } from '../../lib/shichusuimei';
import type { BaziInterpretation } from '../../lib/shichusuimeiInterpretation';
import { BaziConclusion } from './BaziConclusion';
const birth = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, utcOffset: 9, sex: 'male' as const };
const chart = buildBaziChart(birth);
afterEach(cleanup);
describe('the answer next to the question', () => {
  it('answers before AI with sourced provisional candidates and actual hidden-stem presence', () => {
    render(<BaziConclusion chart={chart} onSelect={() => {}} />);
    const answer = screen.getByRole('region', { name: '必要なものの結論' });
    expect(within(answer).getByText('壬・丙・戊')).toBeInTheDocument();
    expect(within(answer).getByText(/暫定/)).toBeInTheDocument();
    expect(within(answer).getByText(/原局に見当たらない/)).toBeInTheDocument();
    expect(within(answer).getByText(/月柱・巳中丙/)).toBeInTheDocument();
    expect(within(answer).getByText(/窮通宝鑑/)).toBeInTheDocument();
  });
  it('updates the answer when the birth month changes', () => {
    const { rerender } = render(<BaziConclusion chart={chart} onSelect={() => {}} />);
    rerender(<BaziConclusion chart={buildBaziChart({ ...birth, month: 1 })} onSelect={() => {}} />);
    expect(screen.queryByText('壬・丙・戊')).not.toBeInTheDocument();
    expect(screen.getByText('丙・丁・甲')).toBeInTheDocument();
  });
  it('keeps adopted, conditional and deferred judgments separate without leaking partner choices', () => {
    const row = { personId: 'a' as const, method: '調候' as const, status: '採用' as const, choice: '壬で調える', targets: ['壬' as const], reason: '壬の働きを用いる', conditions: [], obstacles: [], evidenceIds: ['a-day-s'], sourceIds: ['qt-590'] };
    const report: BaziInterpretation = { summary: 'まず壬を用い、丁は条件が整ったときに検討する。', strengths: [], yongshen: [row, { ...row, method: '扶抑', status: '条件付き', choice: '丁を検討', targets: ['丁'], conditions: ['水の妨げがないこと'] }, { ...row, method: '格局', status: '保留', choice: '格局は保留', targets: [] }, { ...row, personId: 'b', choice: '相手だけの甲', targets: ['甲'] }], compatibility: null, luck: null, uncertainties: [] };
    render(<BaziConclusion chart={chart} report={report} onSelect={() => {}} />);
    expect(screen.getByText(report.summary)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '採用した用神' })).toHaveTextContent('壬で調える');
    expect(screen.getByRole('region', { name: '条件付きの用神' })).toHaveTextContent('水の妨げがないこと');
    expect(screen.getByRole('region', { name: '判断を保留した用神' })).toHaveTextContent('格局は保留');
    expect(screen.queryByText('相手だけの甲')).not.toBeInTheDocument();
    expect(screen.queryByText('壬・丙・戊')).not.toBeInTheDocument();
  });
});
