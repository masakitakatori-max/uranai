import { ZodError } from 'zod';
import { interpretBazi, type ModelRunner } from './service';

export function isAllowedOrigin(origin: string) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return ['https://uranai.mozule.co.jp', 'https://masakitakatori-max.github.io'].includes(origin)
      || url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch { return false; }
}

export function createBaziHandler(run: ModelRunner, options: { accessToken?: string; local?: boolean; ready?: boolean } = {}) {
  let active = 0;
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin') || '';
    const headers: Record<string, string> = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', vary: 'Origin' };
    if (origin && isAllowedOrigin(origin)) headers['access-control-allow-origin'] = origin;
    const reply = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers });
    if (!isAllowedOrigin(origin)) return reply(403, { error: 'この接続元からは利用できません' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'Content-Type, Authorization' } });
    const ready = options.ready !== false && (!!options.local || !!options.accessToken);
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/api/shichusuimei/status') return reply(200, { ready, requiresAccessCode: !options.local });
    if (path !== '/api/shichusuimei/interpret') return reply(404, { error: '見つかりません' });
    if (request.method !== 'POST') return reply(405, { error: 'POSTで送信してください' });
    if (!ready) return reply(503, { error: 'AI解説の接続準備中です。命式と組み合わせは利用できます。' });
    if (!options.local && request.headers.get('authorization') !== `Bearer ${options.accessToken}`) return reply(401, { error: 'AI解説のアクセスコードを確認してください' });
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply(415, { error: 'JSON形式で送信してください' });
    if (active >= 2) return reply(429, { error: 'AI解説が混み合っています。少し待って再度お試しください。' });
    if (Number(request.headers.get('content-length')) > 16384) return reply(413, { error: '入力が長すぎます' });
    active++;
    try {
      const reader = request.body?.getReader(); let raw = ''; let size = 0;
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          size += value.byteLength;
          if (size > 16384) { await reader.cancel(); return reply(413, { error: '入力が長すぎます' }); }
          raw += decoder.decode(value, { stream: true });
        }
        raw += decoder.decode();
      }
      let input: unknown;
      try { input = JSON.parse(raw); } catch { return reply(400, { error: '入力の形式を確認してください' }); }
      const result = await interpretBazi(input, run, request.signal);
      return reply(200, result);
    } catch (error) {
      if (error instanceof ZodError) return reply(422, { error: '入力またはAIの回答形式を検証できませんでした。生年月日時を確認してください。' });
      if (request.signal.aborted) return reply(408, { error: 'AI解説を中止しました' });
      console.error('shichusuimei interpretation failed', error instanceof Error ? error.name : 'unknown');
      return reply(502, { error: 'AIの解説を検証できませんでした。入力を確認して再度お試しください。' });
    } finally { active--; }
  };
}
