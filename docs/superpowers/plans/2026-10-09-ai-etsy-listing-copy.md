# AI Etsy Listing Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The "Send to Etsy" dialog gets a **Generate with AI** button. It fills an editable Etsy title, description and up to 13 tags from the design's data and photos. All three are sent to Etsy and saved on the design.

**Architecture:** Shared Etsy limits and `normaliseEtsyTag` go in `packages/types`. The API gains:
- `FalVisionClient`, which calls fal.ai's OpenRouter router (vision endpoint when photos are present, text endpoint otherwise);
- an `EtsyListingCopyService`, which builds a facts block, calls the client and sanitises the reply;
- a non-persisting `POST /api/designs/:id/etsy-listing/generate` route.

`EtsyPushService.push` takes `title` and `tags` overrides, sends `tags` to Etsy and persists `design.etsyListing`. The web `EtsyPushDialog` gains a Title input, a `TagInput` chip editor and the Generate button.

**Tech Stack:** Bun + Hono + Zod 4 (api, `bun test`), React + TanStack Query + shadcn/ui (web, vitest), Playwright e2e, Biome lint, `tsc --noEmit`.

**Spec:** `docs/superpowers/specs/2026-10-09-ai-etsy-listing-copy-design.md`

## Global Constraints

- **Limits:** `ETSY_TITLE_MAX = 140`, `ETSY_TAGS_MAX = 13`, `ETSY_TAG_MAX_LENGTH = 20`.
- **Tag charset:** letters, digits, whitespace, `-`, `'`, `™`, `©`, `®`. Tags are stored lowercase.
- **Title:** at most one each of `%`, `:`, `&`.
- **fal endpoints:**
  - vision: `POST https://fal.run/openrouter/router/vision` (body `image_urls, prompt, system_prompt, model, temperature, max_tokens`)
  - text: `POST https://fal.run/openrouter/router` (same body without `image_urls`)
  - Auth header: `Authorization: Key <FAL_KEY>`. The response has the shape `{ output: string }`.
- **Env:** `FAL_KEY` optional. `FAL_MODEL` optional, default `google/gemini-2.5-flash`.
- **Unconfigured:** no `FAL_KEY` → `APIError('AI generation is not configured', 503)`. fal or validation failure → 502.
- **Photos:** at most 3 product photos (`design.imageIds`, never `diagramImageIds`), sent as `data:<contentType>;base64,...`.
- **No silent generation:** generation never runs without an explicit click and never persists by itself. Only a successful push saves `etsyListing`.
- **Existing behaviour kept:** the `etsyDescriptionTemplate` default stays. The push still never sends an empty description.
- **Units:** material `diameter` is millimetres. `requiredLength` is centimetres (`DesignUpdateForm` divides it by 100 to get metres).
- **Commands:**
  - Lint: `bun run lint`, run from the repo root.
  - Type check: `bun run tsc --noEmit`, run from the repo root.
  - API tests: `bun run --filter @jewellery-catalogue/api test`. For one file: `cd packages/api && bun test <path>`.
  - Web unit tests: `cd packages/web && bunx vitest run <path>`.
  - E2E: `bun run --filter @jewellery-catalogue/web pw:e2e`. It needs the dev stack from `.kanban-cli.json` `dev.startCommand`.

---

### Task 1: Shared Etsy listing types

**Files:**
- Create: `packages/types/src/etsyListing/index.ts`
- Modify: `packages/types/src/index.ts`, `packages/types/src/design/index.ts`
- Test: `packages/api/src/domain/EtsyListingCopyService/normaliseEtsyTag.test.ts`. The types package has no test runner; the API's `bun test` covers this shared function.

**Interfaces:**
- Produces:
  - `ETSY_TITLE_MAX`, `ETSY_TAGS_MAX`, `ETSY_TAG_MAX_LENGTH`
  - `normaliseEtsyTag(tag: string): string | null`
  - `etsyListingSchema`
  - `type EtsyListingCopy = { title: string; description: string; tags: string[] }`
  - `Design.etsyListing?: EtsyListingCopy`

- [ ] **Step 1: Write the failing test**

```ts
// packages/api/src/domain/EtsyListingCopyService/normaliseEtsyTag.test.ts
import { describe, expect, it } from 'bun:test';
import { ETSY_TAG_MAX_LENGTH, normaliseEtsyTag } from '@jewellery-catalogue/types';

describe('normaliseEtsyTag', () => {
    it('lowercases, collapses whitespace and replaces disallowed characters with spaces', () => {
        expect(normaliseEtsyTag('  Boho/Hippie   Earrings! ')).toBe('boho hippie earrings');
    });

    it("keeps hyphens and apostrophes", () => {
        expect(normaliseEtsyTag("Mother's Day rose-gold")).toBe("mother's day rose-gold");
    });

    it('accepts a tag of exactly the max length and rejects one character more', () => {
        expect(normaliseEtsyTag('a'.repeat(ETSY_TAG_MAX_LENGTH))).toBe('a'.repeat(ETSY_TAG_MAX_LENGTH));
        expect(normaliseEtsyTag('a'.repeat(ETSY_TAG_MAX_LENGTH + 1))).toBeNull();
    });

    it('rejects tags that are empty after cleaning', () => {
        expect(normaliseEtsyTag(' !!! ')).toBeNull();
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd packages/api && bun test src/domain/EtsyListingCopyService/normaliseEtsyTag.test.ts`
Expected: FAIL, because `normaliseEtsyTag` is not exported.

- [ ] **Step 3: Implement**

```ts
// packages/types/src/etsyListing/index.ts
import { z } from 'zod';

export const ETSY_TITLE_MAX = 140;
export const ETSY_TAGS_MAX = 13;
export const ETSY_TAG_MAX_LENGTH = 20;

// Etsy tags may only contain letters, numbers, whitespace, -, ', ™, © and ®.
const ETSY_TAG_DISALLOWED = /[^\p{L}\p{N}\s\-'™©®]/gu;
const ETSY_TAG_PATTERN = /^[\p{L}\p{N} \-'™©®]+$/u;

/** Cleans a tag to Etsy's rules; null when nothing valid is left or it is too long. */
export const normaliseEtsyTag = (tag: string): string | null => {
    const cleaned = tag.toLowerCase().replace(ETSY_TAG_DISALLOWED, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.length > 0 && cleaned.length <= ETSY_TAG_MAX_LENGTH ? cleaned : null;
};

export const etsyTagSchema = z.string().min(1).max(ETSY_TAG_MAX_LENGTH).regex(ETSY_TAG_PATTERN);

export const etsyListingSchema = z.object({
    title: z.string().trim().min(1).max(ETSY_TITLE_MAX),
    description: z.string().trim().min(1),
    tags: z.array(etsyTagSchema).max(ETSY_TAGS_MAX),
});

export type EtsyListingCopy = z.infer<typeof etsyListingSchema>;
```

In `packages/types/src/index.ts`, add `export * from './etsyListing/index';` after the `etsyConnection` line.

In `packages/types/src/design/index.ts`, add `import { etsyListingSchema } from '../etsyListing';` and this field after `etsy: designEtsySchema.optional(),`:

```ts
    etsyListing: etsyListingSchema.optional(),
```

- [ ] **Step 4: Run the test and make sure it passes**

Run: `cd packages/api && bun test src/domain/EtsyListingCopyService/normaliseEtsyTag.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/types/src packages/api/src/domain/EtsyListingCopyService/normaliseEtsyTag.test.ts
git commit -m "feat(types): etsy listing copy schema and tag normaliser"
```

---

### Task 2: Prompt, facts block and reply sanitiser (pure)

**Files:**
- Create: `packages/api/src/domain/EtsyListingCopyService/prompt.ts`
- Test: `packages/api/src/domain/EtsyListingCopyService/prompt.test.ts`

**Interfaces:**
- Consumes: Task 1 exports.
- Produces:
  - `LISTING_SYSTEM_PROMPT: string`
  - `buildListingPrompt(design: Design, photoCount: number): string`
  - `sanitiseListingCopy(raw: { title: string; description: string; tags: string[] }): EtsyListingCopy`
  - `listingCopyReplySchema: ZodType<EtsyListingCopy>` (a raw object, then transform, then refine non-empty)

- [ ] **Step 1: Write the failing tests**

```ts
// packages/api/src/domain/EtsyListingCopyService/prompt.test.ts
import { describe, expect, it } from 'bun:test';
import { type Design, DesignType, ETSY_TAGS_MAX, ETSY_TITLE_MAX, type RequiredMaterial } from '@jewellery-catalogue/types';

import { buildListingPrompt, listingCopyReplySchema, sanitiseListingCopy } from './prompt';

const bead = {
    id: 'b1', userId: 'u', name: 'Amethyst round bead', brand: 'x', purchaseUrl: '', type: 'BEAD',
    dateAdded: new Date(), diameter: 6, colour: 'purple', quantityPerPack: 10, pricePerPack: 2,
    totalQuantity: 10, pricePerBead: 0.2, requiredQuantity: 2,
} as unknown as RequiredMaterial;
const chain = {
    id: 'c1', userId: 'u', name: 'Fine curb chain', brand: 'x', purchaseUrl: '', type: 'CHAIN',
    dateAdded: new Date(), metalType: 'SILVER', wireType: 'PLATED', diameter: 1.5, lengthPerPack: 5,
    pricePerPack: 3, totalLength: 5, requiredLength: 45,
} as unknown as RequiredMaterial;

const design = (overrides: Partial<Design> = {}): Design => ({
    id: 'd1', userId: 'u', name: 'Lilac drop', timeRequired: '01:00', materials: [bead, chain],
    imageIds: ['i1'], diagramImageIds: [], makingNotes: 'secret notes', price: 42.5,
    description: '<p>Hand <strong>wrapped</strong>.</p>', totalMaterialCosts: 3, dateAdded: new Date(),
    totalQuantity: 1, designType: DesignType.NECKLACE, ...overrides,
});

describe('buildListingPrompt', () => {
    it('includes type, plain-text description and material facts with units', () => {
        const prompt = buildListingPrompt(design(), 1);
        expect(prompt).toContain('Item type: necklace');
        expect(prompt).toContain('Hand wrapped.');
        expect(prompt).toContain('colour purple, 6mm diameter');
        expect(prompt).toContain('silver plated');
        expect(prompt).toContain('45cm of chain');
        expect(prompt).toContain('Photos attached: 1');
    });

    it('never leaks price or private making notes', () => {
        const prompt = buildListingPrompt(design(), 0);
        expect(prompt).not.toContain('42.5');
        expect(prompt).not.toContain('secret notes');
    });

    it('lists variation options by group', () => {
        const prompt = buildListingPrompt(
            design({ variationGroups: [{ id: 'g', name: 'Stone', required: 0, options: [{ id: 'o', material: bead }] }] }),
            0
        );
        expect(prompt).toContain('Stone: Amethyst round bead');
    });
});

describe('sanitiseListingCopy', () => {
    it('cuts an over-long title at a word boundary within the limit', () => {
        const words = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
        const { title } = sanitiseListingCopy({ title: words, description: 'd', tags: [] });
        expect(title.length).toBeLessThanOrEqual(ETSY_TITLE_MAX);
        expect(words.startsWith(title)).toBe(true);
        expect(words.charAt(title.length)).toBe(' ');
    });

    it('leaves a title of exactly the max length untouched', () => {
        const title = 'a'.repeat(ETSY_TITLE_MAX);
        expect(sanitiseListingCopy({ title, description: 'd', tags: [] }).title).toBe(title);
    });

    it('keeps only the first of each %, : and & in the title', () => {
        const { title } = sanitiseListingCopy({ title: 'Ring & Band & Gift: Silver: 925', description: 'd', tags: [] });
        expect(title).toBe('Ring & Band Gift: Silver 925');
    });

    it('normalises, dedupes, drops invalid tags and caps at 13', () => {
        const tags = ['Silver Necklace', 'silver necklace', 'x'.repeat(21), ...Array.from({ length: 20 }, (_, i) => `tag ${i}`)];
        const result = sanitiseListingCopy({ title: 't', description: 'd', tags });
        expect(result.tags[0]).toBe('silver necklace');
        expect(result.tags).toHaveLength(ETSY_TAGS_MAX);
        expect(new Set(result.tags).size).toBe(ETSY_TAGS_MAX);
        expect(result.tags.every((t) => t.length <= 20)).toBe(true);
    });

    it('normalises description line endings and blank-line runs', () => {
        const { description } = sanitiseListingCopy({ title: 't', description: ' a\r\n\r\n\r\n\r\nb ', tags: [] });
        expect(description).toBe('a\n\nb');
    });
});

describe('listingCopyReplySchema', () => {
    it('rejects a reply whose title is empty after cleaning', () => {
        expect(listingCopyReplySchema.safeParse({ title: '  ', description: 'd', tags: [] }).success).toBe(false);
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `cd packages/api && bun test src/domain/EtsyListingCopyService/prompt.test.ts`
Expected: FAIL, because `./prompt` doesn't exist.

- [ ] **Step 3: Implement**

`packages/api` does not depend on `zod` directly yet (it is only pulled in through `@jewellery-catalogue/types`). Add it at the same major version: `cd packages/api && bun add zod@^4.1.12`. Then:

```ts
// packages/api/src/domain/EtsyListingCopyService/prompt.ts
import {
    type Design,
    DesignType,
    ETSY_TAG_MAX_LENGTH,
    ETSY_TAGS_MAX,
    ETSY_TITLE_MAX,
    type EtsyListingCopy,
    htmlToPlainText,
    MaterialType,
    METAL_TYPE,
    normaliseEtsyTag,
    type RequiredMaterial,
    WIRE_TYPE,
} from '@jewellery-catalogue/types';
import { z } from 'zod';

const DESIGN_TYPE_LABEL: Record<DesignType, string> = {
    [DesignType.EARRINGS]: 'earrings',
    [DesignType.EARCUFF]: 'ear cuff',
    [DesignType.RING]: 'ring',
    [DesignType.NECKLACE]: 'necklace',
    [DesignType.BRACELET]: 'bracelet',
};

// FULL is deliberately just the metal name: "solid silver" is a hallmarking claim we can't verify.
const metalLabel = (wireType: WIRE_TYPE, metalType: METAL_TYPE): string => {
    const metal = metalType.toLowerCase();
    if (wireType === WIRE_TYPE.FILLED) return `${metal} filled`;
    if (wireType === WIRE_TYPE.PLATED) return `${metal} plated`;
    return metal;
};

const describeMaterial = (m: RequiredMaterial): string => {
    switch (m.type) {
        case MaterialType.BEAD:
            return `Bead: ${m.name} — colour ${m.colour}, ${m.diameter}mm diameter, ${m.requiredQuantity} used`;
        case MaterialType.WIRE:
            return `Wire: ${m.name} — ${metalLabel(m.wireType, m.metalType)}, ${m.diameter}mm thick (${m.requiredLength}cm of wire used to make it; not a finished size)`;
        case MaterialType.CHAIN:
            return `Chain: ${m.name} — ${metalLabel(m.wireType, m.metalType)}, ${m.diameter}mm links, ${m.requiredLength}cm of chain used`;
        case MaterialType.EAR_HOOK:
            return `Ear hooks: ${m.name} — ${metalLabel(m.wireType, m.metalType)}`;
    }
};

export const buildListingPrompt = (design: Design, photoCount: number): string => {
    const lines = [
        `Item name: ${design.name}`,
        `Item type: ${design.designType ? DESIGN_TYPE_LABEL[design.designType] : 'jewellery (type not set)'}`,
        `Maker's description: ${htmlToPlainText(design.description).trim() || '(none)'}`,
        'Materials:',
        ...(design.materials.length > 0 ? design.materials.map((m) => `- ${describeMaterial(m)}`) : ['- (none recorded)']),
    ];

    const groups = design.variationGroups ?? [];
    if (groups.length > 0) {
        lines.push('Variations offered:');
        for (const group of groups) {
            lines.push(`- ${group.name}: ${group.options.map((o) => o.material.name).join(', ')}`);
        }
    }

    lines.push(`Photos attached: ${photoCount}`);
    lines.push('', 'Write the Etsy listing JSON for this item.');
    return lines.join('\n');
};

export const LISTING_SYSTEM_PROMPT = `You are an Etsy SEO copywriter for a small UK shop selling handmade jewellery. Write in British English.

Use ONLY the facts provided and what is clearly visible in the photos. Never invent gemstones, metals, hallmarks, sizes or measurements. If a bead's material is not stated, describe its colour and shape instead of naming a stone. The chain length used is a fair approximate length for necklaces and bracelets; otherwise only state sizes that appear in the facts.

Return ONLY a JSON object, no markdown or prose: {"title": string, "description": string, "tags": string[]}

title:
- At most ${ETSY_TITLE_MAX} characters. Put the phrase a shopper would search first, e.g. "Silver Wire Wrapped Amethyst Drop Earrings".
- Then material, colour, style and gift context, reading naturally. No keyword stuffing, no repeated words, no ALL CAPS.
- Use at most one each of the characters % : &.

tags:
- Exactly ${ETSY_TAGS_MAX} distinct tags, each at most ${ETSY_TAG_MAX_LENGTH} characters including spaces.
- Only letters, numbers, spaces, hyphens and apostrophes.
- Multi-word phrases shoppers type: item type, material, colour, style, stone or bead, occasion and recipient (e.g. "gift for her").
- Don't just repeat the title word for word.

description (plain text, no markdown, no emoji):
- First 1-2 sentences: a hook containing the main search keywords.
- Then a details section: materials, colours, approximate size only if known, and the variations offered.
- End with a short care note and a handmade / gift-ready note.`;

const truncateAtWord = (text: string, max: number): string => {
    if (text.length <= max) return text;
    const lastSpace = text.slice(0, max + 1).lastIndexOf(' ');
    const cut = lastSpace > 0 ? text.slice(0, lastSpace) : text.slice(0, max);
    return cut.replace(/[\s,|:&-]+$/, '');
};

const keepFirstSpecialChars = (title: string): string => {
    const seen = new Set<string>();
    return title.replace(/[%:&]/g, (ch) => {
        if (seen.has(ch)) return ' ';
        seen.add(ch);
        return ch;
    });
};

export const sanitiseListingCopy = (raw: { title: string; description: string; tags: string[] }): EtsyListingCopy => {
    const tags: string[] = [];
    for (const candidate of raw.tags) {
        const tag = normaliseEtsyTag(candidate);
        if (!tag || tags.includes(tag)) continue;
        tags.push(tag);
        if (tags.length === ETSY_TAGS_MAX) break;
    }

    return {
        title: truncateAtWord(keepFirstSpecialChars(raw.title).replace(/\s+/g, ' ').trim(), ETSY_TITLE_MAX),
        description: raw.description.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim(),
        tags,
    };
};

export const listingCopyReplySchema = z
    .object({ title: z.string(), description: z.string(), tags: z.array(z.string()) })
    .transform(sanitiseListingCopy)
    .refine((copy) => copy.title.length > 0 && copy.description.length > 0, {
        message: 'title and description must be non-empty',
    });
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `cd packages/api && bun test src/domain/EtsyListingCopyService/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/domain/EtsyListingCopyService packages/api/package.json bun.lock
git commit -m "feat(api): etsy listing prompt, facts block and reply sanitiser"
```

---

### Task 3: FalVisionClient + config

**Files:**
- Create: `packages/api/src/infrastructure/FalVisionClient/index.ts`, `packages/api/src/domain/EtsyListingCopyService/types.ts`
- Modify: `packages/api/src/config/index.ts`, `.env.example`
- Test: `packages/api/src/infrastructure/FalVisionClient/index.test.ts`

**Interfaces:**
- Produces, in `domain/EtsyListingCopyService/types.ts` (the domain owns the port; infrastructure implements it):

```ts
import type { ZodType } from 'zod';

export interface VisionCompletionOptions<T> {
    /** Identifies the call in logs, e.g. 'etsy.listingCopy'. */
    operation: string;
    schema: ZodType<T>;
    system: string;
    prompt: string;
    /** data: URIs or public URLs; empty means a text-only call. */
    imageUrls: string[];
}

export interface VisionLlm {
    isConfigured(): boolean;
    completeStructured<T>(opts: VisionCompletionOptions<T>): Promise<T>;
}
```

- `class FalVisionClient implements VisionLlm`. Its constructor is `(apiKey: string, logger?: Logger, model?: string)`.
- Config keys: `falKey` (optional), `falModel` (optional).

- [ ] **Step 1: Write the failing tests**

```ts
// packages/api/src/infrastructure/FalVisionClient/index.test.ts
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
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `cd packages/api && bun test src/infrastructure/FalVisionClient`
Expected: FAIL, because the module doesn't exist.

- [ ] **Step 3: Implement**

Create `domain/EtsyListingCopyService/types.ts` with the interface block above. Then:

```ts
// packages/api/src/infrastructure/FalVisionClient/index.ts
import type { Logger } from '@imapps/api-utils';
import { APIError } from '@imapps/api-utils/hono';
import type { ZodError } from 'zod';

import type { VisionCompletionOptions, VisionLlm } from '../../domain/EtsyListingCopyService/types';

const FAL_VISION_URL = 'https://fal.run/openrouter/router/vision';
const FAL_TEXT_URL = 'https://fal.run/openrouter/router';
export const DEFAULT_FAL_MODEL = 'google/gemini-2.5-flash';
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
```

In `config/index.ts`, add after `webAppUrl`:

```ts
    falKey: { parser: parsers.string, from: 'FAL_KEY', optional: true },
    falModel: { parser: parsers.string, from: 'FAL_MODEL', optional: true },
```

(Shoppingo uses the same `optional: true` with `@imapps/api-utils` `ConfigService`.) In `.env.example`, append:

```
FAL_KEY=
FAL_MODEL=google/gemini-2.5-flash
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `cd packages/api && bun test src/infrastructure/FalVisionClient`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/infrastructure/FalVisionClient packages/api/src/domain/EtsyListingCopyService/types.ts packages/api/src/config/index.ts .env.example
git commit -m "feat(api): fal.ai vision client for structured listing copy"
```

---

### Task 4: EtsyListingCopyService, route and DI

**Files:**
- Create: `packages/api/src/domain/EtsyListingCopyService/index.ts`, `packages/api/src/utils/streamToBuffer.ts`
- Modify:
  - `packages/api/src/domain/EtsyPushService/index.ts` (import the moved `streamToBuffer`; delete its local copy at lines 13-19)
  - `packages/api/src/dependencies/types.ts`
  - `packages/api/src/dependencies/index.ts`
  - `packages/api/src/handlers/Etsy/index.ts`
  - `packages/api/src/routes/index.ts`
- Test: `packages/api/src/domain/EtsyListingCopyService/index.test.ts`

**Interfaces:**
- Consumes:
  - `VisionLlm` (Task 3)
  - `buildListingPrompt`, `LISTING_SYSTEM_PROMPT`, `listingCopyReplySchema` (Task 2)
  - `ImageService.getImage(name) → { stream, contentType }`
  - `DesignRepository.getByIdAndUserId`
- Produces:
  - `EtsyListingCopyService.generate(designId: string, userId: string): Promise<EtsyListingCopy>`
  - `MAX_LISTING_PHOTOS = 3`
  - `streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer>`
  - `DependencyToken.EtsyListingCopyService` and `DependencyToken.VisionLlm`
  - route `POST /api/designs/:id/etsy-listing/generate` → `200 EtsyListingCopy`

- [ ] **Step 1: Write the failing tests**

```ts
// packages/api/src/domain/EtsyListingCopyService/index.test.ts
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Readable } from 'node:stream';
import type { Design } from '@jewellery-catalogue/types';

import type { DesignRepository } from '../DesignRepository';
import type { ImageService } from '../ImageService';
import { EtsyListingCopyService, MAX_LISTING_PHOTOS } from './index';
import type { VisionLlm } from './types';

const designRepo = { getByIdAndUserId: mock() };
const imageService = { getImage: mock() };
const vision = { isConfigured: mock(() => true), completeStructured: mock() };

const design = (overrides: Partial<Design> = {}): Design => ({
    id: 'd1', userId: 'u1', name: 'Lilac drop', timeRequired: '01:00', materials: [],
    imageIds: ['a', 'b', 'c', 'd'], diagramImageIds: ['diagram'], makingNotes: '', price: 10,
    description: '', totalMaterialCosts: 1, dateAdded: new Date(), totalQuantity: 1, ...overrides,
});

const copy = { title: 'Lilac Drop Necklace', description: 'Pretty.', tags: ['lilac necklace'] };

describe('EtsyListingCopyService', () => {
    let service: EtsyListingCopyService;

    beforeEach(() => {
        for (const m of [designRepo.getByIdAndUserId, imageService.getImage, vision.completeStructured]) m.mockReset();
        vision.isConfigured.mockImplementation(() => true);
        imageService.getImage.mockImplementation(async (name: string) => ({
            stream: Readable.from([Buffer.from(`bytes-${name}`)]),
            contentType: 'image/jpeg',
            cacheControl: 'public',
        }));
        vision.completeStructured.mockResolvedValue(copy);
        service = new EtsyListingCopyService(
            designRepo as unknown as DesignRepository,
            imageService as unknown as ImageService,
            vision as unknown as VisionLlm
        );
    });

    it('sends at most 3 product photos as base64 data URIs and returns the copy', async () => {
        designRepo.getByIdAndUserId.mockResolvedValue(design());

        const result = await service.generate('d1', 'u1');

        expect(result).toEqual(copy);
        expect(designRepo.getByIdAndUserId).toHaveBeenCalledWith('d1', 'u1');
        const opts = vision.completeStructured.mock.calls[0][0];
        expect(opts.imageUrls).toHaveLength(MAX_LISTING_PHOTOS);
        expect(opts.imageUrls[0]).toBe(`data:image/jpeg;base64,${Buffer.from('bytes-a').toString('base64')}`);
        expect(imageService.getImage).not.toHaveBeenCalledWith('diagram');
        expect(opts.prompt).toContain('Photos attached: 3');
    });

    it('skips photos that fail to load and still generates', async () => {
        designRepo.getByIdAndUserId.mockResolvedValue(design({ imageIds: ['missing', 'b'] }));
        imageService.getImage.mockImplementationOnce(async () => {
            throw Object.assign(new Error('Image not found'), { status: 404 });
        });

        await service.generate('d1', 'u1');

        expect(vision.completeStructured.mock.calls[0][0].imageUrls).toHaveLength(1);
    });

    it('404s for a design the user does not own', async () => {
        designRepo.getByIdAndUserId.mockResolvedValue(null);

        await expect(service.generate('d1', 'other')).rejects.toMatchObject({ status: 404 });
        expect(vision.completeStructured).not.toHaveBeenCalled();
    });

    it('503s without touching the design when AI is not configured', async () => {
        vision.isConfigured.mockImplementation(() => false);

        await expect(service.generate('d1', 'u1')).rejects.toMatchObject({ status: 503 });
        expect(designRepo.getByIdAndUserId).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `cd packages/api && bun test src/domain/EtsyListingCopyService/index.test.ts`
Expected: FAIL, because the module doesn't exist.

- [ ] **Step 3: Implement**

```ts
// packages/api/src/utils/streamToBuffer.ts
export async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBufferLike));
    }
    return Buffer.concat(chunks);
}
```

In `EtsyPushService/index.ts`, delete the local `streamToBuffer` (lines 13-19) and add `import { streamToBuffer } from '../../utils/streamToBuffer';`.

```ts
// packages/api/src/domain/EtsyListingCopyService/index.ts
import type { Logger } from '@imapps/api-utils';
import { APIError } from '@imapps/api-utils/hono';
import type { EtsyListingCopy } from '@jewellery-catalogue/types';

import { streamToBuffer } from '../../utils/streamToBuffer';
import type { DesignRepository } from '../DesignRepository';
import type { ImageService } from '../ImageService';
import { buildListingPrompt, LISTING_SYSTEM_PROMPT, listingCopyReplySchema } from './prompt';
import type { VisionLlm } from './types';

export const MAX_LISTING_PHOTOS = 3;

export class EtsyListingCopyService {
    constructor(
        private readonly designRepo: DesignRepository,
        private readonly imageService: ImageService,
        private readonly vision: VisionLlm,
        private readonly logger?: Logger
    ) {}

    async generate(designId: string, userId: string): Promise<EtsyListingCopy> {
        if (!this.vision.isConfigured()) {
            throw new APIError('AI generation is not configured', 503);
        }

        const design = await this.designRepo.getByIdAndUserId(designId, userId);
        if (!design) {
            throw new APIError('Design not found', 404);
        }

        const imageUrls = await this.loadPhotos(design.imageIds.slice(0, MAX_LISTING_PHOTOS));

        return this.vision.completeStructured({
            operation: 'etsy.listingCopy',
            schema: listingCopyReplySchema,
            system: LISTING_SYSTEM_PROMPT,
            prompt: buildListingPrompt(design, imageUrls.length),
            imageUrls,
        });
    }

    // The bucket is private, so fal cannot fetch our URLs; photos go inline as data URIs.
    private async loadPhotos(imageIds: string[]): Promise<string[]> {
        const urls: string[] = [];
        for (const imageId of imageIds) {
            try {
                const image = await this.imageService.getImage(imageId);
                const buffer = await streamToBuffer(image.stream);
                urls.push(`data:${image.contentType};base64,${buffer.toString('base64')}`);
            } catch (error) {
                this.logger?.warn('Skipping listing photo that failed to load', {
                    imageId,
                    message: (error as Error).message,
                });
            }
        }
        return urls;
    }
}
```

In `dependencies/types.ts`:
- Import `EtsyListingCopyService` and the `VisionLlm` type.
- Add `EtsyListingCopyService = 'EtsyListingCopyService'` under Services and `VisionLlm = 'VisionLlm'` under Infrastructure.
- Add the matching entries to `Dependencies`.

In `dependencies/index.ts`, after the `EtsyPushService` registration:

```ts
    dependencyContainer.registerSingleton(
        DependencyToken.VisionLlm,
        class {
            constructor() {
                return new FalVisionClient(
                    config.get('falKey') ?? '',
                    dependencyContainer.resolve(DependencyToken.Logger),
                    config.get('falModel') || undefined
                );
            }
        } as any
    );

    dependencyContainer.registerSingleton(
        DependencyToken.EtsyListingCopyService,
        class {
            constructor() {
                return new EtsyListingCopyService(
                    dependencyContainer.resolve(DependencyToken.DesignRepository),
                    dependencyContainer.resolve(DependencyToken.ImageService),
                    dependencyContainer.resolve(DependencyToken.VisionLlm),
                    dependencyContainer.resolve(DependencyToken.Logger)
                );
            }
        } as any
    );
```

Also import `FalVisionClient` from `'../infrastructure/FalVisionClient'` and `EtsyListingCopyService` from `'../domain/EtsyListingCopyService'`. If `dependencies/index.test.ts` asserts the full list of registered tokens, add the two new tokens there.

In `handlers/Etsy/index.ts`, after `pushDesignToEtsy`:

```ts
export const generateEtsyListingCopy = async (c: AuthedCtx) => {
    const service = dependencyContainer.resolve(DependencyToken.EtsyListingCopyService);
    const copy = await service.generate(c.req.param('id'), c.get('userId'));
    return c.json(copy, 200);
};
```

In `routes/index.ts`, import `generateEtsyListingCopy` and add this after the etsy-push route:

```ts
    app.post('/api/designs/:id/etsy-listing/generate', authenticate, generateEtsyListingCopy);
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `cd packages/api && bun test src/domain/EtsyListingCopyService src/domain/EtsyPushService src/dependencies`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src
git commit -m "feat(api): generate etsy listing copy endpoint"
```

---

### Task 5: Push sends title and tags and persists etsyListing

**Files:**
- Modify:
  - `packages/api/src/domain/EtsyClient/index.ts` (`EtsyDraftListingInput` lines 22-33, `createDraftListing` body lines 356-368)
  - `packages/api/src/domain/EtsyPushService/mappers.ts:21-39`
  - `packages/api/src/domain/EtsyPushService/index.ts:30-116`
  - `packages/api/src/handlers/Etsy/index.ts:63-81`
- Test: `EtsyClient/index.test.ts`, `EtsyPushService/mappers.test.ts`, `EtsyPushService/index.test.ts`

**Interfaces:**
- Consumes: `etsyListingSchema`, `EtsyListingCopy` (Task 1).
- Produces:
  - `EtsyDraftListingInput.tags?: string[]`
  - `buildDraftListingInput({ design: Pick<Design,'totalQuantity'>, title, description, tags, price, taxonomyId, shippingProfileId, readinessStateId })`
  - `EtsyPushService.push(designId, userId, overrides: { title?: string; description?: string; tags?: string[]; price?: number })`
  - the push handler returns 400 on an invalid `title` or `tags`

- [ ] **Step 1: Write the failing tests**

In `EtsyClient/index.test.ts`, inside `describe('createDraftListing')`:

```ts
        it('sends tags only when there are some', async () => {
            fetchMock.mockResolvedValue(new Response(JSON.stringify({ listing_id: 1 }), { status: 200 }));
            const base = {
                title: 't', description: 'd', price: 1, quantity: 1, whoMade: 'i_did', whenMade: 'made_to_order',
                isSupply: false, taxonomyId: 1, shippingProfileId: 1, readinessStateId: 1,
            };

            await client.createDraftListing('at', 1, { ...base, tags: ['silver ring', 'gift for her'] });
            await client.createDraftListing('at', 1, { ...base, tags: [] });

            const withTags = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
            const withoutTags = JSON.parse((fetchMock.mock.calls[1] as [string, RequestInit])[1].body as string);
            expect(withTags.tags).toEqual(['silver ring', 'gift for her']);
            expect('tags' in withoutTags).toBe(false);
        });
```

In `EtsyPushService/mappers.test.ts`, update both `buildDraftListingInput` calls. Change `design` to `{ totalQuantity: 3 }` / `{ totalQuantity: 0 }`, and add `title: 'Silver Ring'` / `title: 'Ring'` and `tags: []`. In the first test's expected object, add `tags: []`.

In `EtsyPushService/index.test.ts`, add:

```ts
    describe('push — listing copy', () => {
        it('sends title/tags overrides to Etsy and persists them as etsyListing', async () => {
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(makeDesign());
            mockEtsyClient.createDraftListing.mockResolvedValue({ listingId: 999 });

            const result = await service.push('design-1', 'user-1', {
                title: 'Silver Wire Ring',
                description: 'Edited',
                tags: ['silver ring'],
            });

            expect(mockEtsyClient.createDraftListing).toHaveBeenCalledWith(
                'at-token',
                47408839,
                expect.objectContaining({ title: 'Silver Wire Ring', description: 'Edited', tags: ['silver ring'] })
            );
            expect(result.etsyListing).toEqual({ title: 'Silver Wire Ring', description: 'Edited', tags: ['silver ring'] });
            expect(mockDesignRepo.update).toHaveBeenLastCalledWith(
                'design-1',
                expect.objectContaining({ etsyListing: result.etsyListing })
            );
        });

        it('falls back to saved etsyListing, then to name/template with no tags', async () => {
            const saved = { title: 'Saved Title', description: 'Saved desc', tags: ['saved tag'] };
            mockDesignRepo.getByIdAndUserId.mockResolvedValueOnce(makeDesign({ etsyListing: saved }));
            mockEtsyClient.createDraftListing.mockResolvedValue({ listingId: 1 });
            await service.push('design-1', 'user-1');
            expect(mockEtsyClient.createDraftListing).toHaveBeenLastCalledWith(
                'at-token', 47408839, expect.objectContaining(saved)
            );

            mockDesignRepo.getByIdAndUserId.mockResolvedValueOnce(makeDesign());
            await service.push('design-1', 'user-1');
            expect(mockEtsyClient.createDraftListing).toHaveBeenLastCalledWith(
                'at-token', 47408839, expect.objectContaining({ title: 'Silver Ring', description: 'A lovely ring.', tags: [] })
            );
        });

        it('keeps the saved etsyListing when resuming an incomplete push', async () => {
            const saved = { title: 'Saved', description: 'd', tags: [] };
            mockDesignRepo.getByIdAndUserId.mockResolvedValue(
                makeDesign({ etsyListing: saved, etsy: { listingId: 5, state: 'draft', lastPushedAt: null, pushIncomplete: true } })
            );

            const result = await service.push('design-1', 'user-1', { title: 'Ignored on resume' });

            expect(mockEtsyClient.createDraftListing).not.toHaveBeenCalled();
            expect(result.etsyListing).toEqual(saved);
        });
    });
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `cd packages/api && bun test src/domain/EtsyClient src/domain/EtsyPushService`
Expected: FAIL. The new tests fail; the mapper tests fail on the `title`/`tags` args (type) and the expected `tags`.

- [ ] **Step 3: Implement**

In `EtsyClient/index.ts`, add `tags?: string[];` to `EtsyDraftListingInput` after `description`. In the `createDraftListing` body, add after `readiness_state_id`:

```ts
                ...(input.tags && input.tags.length > 0 ? { tags: input.tags } : {}),
```

Replace `buildDraftListingInput` in `mappers.ts`:

```ts
export const buildDraftListingInput = (args: {
    design: Pick<Design, 'totalQuantity'>;
    title: string;
    description: string;
    tags: string[];
    price: number;
    taxonomyId: number;
    shippingProfileId: number;
    readinessStateId: number;
}): EtsyDraftListingInput => ({
    title: args.title,
    description: args.description,
    tags: args.tags,
    price: args.price,
    quantity: Math.max(1, args.design.totalQuantity),
    whoMade: 'i_did',
    whenMade: 'made_to_order',
    isSupply: false,
    taxonomyId: args.taxonomyId,
    shippingProfileId: args.shippingProfileId,
    readinessStateId: args.readinessStateId,
});
```

In `EtsyPushService/index.ts`:
- Change the overrides type to `{ title?: string; description?: string; tags?: string[]; price?: number }`.
- Import `type EtsyListingCopy` from `@jewellery-catalogue/types`.
- Before `let listingId`, add `let etsyListing: EtsyListingCopy | undefined = design.etsyListing;`.
- Inside `if (!listingId)`, replace the `description`/`price`/`draftInput`/`update` block with:

```ts
            const saved = design.etsyListing;
            etsyListing = {
                title: overrides.title ?? saved?.title ?? design.name,
                description:
                    overrides.description ??
                    saved?.description ??
                    renderDescriptionTemplate(settings.etsyDescriptionTemplate, design),
                tags: overrides.tags ?? saved?.tags ?? [],
            };
            const price = overrides.price ?? design.price;

            const draftInput = buildDraftListingInput({
                design,
                ...etsyListing,
                price,
                taxonomyId,
                shippingProfileId,
                readinessStateId,
            });
            const created = await this.etsyClient.createDraftListing(accessToken, shopId, draftInput);
            listingId = created.listingId;

            await this.designRepo.update(designId, {
                ...design,
                etsyListing,
                etsy: { listingId, state: 'draft', lastPushedAt: null, pushIncomplete: true },
            });
```

- Replace the final `updated` with:

```ts
        const updated: Design = {
            ...design,
            ...(etsyListing ? { etsyListing } : {}),
            etsy: { listingId, state: 'draft', lastPushedAt: Date.now(), pushIncomplete: false },
        };
```

In `handlers/Etsy/index.ts`, validate the push body:

```ts
const pushOverridesSchema = z.object({
    title: etsyListingSchema.shape.title.optional(),
    description: z.string().optional(),
    tags: etsyListingSchema.shape.tags.optional(),
    price: z.number().nonnegative().optional(),
});

export const pushDesignToEtsy = async (c: AuthedCtx) => {
    const parsed = pushOverridesSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
        throw new APIError(`Invalid Etsy listing: ${parsed.error.issues.map((i) => i.message).join('; ')}`, 400);
    }

    try {
        const design = await getPushService().push(c.req.param('id'), c.get('userId'), parsed.data);
        return c.json(design, 200);
    } catch (err) {
        // ...existing logging + rethrow, unchanged
    }
};
```

The handler needs these imports: `import { APIError } from '@imapps/api-utils/hono';`, `import { etsyListingSchema } from '@jewellery-catalogue/types';`, `import { z } from 'zod';`.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `cd packages/api && bun test`
Expected: the full API unit suite passes.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src
git commit -m "feat(api): push etsy title and tags and persist listing copy"
```

---

### Task 6: Web endpoint, hooks and TagInput

**Files:**
- Create:
  - `packages/web/src/api/endpoints/etsyListingCopy/index.ts`
  - `packages/web/src/hooks/useGenerateEtsyListing.ts`
  - `packages/web/src/components/TagInput/index.tsx`
- Modify: `packages/web/src/api/endpoints/etsyPush/index.ts`, `packages/web/src/hooks/useEtsyPush.ts`
- Test: `packages/web/src/components/TagInput/index.test.tsx`

**Interfaces:**
- Consumes: `ETSY_TAGS_MAX`, `ETSY_TAG_MAX_LENGTH`, `normaliseEtsyTag`, `EtsyListingCopy`.
- Produces:
  - `makeGenerateEtsyListingRequest(designId, getAccessToken, onTokenRefresh, onTokenClear): Promise<EtsyListingCopy>`
  - `useGenerateEtsyListing(designId) → { generate: (vars: void, opts?: { onSuccess?: (copy: EtsyListingCopy) => void }) => void; isGenerating: boolean; generateError: Error | null; resetGenerate: () => void }`
  - `type EtsyPushOverrides = { title?: string; description?: string; tags?: string[]; price?: number }` (exported from the etsyPush endpoint)
  - `<TagInput id value onChange />`

- [ ] **Step 1: Write the failing test**

```tsx
// packages/web/src/components/TagInput/index.test.tsx
import { ETSY_TAGS_MAX } from '@jewellery-catalogue/types';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import TagInput from '.';

const Harness = ({ initial = [] as string[] }) => {
    const [tags, setTags] = useState(initial);
    return <TagInput id="tags" value={tags} onChange={setTags} />;
};

const add = (text: string) => {
    const input = screen.getByLabelText('Add tag');
    fireEvent.change(input, { target: { value: text } });
    fireEvent.keyDown(input, { key: 'Enter' });
};

describe('TagInput', () => {
    afterEach(cleanup);

    it('adds a normalised tag on Enter and ignores duplicates', () => {
        render(<Harness />);
        add('Silver Ring!');
        add('silver ring');
        expect(screen.getAllByText('silver ring')).toHaveLength(1);
        expect(screen.getByText('1/13')).toBeTruthy();
    });

    it('rejects a tag over 20 characters with a message and keeps the text', () => {
        render(<Harness />);
        add('a'.repeat(21));
        expect(screen.getByRole('alert').textContent).toContain('20 characters');
        expect((screen.getByLabelText('Add tag') as HTMLInputElement).value).toBe('a'.repeat(21));
    });

    it('disables input once 13 tags are present', () => {
        render(<Harness initial={Array.from({ length: ETSY_TAGS_MAX }, (_, i) => `tag ${i}`)} />);
        expect((screen.getByLabelText('Add tag') as HTMLInputElement).disabled).toBe(true);
    });

    it('removes a tag with its remove button', () => {
        render(<Harness initial={['boho', 'gift for her']} />);
        fireEvent.click(screen.getByRole('button', { name: 'Remove tag boho' }));
        expect(screen.queryByText('boho')).toBeNull();
        expect(screen.getByText('gift for her')).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd packages/web && bunx vitest run src/components/TagInput`
Expected: FAIL, because the module doesn't exist.

- [ ] **Step 3: Implement**

```tsx
// packages/web/src/components/TagInput/index.tsx
import { ETSY_TAG_MAX_LENGTH, ETSY_TAGS_MAX, normaliseEtsyTag } from '@jewellery-catalogue/types';
import { X } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface TagInputProps {
    id: string;
    value: string[];
    onChange: (tags: string[]) => void;
}

const TagInput: React.FC<TagInputProps> = ({ id, value, onChange }) => {
    const [draft, setDraft] = useState('');
    const [error, setError] = useState<string | null>(null);
    const full = value.length >= ETSY_TAGS_MAX;

    const commit = () => {
        if (!draft.trim()) return;
        const tag = normaliseEtsyTag(draft);
        if (!tag) {
            setError(`Tags must be 1–${ETSY_TAG_MAX_LENGTH} characters of letters, numbers, spaces, - or '.`);
            return;
        }
        if (!value.includes(tag)) onChange([...value, tag]);
        setDraft('');
        setError(null);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
        } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
            onChange(value.slice(0, -1));
        }
    };

    return (
        <div className="space-y-2">
            {value.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                    {value.map((tag) => (
                        <li key={tag}>
                            <Badge variant="secondary" className="gap-1 pr-1">
                                {tag}
                                <button
                                    type="button"
                                    aria-label={`Remove tag ${tag}`}
                                    className="rounded-sm p-0.5 hover:bg-muted"
                                    onClick={() => onChange(value.filter((t) => t !== tag))}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        </li>
                    ))}
                </ul>
            )}
            <div className="flex items-center gap-2">
                <Input
                    id={id}
                    aria-label="Add tag"
                    placeholder={full ? 'Tag limit reached' : 'Type a tag and press Enter'}
                    value={draft}
                    disabled={full}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={commit}
                />
                <span className="shrink-0 text-xs text-muted-foreground">
                    {value.length}/{ETSY_TAGS_MAX}
                </span>
            </div>
            {error && (
                <p role="alert" className="text-xs text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
};

export default TagInput;
```

Before writing this, confirm `lucide-react` is the icon library: `ViewDesign` imports `ExternalLink` from it.

```ts
// packages/web/src/api/endpoints/etsyListingCopy/index.ts
import { type EtsyListingCopy, MethodType } from '@jewellery-catalogue/types';

import { DESIGNS_ENDPOINT } from '../../endpoints';
import { makeRequestWithAutoRefresh } from '../../makeRequest';

export const makeGenerateEtsyListingRequest = (
    designId: string,
    getAccessToken: () => string,
    onTokenRefresh: (newToken: string) => void,
    onTokenClear: () => void
) =>
    makeRequestWithAutoRefresh<EtsyListingCopy>(
        {
            pathname: `${DESIGNS_ENDPOINT}/${designId}/etsy-listing/generate`,
            method: MethodType.POST,
            headers: { 'Content-Type': 'application/json' },
            operationString: 'generate etsy listing copy',
            body: {},
            accessToken: '',
        },
        getAccessToken,
        onTokenRefresh,
        onTokenClear
    );
```

```ts
// packages/web/src/hooks/useGenerateEtsyListing.ts
import { useAuth } from '@imapps/web-utils';
import { useMutation } from '@tanstack/react-query';

import { makeGenerateEtsyListingRequest } from '../api/endpoints/etsyListingCopy';

export const useGenerateEtsyListing = (designId: string) => {
    const { accessToken, login, logout } = useAuth();

    const mutation = useMutation({
        mutationFn: () => makeGenerateEtsyListingRequest(designId, () => accessToken, login, logout),
    });

    return {
        generate: mutation.mutate,
        isGenerating: mutation.isPending,
        generateError: mutation.error,
        resetGenerate: mutation.reset,
    };
};
```

In `api/endpoints/etsyPush/index.ts`, add `export type EtsyPushOverrides = { title?: string; description?: string; tags?: string[]; price?: number };` and use it as the `overrides` parameter type. In `useEtsyPush.ts`, change the `mutationFn` param type to `EtsyPushOverrides` (import it from the endpoint).

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `cd packages/web && bunx vitest run src/components/TagInput`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src
git commit -m "feat(web): tag input and listing copy generation hook"
```

---

### Task 7: EtsyPushDialog: title, tags and Generate with AI

**Files:**
- Modify: `packages/web/src/components/EtsyPushDialog/index.tsx`, `packages/web/tests/e2e/utils/api-helpers.ts:79-91`, `packages/web/tests/e2e/mocks/auth.ts`
- Test: `packages/web/tests/e2e/etsy-listing-copy.spec.ts`

**Interfaces:**
- Consumes:
  - `useGenerateEtsyListing` and `TagInput` (Task 6)
  - `EtsyPushOverrides`
  - `ETSY_TITLE_MAX`
  - `design.etsyListing` (Task 1)
  - the route from Task 4 and the push body from Task 5
- Produces: dialog fields with labels `Title`, `Description` and `Tags` (the TagInput input is labelled `Add tag`), and buttons `Generate with AI` and `Send to Etsy`.

- [ ] **Step 1: Write the failing e2e spec**

Add `export const MOCK_TOKEN_ETSY_LISTING_COPY = makeMockToken('68c6f0f5b97c94612901512e'); // etsy-listing-copy.spec` to `mocks/auth.ts` after `MOCK_TOKEN_TASK_CHECKLIST`. Add `designType?: string;` to `apiCreateDesign`'s `design` parameter type; the handler already reads `designType`.

```ts
// packages/web/tests/e2e/etsy-listing-copy.spec.ts
import type { Page, Request } from '@playwright/test';
import { expect, test } from './fixtures';
import { MOCK_TOKEN_ETSY_LISTING_COPY } from './mocks/auth';
import { apiCreateDesign } from './utils/api-helpers';

const TOKEN = MOCK_TOKEN_ETSY_LISTING_COPY;
test.use({ authToken: TOKEN });

const GENERATED = {
    title: 'Silver Wire Wrapped Amethyst Drop Earrings, Purple Boho Gift for Her',
    description: 'Handmade purple drop earrings.\n\nCare: keep dry.',
    tags: ['amethyst earrings', 'purple drop earrings', 'gift for her'],
};

async function mockEtsyReady(page: Page) {
    await page.route('**/api/etsy/connection', (route) =>
        route.fulfill({ json: { connected: true, shopName: 'Test Shop' } })
    );
    await page.route('**/api/user-settings', (route) =>
        route.request().method() === 'GET'
            ? route.fulfill({
                  json: {
                      userId: 'x', hourlyWage: 10, profitMargin: 10, markupMultiplier: 2, hourlyRate: 0,
                      etsyDescriptionTemplate: 'TEMPLATE: {description}',
                      etsyTaxonomyMap: { EARRINGS: 1234 },
                      etsyShippingProfileId: null,
                  },
              })
            : route.continue()
    );
}

async function openPushDialog(page: Page, name: string) {
    const design = await apiCreateDesign(TOKEN, { name, price: 20, designType: 'EARRINGS' });
    await page.goto(`/designs/${design.id}`);
    await page.getByRole('button', { name: 'Send to Etsy' }).click();
    return page.getByRole('dialog');
}

test.describe('Etsy listing copy', () => {
    test('generated copy is editable and the edits are what gets pushed @smoke', async ({ authenticatedPage: page }) => {
        await mockEtsyReady(page);
        await page.route('**/api/designs/*/etsy-listing/generate', (route) => route.fulfill({ json: GENERATED }));
        let pushRequest: Request | undefined;
        await page.route('**/api/designs/*/etsy-push', async (route) => {
            pushRequest = route.request();
            await route.fulfill({ json: { error: 'stop here' }, status: 500 });
        });

        const dialog = await openPushDialog(page, 'Copy Gen Earrings');
        await expect(dialog.getByLabel('Title')).toHaveValue('Copy Gen Earrings');

        await dialog.getByRole('button', { name: 'Generate with AI' }).click();
        await expect(dialog.getByLabel('Title')).toHaveValue(GENERATED.title);
        await expect(dialog.getByLabel('Description')).toHaveValue(GENERATED.description);
        await expect(dialog.getByText('3/13')).toBeVisible();

        await dialog.getByLabel('Title').fill('Amethyst Drop Earrings');
        await dialog.getByRole('button', { name: 'Remove tag gift for her' }).click();
        await dialog.getByLabel('Add tag').fill('Boho Jewellery');
        await dialog.getByLabel('Add tag').press('Enter');

        await dialog.getByRole('button', { name: 'Send to Etsy' }).click();
        await expect.poll(() => pushRequest).toBeDefined();
        expect(pushRequest?.postDataJSON()).toMatchObject({
            title: 'Amethyst Drop Earrings',
            description: GENERATED.description,
            tags: ['amethyst earrings', 'purple drop earrings', 'boho jewellery'],
            price: 20,
        });
    });

    test('a failed generation shows an error and keeps the template text', async ({ authenticatedPage: page }) => {
        await mockEtsyReady(page);
        await page.route('**/api/designs/*/etsy-listing/generate', (route) =>
            route.fulfill({ status: 503, json: { message: 'AI generation is not configured' } })
        );

        const dialog = await openPushDialog(page, 'Copy Gen Failure');
        await dialog.getByRole('button', { name: 'Generate with AI' }).click();

        await expect(dialog.getByText("AI generation isn't set up yet")).toBeVisible();
        await expect(dialog.getByLabel('Title')).toHaveValue('Copy Gen Failure');
        await expect(dialog.getByLabel('Description')).toHaveValue(/^TEMPLATE:/);
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Start the dev stack from `.kanban-cli.json` `dev.startCommand` if it isn't already running, then:
Run: `cd packages/web && bunx playwright test tests/e2e/etsy-listing-copy.spec.ts --project=chromium`
Expected: FAIL, because there's no `Title` field or `Generate with AI` button. (`chromium` is the functional project in `playwright.config.ts`; `*.visual.spec.ts` files run in `mobile-visual`/`desktop-visual`.)

- [ ] **Step 3: Implement the dialog**

Replace the body of `EtsyPushDialog` (keep `renderTemplate`):

```tsx
import { type Design, ETSY_TITLE_MAX, type EtsyListingCopy, htmlToPlainText } from '@jewellery-catalogue/types';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

import TagInput from '@/components/TagInput';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useEtsyPush } from '../../hooks/useEtsyPush';
import { useGenerateEtsyListing } from '../../hooks/useGenerateEtsyListing';
import { useUserSettings } from '../../hooks/useUserSettings';

// ...EtsyPushDialogProps and renderTemplate unchanged...

const generateErrorMessage = (error: Error): string =>
    error.message.includes('503')
        ? "AI generation isn't set up yet. Add FAL_KEY to the API to enable it."
        : "Couldn't generate the listing. Your text is unchanged; try again.";

const EtsyPushDialog: React.FC<EtsyPushDialogProps> = ({ design, open, onOpenChange }) => {
    const { etsyDescriptionTemplate, etsyTaxonomyMap } = useUserSettings();
    const { push, isPushing, pushError } = useEtsyPush(design.id);
    const { generate, isGenerating, generateError, resetGenerate } = useGenerateEtsyListing(design.id);

    const seed = (): EtsyListingCopy =>
        design.etsyListing ?? {
            title: design.name,
            description: renderTemplate(etsyDescriptionTemplate, design.description, design.materials),
            tags: [],
        };

    const [title, setTitle] = useState(() => seed().title);
    const [description, setDescription] = useState(() => seed().description);
    const [tags, setTags] = useState<string[]>(() => seed().tags);
    const [price, setPrice] = useState(design.price);

    const applyCopy = (copy: EtsyListingCopy) => {
        setTitle(copy.title);
        setDescription(copy.description);
        setTags(copy.tags);
    };

    // biome-ignore lint/correctness/useExhaustiveDependencies: only re-seed on open/design change, not on every template or materials change
    useEffect(() => {
        if (open) {
            applyCopy(seed());
            setPrice(design.price);
            resetGenerate();
        }
    }, [open, design.id]);

    const taxonomyId = design.designType ? etsyTaxonomyMap[design.designType] : undefined;
    const canSend = !!taxonomyId && title.trim().length > 0 && description.trim().length > 0;

    const handleGenerate = () => generate(undefined, { onSuccess: applyCopy });

    const handleSend = async () => {
        await push({ title: title.trim(), description, tags, price });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Send to Etsy</DialogTitle>
                    <DialogDescription>Review before creating the draft listing on Etsy.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-muted-foreground">
                            Generate a title, description and tags from this design's materials and photos.
                        </p>
                        <Button type="button" variant="outline" onClick={handleGenerate} disabled={isGenerating || isPushing}>
                            <Sparkles className="h-4 w-4" />
                            {isGenerating ? 'Generating…' : 'Generate with AI'}
                        </Button>
                    </div>
                    {generateError && (
                        <p role="alert" className="text-sm text-destructive">
                            {generateErrorMessage(generateError)}
                        </p>
                    )}

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="etsy-title">Title</Label>
                            <span className="text-xs text-muted-foreground">
                                {title.length}/{ETSY_TITLE_MAX}
                            </span>
                        </div>
                        <Input
                            id="etsy-title"
                            value={title}
                            maxLength={ETSY_TITLE_MAX}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="etsy-description">Description</Label>
                        <Textarea
                            id="etsy-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={8}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="etsy-tags">Tags</Label>
                        <TagInput id="etsy-tags" value={tags} onChange={setTags} />
                    </div>

                    {/* Category, Price, Photos and pushError blocks: unchanged from the current file */}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPushing}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSend} disabled={isPushing || isGenerating || !canSend}>
                        {isPushing ? 'Sending…' : 'Send to Etsy'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
```

**Label check:** `TagInput`'s input carries `aria-label="Add tag"`, which overrides the `htmlFor` label. So the e2e spec targets `getByLabel('Add tag')` and `getByLabel('Title')`/`'Description'`. The Category, Price, Photos and pushError markup is copied verbatim from the current lines 74-107.

- [ ] **Step 4: Run e2e, unit and visual specs**

Run: `cd packages/web && bunx playwright test tests/e2e/etsy-listing-copy.spec.ts tests/e2e/design-edit-no-etsy-push.spec.ts --project=chromium && bunx playwright test tests/e2e/view-design.visual.spec.ts`
Expected: PASS. The visual spec does not open the dialog, so its baselines should be unchanged. If a baseline does change, inspect the diff before running `--update-snapshots`.

- [ ] **Step 5: Commit**

```bash
git add packages/web
git commit -m "feat(web): editable AI title, description and tags in Send to Etsy dialog"
```

---

### Task 8: Full verification, smoke, docs and board

**Files:**
- Modify: `README.md` (env section, if it lists API env vars), `/mnt/tank/shared/notes/kanban/jewellery-catalogue.board.md`

- [ ] **Step 1: Lint, types, all tests**

Run each of these and expect all to pass:
- `bun run lint`
- `bun run tsc --noEmit`
- `bun run --filter @jewellery-catalogue/api test`
- `cd packages/web && bunx vitest run`
- `bun run --filter @jewellery-catalogue/web pw:e2e`

- [ ] **Step 2: Smoke the real endpoint without a key**

With the dev stack running and no `FAL_KEY` set, run:

```bash
curl -s -o /dev/stderr -w '%{http_code}\n' -X POST \
  -H "Authorization: Bearer $(cd packages/web && bun -e "import {MOCK_TOKEN_ETSY_LISTING_COPY as t} from './tests/e2e/mocks/auth'; console.log(t)")" \
  http://localhost:3001/api/designs/<design-id-for-that-user>/etsy-listing/generate
```

Expected: `503` with body containing `AI generation is not configured`. This proves the route, auth and DI wiring.

- [ ] **Step 3: Smoke a real generation if a key is available**

If the user supplies a `FAL_KEY`, set it in `.env`, restart the API, create a design with a photo and materials, then click **Generate with AI** in the browser. Check that:
- the title is ≤140 characters;
- there are ≤13 tags, each ≤20 characters;
- the description contains no invented stones or sizes.

If no key is available, report that this check is still outstanding.

- [ ] **Step 4: Docs**

If `README.md` documents API environment variables, add `FAL_KEY` (optional; enables AI listing copy) and `FAL_MODEL` (optional; default `google/gemini-2.5-flash`). `CHANGELOG.md` is generated by semantic-release, so don't edit it.

- [ ] **Step 5: Board**

On the `jewellery-catalogue-shop-description-field` card, set `pr` once the PR is opened and move the card per the kanban-worker flow.

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: document FAL_KEY for AI listing copy"
```
