import { describe, expect, it } from 'vitest';
import { createBaziHandler } from './http';

describe('AI request admission', () => {
  it('rejects an untrusted origin before invoking the model', async () => {
    const handler = createBaziHandler(async () => { throw new Error('must not run'); }, { accessToken: 'secret' });
    const response = await handler(new Request('https://example.test/api/shichusuimei/interpret', { method: 'POST', headers: { origin: 'https://evil.test', 'content-type': 'application/json', authorization: 'Bearer secret' }, body: '{}' }));
    expect(response.status).toBe(403);
  });
  it('requires the server access token on the public adapter', async () => {
    const handler = createBaziHandler(async () => { throw new Error('must not run'); }, { accessToken: 'secret' });
    const response = await handler(new Request('https://example.test/api/shichusuimei/interpret', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }));
    expect(response.status).toBe(401);
  });
  it('keeps an unconfigured public adapter closed and rejects oversized bodies', async () => {
    const publicHandler = createBaziHandler(async () => { throw new Error('must not run'); });
    const status = await publicHandler(new Request('https://example.test/api/shichusuimei/status'));
    expect(await status.json()).toMatchObject({ ready: false });
    const local = createBaziHandler(async () => { throw new Error('must not run'); }, { local: true });
    const response = await local(new Request('http://localhost/api/shichusuimei/interpret', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'a'.repeat(20_000) }));
    expect(response.status).toBe(413);
  });
});
