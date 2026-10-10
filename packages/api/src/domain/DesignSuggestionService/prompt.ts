import { DesignType, type Material, MaterialType } from '@jewellery-catalogue/types';
import { z } from 'zod';

export const DESIGN_SUGGESTION_SYSTEM_PROMPT = [
    'You help a handmade jewellery maker catalogue a new piece from photos.',
    "You are given photos of one finished piece and the maker's material inventory.",
    'Identify the piece type, give it a short shop-friendly name, and list the materials it uses.',
    'Only use material ids that appear in the inventory. Never invent an id.',
    'If something in the photo does not match any inventory item, list it under notInStock instead.',
    'Quantities: wire and chain in centimetres, beads and ear hooks as a count of pieces.',
    'Reply with a single JSON object only.',
].join('\n');

const describeInventoryItem = (m: Material): string => {
    const code = m.materialCode ? `, code ${m.materialCode}` : '';
    switch (m.type) {
        case MaterialType.BEAD:
            return `- id ${m.id}: bead "${m.name}", colour ${m.colour}, ${m.diameter}mm${code} (quantity = pieces)`;
        case MaterialType.EAR_HOOK:
            return `- id ${m.id}: ear hook "${m.name}", ${m.metalType.toLowerCase()} ${m.wireType.toLowerCase()}${code} (quantity = pieces)`;
        case MaterialType.WIRE:
            return `- id ${m.id}: wire "${m.name}", ${m.metalType.toLowerCase()} ${m.wireType.toLowerCase()}, ${m.diameter}mm${code} (quantity = cm)`;
        case MaterialType.CHAIN:
            return `- id ${m.id}: chain "${m.name}", ${m.metalType.toLowerCase()} ${m.wireType.toLowerCase()}${code} (quantity = cm)`;
    }
};

export const buildDesignSuggestionPrompt = (inventory: Material[], photoCount: number): string =>
    [
        `There ${photoCount === 1 ? 'is 1 photo' : `are ${photoCount} photos`} of the piece.`,
        '',
        'Inventory:',
        ...(inventory.length > 0 ? inventory.map(describeInventoryItem) : ['(empty)']),
        '',
        `designType must be one of ${Object.values(DesignType).join(', ')}, or null if unsure.`,
        'Return JSON shaped exactly like:',
        '{"name": string, "designType": string|null, "materials": [{"materialId": string, "quantity": number, "confidence": number between 0 and 1}], "notInStock": [{"description": string}]}',
    ].join('\n');

export const designSuggestionReplySchema = z.object({
    name: z.string().trim().min(1).max(80),
    designType: z.enum(DesignType).nullable(),
    materials: z
        .array(
            z.object({
                materialId: z.string().min(1),
                quantity: z.number().positive(),
                confidence: z.number().min(0).max(1),
            })
        )
        .max(30),
    notInStock: z.array(z.object({ description: z.string().trim().min(1).max(200) })).max(20),
});
export type DesignSuggestionReply = z.infer<typeof designSuggestionReplySchema>;
