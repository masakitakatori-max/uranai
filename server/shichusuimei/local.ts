import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { createBaziHandler } from './http';
import { runAgentSdk } from './agent';
import { createAnthropicRunner } from './anthropic';

const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
const handler = createBaziHandler(key ? createAnthropicRunner(key, process.env.SHICHUSUIMEI_MODEL) : runAgentSdk, { local: true });
const port = Number(process.env.SHICHUSUIMEI_PORT || 8788);
const server = createServer(async (req, res) => {
  const controller = new AbortController();
  res.on('close', () => { if (!res.writableFinished) controller.abort(); });
  try {
    let host = '';
    try { host = new URL(`http://${req.headers.host || ''}`).hostname; } catch { res.writeHead(400).end(); return; }
    if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) { res.writeHead(403).end(); return; }
    const request = new Request(`http://127.0.0.1:${port}${req.url}`, {
      method: req.method, headers: req.headers as Record<string, string>, signal: controller.signal,
      ...(!['GET', 'HEAD'].includes(req.method || '') ? { body: Readable.toWeb(req) as ReadableStream<Uint8Array>, duplex: 'half' } : {}),
    });
    const response = await handler(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
  } catch { if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' }); res.end('{"error":"AI接続でエラーが発生しました"}'); }
});
server.listen(port, '127.0.0.1', () => console.log(`四柱推命 API: http://127.0.0.1:${port} (${key ? 'Anthropic SDK' : 'Claude Agent SDK'})`));
