import { describe, expect, it } from 'vitest';
import { createBaziHandler } from './http';
import { bundledCorpus } from './classics/corpus';
import { CircuitValidationError } from './circuit/pipeline';

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
  it('serves the yongshen circuit only when it is configured and reports validation failures by stage', async () => {
    const modelNotUsed = async () => { throw new Error('must not run'); };
    const person = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, utcOffset: 9, sex: 'male' };
    const post = (body: unknown) => new Request('http://localhost/api/shichusuimei/yongshen', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const without = createBaziHandler(modelNotUsed, { local: true });
    expect((await without(post({ person }))).status).toBe(503);

    const failing = createBaziHandler(modelNotUsed, { local: true, circuit: { corpus: bundledCorpus(), run: async () => { throw new CircuitValidationError('strength', ['引用が本文にない']); } } });
    const status = await failing(new Request('http://localhost/api/shichusuimei/status'));
    expect(await status.json()).toMatchObject({ ready: true, circuit: { corpus: 'bundled-excerpts' } });
    const failed = await failing(post({ person }));
    expect(failed.status).toBe(502);
    expect(await failed.json()).toMatchObject({ stage: 'strength', issues: ['引用が本文にない'] });
    expect((await failing(post({ person: { ...person, month: 13 } }))).status).toBe(422);
  });
});
