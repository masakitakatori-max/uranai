import { query } from '@anthropic-ai/claude-agent-sdk';
import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import type { ModelRunner } from './service';

export const runAgentSdk: ModelRunner = async task => {
  const abortController = new AbortController();
  const abort = () => abortController.abort();
  if (task.signal.aborted) abort();
  task.signal.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 360_000);
  const model = process.env.SHICHUSUIMEI_MODEL || 'claude-sonnet-4-6';
  const executable = process.env.CLAUDE_EXECUTABLE || process.env.PATH?.split(delimiter).map(path => join(path, 'claude')).find(path => existsSync(path));
  try {
    for await (const message of query({ prompt: task.prompt, options: {
      model, systemPrompt: task.system, outputFormat: { type: 'json_schema', schema: task.schema },
      tools: [], allowedTools: [], mcpServers: {}, strictMcpConfig: true, settingSources: [], persistSession: false,
      permissionMode: 'dontAsk', maxTurns: 3, maxBudgetUsd: 2, abortController,
      thinking: { type: 'enabled', budgetTokens: 3000 }, effort: 'medium',
      ...(executable ? { pathToClaudeCodeExecutable: executable } : {}),
    } })) {
      if (message.type !== 'result') continue;
      if (message.subtype !== 'success' || !message.structured_output) throw new Error(`Agent SDK result: ${message.subtype}${message.subtype === 'success' ? ' (missing structured output)' : ''}`);
      const usage = Object.values(message.modelUsage);
      return { output: message.structured_output, provider: 'Claude Agent SDK', model,
        usage: { inputTokens: usage.reduce((a, u) => a + u.inputTokens, 0), outputTokens: usage.reduce((a, u) => a + u.outputTokens, 0), cacheReadTokens: usage.reduce((a, u) => a + u.cacheReadInputTokens, 0), cacheWriteTokens: usage.reduce((a, u) => a + u.cacheCreationInputTokens, 0), estimatedUsd: message.total_cost_usd } };
    }
    throw new Error('AIから解説を受信できませんでした');
  } finally { clearTimeout(timeout); task.signal.removeEventListener('abort', abort); }
};
