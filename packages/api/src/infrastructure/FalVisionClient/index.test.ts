import { afterEach, describe, expect, it } from 'bun:test';
import { z } from 'zod';

import { FalVisionClient } from './index';

const originalFetch = globalThis.fetch;
const okResponse = (output: string) => new Response(JSON.stringify({ output }), { status: 200 });
const schema = z.object({ title: z.string() });

type Captured = { url: string; auth: string | null; body: Record<string, unknown> };
const capture = (replies: Array<() => Response>): Captured[] => {
    const calls: Captured[] = [];
    globalThis.fetch = (async (u: string | URL | Request, init?: RequestInit) => {
        calls.push({
            url: String(u),
            auth: new Headers(init?.headers).get('authorization'),
            body: JSON.parse(init?.body as string),
        });
        const next = replies.shift();
        if (!next) throw new Error('unexpected fetch');
        return next();
    }) as typeof fetch;
    return calls;
};

const call = (client: FalVisionClient, imageUrls: string[] = ['data:image/png;base64,AAA']) =>
    client.completeStructured({ operation: 'test', schema, system: 'SYS', prompt: 'PROMPT', imageUrls });

describe('FalVisionClient', () => {
    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('posts images, prompts, model and Key auth to the vision router', async () => {
        const calls = capture([() => okResponse('{"title":"Hi"}')]);

        const value = await call(new FalVisionClient('secret', undefined, 'google/gemini-2.5-flash'));

        expect(value).toEqual({ title: 'Hi' });
        expect(calls[0].url).toBe('https://fal.run/openrouter/router/vision');
        expect(calls[0].auth).toBe('Key secret');
        expect(calls[0].body).toMatchObject({
            image_urls: ['data:image/png;base64,AAA'],
            prompt: 'PROMPT',
            system_prompt: 'SYS',
            model: 'google/gemini-2.5-flash',
        });
    });

    it('uses the text router without image_urls when there are no images', async () => {
        const calls = capture([() => okResponse('{"title":"Hi"}')]);

        await call(new FalVisionClient('secret'), []);

        expect(calls[0].url).toBe('https://fal.run/openrouter/router');
        expect(calls[0].body.image_urls).toBeUndefined();
        expect(calls[0].body.model).toBe('google/gemini-2.5-flash');
    });

    it('retries once with the validation issues and then succeeds', async () => {
        const calls = capture([() => okResponse('not json'), () => okResponse('```json\n{"title":"Ok"}\n```')]);

        expect(await call(new FalVisionClient('secret'))).toEqual({ title: 'Ok' });
        expect(calls).toHaveLength(2);
        expect(String(calls[1].body.prompt)).toContain('failed validation');
    });

    it('throws 502 when every attempt fails validation', async () => {
        capture([() => okResponse('{"nope":1}'), () => okResponse('{"nope":1}')]);

        await expect(call(new FalVisionClient('secret'))).rejects.toMatchObject({ status: 502 });
    });

    it('throws 502 on a non-2xx fal response without retrying', async () => {
        const calls = capture([() => new Response('rate limited', { status: 429 })]);

        await expect(call(new FalVisionClient('secret'))).rejects.toMatchObject({ status: 502 });
        expect(calls).toHaveLength(1);
    });

    it('reports configuration from the api key', () => {
        expect(new FalVisionClient('').isConfigured()).toBe(false);
        expect(new FalVisionClient('k').isConfigured()).toBe(true);
    });
});
