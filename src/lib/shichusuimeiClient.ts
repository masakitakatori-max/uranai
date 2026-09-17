import { circuitResultSchema, type CircuitResult } from './shichusuimeiCircuit';
import { interpretationSchema, type InterpretationResponse } from './shichusuimeiInterpretation';
import type { BirthInput, InterpretationRequest } from './shichusuimeiTypes';

export function baziApiUrl(path: string) {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  const base = import.meta.env.DEV ? '' : configured || '';
  return `${base.replace(/\/$/, '')}/api/shichusuimei/${path}`;
}
export async function requestBaziInterpretation(request: InterpretationRequest, signal: AbortSignal, accessCode = ''): Promise<InterpretationResponse> {
  const response = await fetch(baziApiUrl('interpret'), {
    method: 'POST', signal, headers: { 'content-type': 'application/json', ...(accessCode ? { authorization: `Bearer ${accessCode}` } : {}) },
    body: JSON.stringify(request),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'AI解説を取得できませんでした');
  interpretationSchema.parse(data.interpretation);
  if (!Array.isArray(data.sources) || typeof data.model !== 'string') throw new Error('AI解説の参照情報が不足しています');
  return data as InterpretationResponse;
}

/** 用神判定回路（旺衰→格局→取用法→統合）を呼ぶ。古典の照合を含むため数分かかる。 */
export async function requestYongshenCircuit(person: BirthInput, signal: AbortSignal, accessCode = ''): Promise<CircuitResult> {
  const response = await fetch(baziApiUrl('yongshen'), {
    method: 'POST', signal, headers: { 'content-type': 'application/json', ...(accessCode ? { authorization: `Bearer ${accessCode}` } : {}) },
    body: JSON.stringify({ person }),
  });
  const data = await response.json();
  if (!response.ok) {
    const detail = Array.isArray(data.issues) ? `（${data.issues.join(' / ')}）` : '';
    throw new Error(typeof data.error === 'string' ? `${data.error}${detail}` : 'AIレビューを取得できませんでした');
  }
  circuitResultSchema.parse(data);
  return data as CircuitResult;
}
