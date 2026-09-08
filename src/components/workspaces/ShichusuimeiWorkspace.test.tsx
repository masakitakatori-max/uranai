import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShichusuimeiWorkspace } from './ShichusuimeiWorkspace';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('四柱推命 workspace', () => {
  it('renders the day master, hidden stems and two independent partner charts without calling interpretation automatically', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (!url.endsWith('/status')) throw new Error('automatic AI call');
      return { ok: true, json: async () => ({ ready: true, requiresAccessCode: false }) };
    }));
    render(<ShichusuimeiWorkspace />);
    expect(screen.getByRole('region', { name: '本人の命式' })).toBeInTheDocument();
    expect(screen.getByText('あなたの日主')).toBeInTheDocument();
    expect(screen.getAllByText('蔵干').length).toBe(4);
    fireEvent.click(screen.getByRole('button', { name: '二人の相性' }));
    expect(screen.getByRole('region', { name: '相手の命式' })).toBeInTheDocument();
    expect(screen.getByLabelText('相手の生年月日')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: '二人の相性をAIで読む' })).toBeEnabled());
  });
  it('clears a pending interpretation when birth input changes and ignores its late response', async () => {
    let resolve: ((response: unknown) => void) | undefined;
    vi.stubGlobal('fetch', vi.fn((url: string) => url.endsWith('/status')
      ? Promise.resolve({ ok: true, json: async () => ({ ready: true, requiresAccessCode: false }) })
      : new Promise(r => { resolve = r; })));
    render(<ShichusuimeiWorkspace />);
    const button = screen.getByRole('button', { name: '用神をAIで読む' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: '中止' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('本人の生年月日'), { target: { value: '1990-03-10' } });
    resolve?.({ ok: false, json: async () => ({ error: '古い命式の解説' }) });
    await waitFor(() => expect(screen.queryByRole('button', { name: '中止' })).not.toBeInTheDocument());
    expect(screen.queryByText('古い命式の解説')).not.toBeInTheDocument();
  });
  it('clears the previous evidence explanation when switching charts', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ready: false }) })));
    const { container } = render(<ShichusuimeiWorkspace />);
    fireEvent.click(container.querySelector('[data-fact-id="a-year-s"]')!);
    expect(container.querySelector('.bazi-evidence-box')?.textContent).toContain('年柱の庚');
    fireEvent.click(screen.getByRole('button', { name: '二人の相性' }));
    expect(container.querySelector('.bazi-evidence-box')?.textContent).not.toContain('年柱の庚');
    expect(screen.getByText('相手の日主')).toBeInTheDocument();
    expect(screen.getByText('相手の確認事項')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: '二人の相性をAIで読む' })).toBeDisabled());
  });

  it('highlights all three participants of a three-branch combination without internal IDs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ready: false }) })));
    const { container } = render(<ShichusuimeiWorkspace />);
    fireEvent.change(screen.getByLabelText('本人の生年月日'), { target: { value: '1990-01-08' } });
    fireEvent.change(screen.getByLabelText('本人の出生時刻'), { target: { value: '12:00' } });
    fireEvent.click(screen.getByRole('button', { name: '組み合わせ', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: /三合/ }));
    expect(container.querySelectorAll('.bazi-node.is-evidence')).toHaveLength(3);
    expect(container.querySelector('.bazi-evidence-box')?.textContent).not.toContain('a-year-b');
    await waitFor(() => expect(screen.getByRole('button', { name: '用神をAIで読む' })).toBeDisabled());
  });

  it('places the AI answer beside the question and clears it immediately for a different chart', async () => {
    const interpretation = {
      summary: 'まず壬を用いるという今回の判断。',
      strengths: [{ personId: 'a', assessment: '判定例', reason: '根を確認', evidenceIds: ['a-day-s'], sourceIds: ['qt-590'] }],
      yongshen: ['格局', '扶抑', '調候', '病薬', '通関'].map(method => ({ personId: 'a', method, status: '条件付き', choice: '壬を検討', targets: ['壬'], reason: '配合を確認', conditions: ['水が働く条件'], obstacles: [], evidenceIds: ['a-day-s'], sourceIds: ['qt-590'] })),
      compatibility: null, luck: null, uncertainties: [],
    };
    const fetcher = vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('/status') ? { ready: true } : { interpretation, sources: [], model: 'fixture', generatedAt: '2026-09-08T00:00:00Z' } }));
    vi.stubGlobal('fetch', fetcher);
    const { container } = render(<ShichusuimeiWorkspace />);
    await waitFor(() => expect(screen.getByRole('button', { name: '用神をAIで読む' })).toBeEnabled());
    expect(fetcher).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '用神をAIで読む' }));
    await waitFor(() => expect(container.querySelector('.bazi-answer-heading')).toHaveTextContent(interpretation.summary));
    fireEvent.change(screen.getByLabelText('本人の生年月日'), { target: { value: '1990-01-15' } });
    expect(container.querySelector('.bazi-answer-heading')).not.toHaveTextContent(interpretation.summary);
    expect(container.querySelector('.bazi-answer-heading')).toHaveTextContent('丙・丁・甲');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

});
