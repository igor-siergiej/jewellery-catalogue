import { describe, expect, it } from 'vite-plus/test';
import { z } from 'zod';

import { zodErrorMap } from './formErrors';

const messageFor = (schema: z.ZodType, input: unknown) => {
    const result = schema.safeParse(input, { error: zodErrorMap });

    return result.success ? undefined : result.error.issues[0].message;
};

describe('zodErrorMap', () => {
    it('names the field for invalid enums', () => {
        const options = ['FULL', 'FILLED', 'PLATED'] as const;

        const schema = z.object({
            wireType: z.enum(options),
            metalType: z.enum(options),
            designType: z.enum(options),
        });

        for (const [field, message] of [
            ['wireType', 'Pick a wire type'],
            ['metalType', 'Pick a metal type'],
            ['designType', 'Pick a design type'],
        ]) {
            const input = { wireType: 'FULL', metalType: 'FULL', designType: 'FULL', [field]: 'nope' };
            expect(messageFor(schema, input)).toBe(message);
        }
    });

    it('uses the last named segment for nested paths', () => {
        const schema = z.object({ items: z.array(z.object({ wireType: z.enum(['A']) })) });
        expect(messageFor(schema, { items: [{ wireType: 'B' }] })).toBe('Pick a wire type');
    });

    it('falls back to a generic message for other invalid values', () => {
        expect(messageFor(z.object({ colour: z.enum(['A']) }), { colour: 'B' })).toBe('Pick one of the options');
    });

    it('passes other issues through', () => {
        expect(messageFor(z.string().min(1, 'Please enter a name'), '')).toBe('Please enter a name');
        expect(messageFor(z.string(), 5)).toContain('expected string');
    });
});
