import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import type { ModelRunner } from './service';

export function createAnthropicRunner(apiKey: string, model = 'claude-sonnet-4-6'): ModelRunner {
  return async task => {
    const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 170_000 });
    const message = await client.messages.create({ model, max_tokens: 14000,
      system: task.system, messages: [{ role: 'user', content: task.prompt }],
      output_config: { format: jsonSchemaOutputFormat({ ...task.schema, type: 'object' }) },
    }, { signal: task.signal });
    if (message.stop_reason !== 'end_turn') throw new Error('AIが解説を完了できませんでした。条件を絞って再度お試しください。');
    const text = message.content.filter(c => c.type === 'text').map(c => c.text).join('');
    return { output: JSON.parse(text), provider: 'Anthropic SDK', model: message.model,
      usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, cacheReadTokens: message.usage.cache_read_input_tokens || 0, cacheWriteTokens: message.usage.cache_creation_input_tokens || 0, estimatedUsd: null } };
  };
}
