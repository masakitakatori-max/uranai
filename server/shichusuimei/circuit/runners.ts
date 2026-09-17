import Anthropic from '@anthropic-ai/sdk';
import { betaJSONSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { createSdkMcpServer, query, tool } from '@anthropic-ai/claude-agent-sdk';
import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import type { StageUsage } from '../../../src/lib/shichusuimeiCircuit';
import type { StageRunner } from './pipeline';

export const DEFAULT_CIRCUIT_MODEL = 'claude-opus-5';
type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
// サーバー側フォールバックは Opus 5 / Fable 5.1 だけが受け付ける。
const SUPPORTS_FALLBACKS = new Set(['claude-opus-5', 'claude-fable-5-1']);

/** Anthropic API（SDKのツールランナー）で1段を実行する。 */
export function createApiStageRunner(options: { apiKey: string; model?: string; effort?: Effort }): StageRunner {
  const client = new Anthropic({ apiKey: options.apiKey, maxRetries: 2, timeout: 300_000 });
  const model = options.model || DEFAULT_CIRCUIT_MODEL;
  return async task => {
    const runner = client.beta.messages.toolRunner({
      model, max_tokens: 16000, max_iterations: 12,
      ...(SUPPORTS_FALLBACKS.has(model) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      thinking: { type: 'adaptive' },
      output_config: { effort: options.effort ?? 'high', format: betaJSONSchemaOutputFormat({ ...task.schema, type: 'object' }) },
      system: [{ type: 'text', text: task.system, cache_control: { type: 'ephemeral' } }],
      tools: task.tools.map(definition => betaZodTool({
        name: definition.name, description: definition.description, inputSchema: definition.input,
        run: input => definition.run(input as Record<string, unknown>),
      })),
      messages: [{ role: 'user', content: task.prompt }],
    }, { signal: task.signal });

    const usage: StageUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedUsd: null };
    let last: Anthropic.Beta.BetaMessage | undefined;
    for await (const message of runner) {
      last = message;
      usage.inputTokens += message.usage.input_tokens;
      usage.outputTokens += message.usage.output_tokens;
      usage.cacheReadTokens += message.usage.cache_read_input_tokens ?? 0;
      usage.cacheWriteTokens += message.usage.cache_creation_input_tokens ?? 0;
    }
    if (!last) throw new Error(`${task.stage}段の応答がありません`);
    if (last.stop_reason === 'refusal') throw new Error(`${task.stage}段の判定をモデルが辞退しました`);
    if (last.stop_reason !== 'end_turn') throw new Error(`${task.stage}段が完了しませんでした（${last.stop_reason}）`);
    const text = last.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('');
    return { output: JSON.parse(text), model: last.model, provider: 'Anthropic API', usage };
  };
}

/** Claude Agent SDK（ローカルの Claude 認証）で1段を実行する。古典ツールはプロセス内MCPとして渡す。 */
export function createAgentSdkStageRunner(options: { model?: string; effort?: Effort; maxBudgetUsd?: number } = {}): StageRunner {
  const model = options.model || DEFAULT_CIRCUIT_MODEL;
  const executable = process.env.CLAUDE_EXECUTABLE || process.env.PATH?.split(delimiter).map(path => join(path, 'claude')).find(path => existsSync(path));
  return async task => {
    const abortController = new AbortController();
    const abort = () => abortController.abort();
    if (task.signal.aborted) abort();
    task.signal.addEventListener('abort', abort, { once: true });
    const server = createSdkMcpServer({
      name: 'classics', version: '1.0.0',
      tools: task.tools.map(definition => tool(definition.name, definition.description, definition.input.shape,
        async args => ({ content: [{ type: 'text' as const, text: await definition.run(args as Record<string, unknown>) }] }))),
    });
    try {
      for await (const message of query({ prompt: task.prompt, options: {
        model, systemPrompt: task.system, outputFormat: { type: 'json_schema', schema: task.schema },
        tools: [], mcpServers: { classics: server }, allowedTools: task.tools.map(definition => `mcp__classics__${definition.name}`), strictMcpConfig: true,
        settingSources: [], persistSession: false, permissionMode: 'dontAsk', maxTurns: 16, maxBudgetUsd: options.maxBudgetUsd ?? 3, abortController,
        thinking: { type: 'adaptive' }, effort: options.effort ?? 'high',
        ...(executable ? { pathToClaudeCodeExecutable: executable } : {}),
      } })) {
        if (message.type !== 'result') continue;
        if (message.subtype !== 'success' || !message.structured_output) throw new Error(`${task.stage}段 Agent SDK: ${message.subtype}${message.subtype === 'success' ? '（構造化出力なし）' : ''}`);
        const usage = Object.values(message.modelUsage);
        return { output: message.structured_output, provider: 'Claude Agent SDK', model,
          usage: { inputTokens: usage.reduce((sum, item) => sum + item.inputTokens, 0), outputTokens: usage.reduce((sum, item) => sum + item.outputTokens, 0),
            cacheReadTokens: usage.reduce((sum, item) => sum + item.cacheReadInputTokens, 0), cacheWriteTokens: usage.reduce((sum, item) => sum + item.cacheCreationInputTokens, 0),
            estimatedUsd: message.total_cost_usd } };
      }
      throw new Error(`${task.stage}段の結果を受信できませんでした`);
    } finally { task.signal.removeEventListener('abort', abort); }
  };
}
