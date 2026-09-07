import { createBaziHandler } from '../server/shichusuimei/http';
import { createAnthropicRunner } from '../server/shichusuimei/anthropic';

interface Env { ANTHROPIC_API_KEY?: string; SHICHUSUIMEI_ACCESS_TOKEN?: string; SHICHUSUIMEI_MODEL?: string }
let current: { key?: string; token?: string; model?: string; handle: ReturnType<typeof createBaziHandler> } | null = null;
export function handleShichusuimei(request: Request, env: Env) {
  if (!current || current.key !== env.ANTHROPIC_API_KEY || current.token !== env.SHICHUSUIMEI_ACCESS_TOKEN || current.model !== env.SHICHUSUIMEI_MODEL) {
    current = { key: env.ANTHROPIC_API_KEY, token: env.SHICHUSUIMEI_ACCESS_TOKEN, model: env.SHICHUSUIMEI_MODEL,
      handle: createBaziHandler(createAnthropicRunner(env.ANTHROPIC_API_KEY || 'unconfigured', env.SHICHUSUIMEI_MODEL), { accessToken: env.SHICHUSUIMEI_ACCESS_TOKEN, ready: !!env.ANTHROPIC_API_KEY }) };
  }
  return current.handle(request);
}
