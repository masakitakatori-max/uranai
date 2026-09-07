import { interpretationSchema, type InterpretationResponse } from './shichusuimeiInterpretation';
import type { InterpretationRequest } from './shichusuimeiTypes';

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
