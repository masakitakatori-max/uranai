import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { circuitFixture } from '../../test/circuitFixture';
import { BaziSheetPanel } from './BaziSheet';
import type { BirthInput } from '../../lib/shichusuimeiTypes';

const summer: BirthInput = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, utcOffset: 9, sex: 'male' };
const now = new Date(2024, 10, 20);

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('鑑定個票', () => {
  it('renders the sheet sections with the entered name, memo and appraiser', () => {
    const { container } = render(<BaziSheetPanel input={summer} now={now} />);
    fireEvent.change(screen.getByLabelText('お名前'), { target: { value: '見本 花子' } });
    fireEvent.change(screen.getByLabelText('鑑定士'), { target: { value: '見本' } });
    fireEvent.change(screen.getByLabelText('メモ'), { target: { value: '初夏の庚金。' } });
    const sheet = screen.getByRole('region', { name: '鑑定個票' });
    expect(sheet).toHaveTextContent('見本 花子様');
    expect(sheet).toHaveTextContent('男性 1990/05/15 14:30生まれ');
    expect(within(sheet).getByRole('table', { name: '命式の天干' })).toHaveTextContent('敗財');
    expect(container.querySelectorAll('.bs-hidden-row .is-active')).toHaveLength(4);
    expect(within(sheet).getByRole('table', { name: '大運' })).toHaveTextContent('〜7');
    expect(within(within(sheet).getByRole('table', { name: '歳運' })).getAllByText('空亡')).toHaveLength(2);
    expect(sheet).toHaveTextContent('※年齢は数え年で表示されています');
    // 既定では日運カレンダーを外し、メモ欄を下段いっぱいに使う。
    expect(within(sheet).queryByRole('table', { name: '2024年11月の日運' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/日運カレンダーを載せる/));
    expect(within(sheet).getByRole('table', { name: '2024年11月の日運' })).toHaveTextContent('己1巳印綬');
    expect(sheet).toHaveTextContent('2024年 11月 乙亥');
    expect(sheet).toHaveTextContent('初夏の庚金。');
    expect(sheet).toHaveTextContent('鑑定士：見本');
  });

  it('follows the annual start year and calendar month inputs and reports out-of-range values', () => {
    render(<BaziSheetPanel input={summer} now={now} />);
    fireEvent.change(screen.getByLabelText('歳運の開始年'), { target: { value: '2030' } });
    fireEvent.change(screen.getByLabelText('日運の年月'), { target: { value: '2025-02' } });
    fireEvent.click(screen.getByLabelText(/日運カレンダーを載せる/));
    expect(screen.getByRole('table', { name: '歳運' })).toHaveTextContent('2030');
    expect(screen.getByRole('region', { name: '鑑定個票' })).toHaveTextContent('2025年 2月 戊寅');
    fireEvent.change(screen.getByLabelText('歳運の開始年'), { target: { value: '1800' } });
    expect(screen.getByRole('alert')).toHaveTextContent('1900年から2100年');
    expect(screen.getByRole('button', { name: '印刷・PDFで保存' })).toBeDisabled();
  });

  it('adds a print-only copy under body while printing and removes it afterwards', () => {
    vi.spyOn(window, 'print').mockImplementation(() => { window.dispatchEvent(new Event('beforeprint')); });
    render(<BaziSheetPanel input={summer} now={now} />);
    fireEvent.click(screen.getByRole('button', { name: '印刷・PDFで保存' }));
    expect(window.print).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector(':scope > .bazi-print-root .bazi-sheet')).not.toBeNull();
    act(() => { window.dispatchEvent(new Event('afterprint')); });
    expect(document.body.querySelector(':scope > .bazi-print-root')).toBeNull();
  });

  it('writes the circuit review into the memo box and lists the classics it cited', async () => {
    const result = circuitFixture();
    const fetcher = vi.fn(async (url: string) => url.endsWith('/status')
      ? { ok: true, json: async () => ({ ready: true, requiresAccessCode: false, circuit: { corpus: 'local-files', books: { 滴天髄: 203 } } }) }
      : { ok: true, json: async () => result });
    vi.stubGlobal('fetch', fetcher);
    render(<BaziSheetPanel input={summer} now={now} />);
    const button = screen.getByRole('button', { name: 'AIレビューをメモ欄に入れる' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect((screen.getByLabelText('メモ') as HTMLTextAreaElement).value).toContain('① 強さ：（決め手に欠けるが）身強'));
    expect(screen.getByRole('region', { name: '鑑定個票' })).toHaveTextContent('③ 用神：壬・戊（一部ある）');
    expect((screen.getByLabelText('メモ') as HTMLTextAreaElement).value).not.toContain('【用神】');
    fireEvent.click(screen.getByLabelText(/鑑定用の内訳/));
    fireEvent.click(screen.getByRole('button', { name: 'AIレビューをメモ欄に入れる' }));
    await waitFor(() => expect((screen.getByLabelText('メモ') as HTMLTextAreaElement).value).toContain('【用神】壬・戊・丙（調候）'));
    expect(screen.getByText(/AIレビューの出典 4件/)).toBeInTheDocument();
    expect(screen.getByText(/『窮通宝鑑』庚金総論 \/ 四月庚金/)).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(JSON.parse((fetcher.mock.calls[1]![1] as { body: string }).body)).toEqual({ person: summer });
  });

  it('shows the server reason when the circuit cannot ground its answer, and stays usable for printing', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('/status')
      ? { ok: true, json: async () => ({ ready: true, circuit: { corpus: 'bundled-excerpts', books: {} } }) }
      : { ok: false, json: async () => ({ error: '用神判定の根拠を古典・命式と照合できませんでした。', stage: 'strength', issues: ['引用が本文にない'] }) }));
    render(<BaziSheetPanel input={summer} now={now} />);
    const button = screen.getByRole('button', { name: 'AIレビューをメモ欄に入れる' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('引用が本文にない'));
    expect(screen.getByLabelText('メモ')).toHaveValue('');
    expect(screen.getByRole('button', { name: '印刷・PDFで保存' })).toBeEnabled();
  });

  it('keeps the review button out of reach while the circuit is not connected', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ready: false, requiresAccessCode: true, circuit: null }) })));
    render(<BaziSheetPanel input={summer} now={now} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'AIレビューをメモ欄に入れる' })).toBeDisabled());
    expect(screen.getByText('AIレビューは接続準備中です。個票は印刷できます。')).toBeInTheDocument();
  });
});
