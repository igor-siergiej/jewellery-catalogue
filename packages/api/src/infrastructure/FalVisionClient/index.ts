import type { Logger } from '@imapps/api-utils';
import { APIError } from '@imapps/api-utils/hono';
import type { ZodError } from 'zod';

import type { VisionCompletionOptions, VisionLlm } from '../../domain/EtsyListingCopyService/types';

const FAL_VISION_URL = 'https://fal.run/openrouter/router/vision';
const FAL_TEXT_URL = 'https://fal.run/openrouter/router';
const DEFAULT_FAL_MODEL = 'google/gemini-2.5-flash';
const TEMPERATURE = 0.7;
const MAX_TOKENS = 1500;
const TIMEOUT_MS = 45000;
const MAX_ATTEMPTS = 2;

type JsonExtraction = { value: unknown } | { issues: string };

const extractJsonObject = (output: string): JsonExtraction => {
    const start = output.indexOf('{');
    const end = output.lastIndexOf('}');
    if (start === -1 || end <= start) return { issues: 'no JSON object found in the reply' };
    try {
        return { value: JSON.parse(output.slice(start, end + 1)) as unknown };
    } catch {
        return { issues: 'the JSON object was malformed' };
    }
};

const flattenZodIssues = (error: ZodError): string =>
    error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');

/** Same retry/validation shape as shoppingo's FalLlmClient, against fal's OpenRouter router. */
export class FalVisionClient implements VisionLlm {
    constructor(
        private readonly apiKey: string,
        private readonly logger?: Logger,
        private readonly model: string = DEFAULT_FAL_MODEL
    ) {}

    isConfigured(): boolean {
        return this.apiKey.length > 0;
    }

    async completeStructured<T>(opts: VisionCompletionOptions<T>): Promise<T> {
        if (!this.isConfigured()) {
            throw new APIError('AI generation is not configured', 503);
        }

        const started = Date.now();
        let lastIssues = '';

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
            const prompt =
                attempt === 1
                    ? opts.prompt
                    : `${opts.prompt}\n\nYour previous reply failed validation: ${lastIssues}. Return only corrected JSON, no prose.`;

            const output = await this.request(opts.system, prompt, opts.imageUrls);
            const json = extractJsonObject(output);
            if ('issues' in json) {
                lastIssues = json.issues;
                continue;
            }

            const parsed = opts.schema.safeParse(json.value);
            if (parsed.success) {
                this.log(opts.operation, attempt, started, 'ok', opts.imageUrls.length);
                return parsed.data;
            }
            lastIssues = flattenZodIssues(parsed.error);
        }

        this.log(opts.operation, MAX_ATTEMPTS, started, 'invalid', opts.imageUrls.length);
        throw new APIError(`AI output failed validation after ${MAX_ATTEMPTS} attempts: ${lastIssues}`, 502);
    }

    private async request(system: string, prompt: string, imageUrls: string[]): Promise<string> {
        const hasImages = imageUrls.length > 0;
        const body = {
            ...(hasImages ? { image_urls: imageUrls } : {}),
            prompt,
            system_prompt: system,
            model: this.model,
            temperature: TEMPERATURE,
            max_tokens: MAX_TOKENS,
        };

        let response: Response;
        try {
            response = await fetch(hasImages ? FAL_VISION_URL : FAL_TEXT_URL, {
                method: 'POST',
                signal: AbortSignal.timeout(TIMEOUT_MS),
                headers: { 'Content-Type': 'application/json', Authorization: `Key ${this.apiKey}` },
                body: JSON.stringify(body),
            });
        } catch (error) {
            throw new APIError(`fal.ai request failed: ${(error as Error).message}`, 502);
        }

        if (!response.ok) {
            const detail = (await response.text().catch(() => '')).slice(0, 200);
            throw new APIError(`fal.ai error ${response.status}: ${detail}`, 502);
        }

        const data = (await response.json().catch(() => ({}))) as { output?: string; error?: string };
        if (data.error) {
            throw new APIError(`fal.ai error: ${String(data.error).slice(0, 200)}`, 502);
        }
        return data.output ?? '';
    }

    private log(operation: string, attempts: number, started: number, outcome: 'ok' | 'invalid', images: number): void {
        this.logger?.info('llm call', {
            operation,
            model: this.model,
            attempts,
            latencyMs: Date.now() - started,
            outcome,
            images,
        });
    }
}
