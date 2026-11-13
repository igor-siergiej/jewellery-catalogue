import type { Design } from '@jewellery-catalogue/types';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vite-plus/test';

import EtsyPushDialog from '.';

vi.mock('../../hooks/useUserSettings', () => ({
    useUserSettings: () => ({ etsyDescriptionTemplate: '{description}', etsyTaxonomyMap: { RING: 1 } }),
}));

const taxonomy = vi.hoisted(() => ({ options: [] as Array<{ id: number; label: string }>, isLoading: false }));

vi.mock('../../hooks/useEtsyTaxonomy', () => ({
    useEtsyTaxonomy: () => taxonomy,
}));

const push = vi.fn().mockResolvedValue({});

vi.mock('../../hooks/useEtsyPush', () => ({
    useEtsyPush: () => ({ push, isPushing: false, pushError: null }),
}));

vi.mock('../../hooks/useGenerateEtsyListing', () => ({
    useGenerateEtsyListing: () => ({
        generate: vi.fn(),
        isGenerating: false,
        generateError: null,
        resetGenerate: vi.fn(),
    }),
}));

const design = (overrides: Partial<Design> = {}): Design =>
    ({
        id: 'd1',
        userId: 'u1',
        name: 'Silver ring',
        designType: 'RING',
        timeRequired: '01:00',
        materials: [],
        imageIds: [],
        makingNotes: '',
        price: 10,
        description: '<p>Pretty</p>',
        totalMaterialCosts: 1,
        dateAdded: new Date(),
        totalQuantity: 1,
        ...overrides,
    }) as Design;

const sendButton = () => screen.getByRole('button', { name: 'Send to Etsy' }) as HTMLButtonElement;
const titleInput = () => screen.getByLabelText('Title') as HTMLInputElement;

describe('EtsyPushDialog', () => {
    beforeAll(() => {
        window.matchMedia ??= ((query: string) => ({
            matches: false,
            media: query,
            addEventListener: () => {},
            removeEventListener: () => {},
        })) as unknown as typeof window.matchMedia;
    });

    afterEach(() => {
        cleanup();
        taxonomy.options = [];
        taxonomy.isLoading = false;
    });

    it('clamps a long design name to the Etsy title limit', () => {
        render(<EtsyPushDialog design={design({ name: 'a'.repeat(200) })} open onOpenChange={() => {}} />);
        expect(titleInput().value).toHaveLength(140);
    });

    it('disables Send and shows a hint for an invalid title', () => {
        render(<EtsyPushDialog design={design()} open onOpenChange={() => {}} />);
        expect(sendButton().disabled).toBe(false);
        fireEvent.change(titleInput(), { target: { value: 'Ring & Band & Gift' } });
        expect(sendButton().disabled).toBe(true);
        expect(
            screen.getByText('Etsy titles can use %, :, & and + once each, and no emoji or symbols like £ or ½.')
        ).toBeTruthy();
        fireEvent.change(titleInput(), { target: { value: 'Ring 💍' } });
        expect(sendButton().disabled).toBe(true);
    });

    it('locks the listing text when resuming an interrupted push', () => {
        const etsy = { pushIncomplete: true } as Design['etsy'];
        render(<EtsyPushDialog design={design({ etsy })} open onOpenChange={() => {}} />);
        expect(
            screen.getByText('Resuming an interrupted upload. The listing text was already sent to Etsy.')
        ).toBeTruthy();
        expect(
            (screen.getByRole('button', { name: 'Write title and description' }) as HTMLButtonElement).disabled
        ).toBe(true);
        expect(titleInput().disabled).toBe(true);
        expect((screen.getByLabelText('Description') as HTMLTextAreaElement).disabled).toBe(true);
        expect((screen.getByLabelText('Add tag') as HTMLInputElement).disabled).toBe(true);
        expect(sendButton().disabled).toBe(false);
    });

    it('sends only the price when resuming an interrupted push', async () => {
        push.mockClear();
        const etsy = { pushIncomplete: true } as Design['etsy'];
        render(<EtsyPushDialog design={design({ etsy, description: '' })} open onOpenChange={() => {}} />);
        fireEvent.click(sendButton());
        await waitFor(() => expect(push).toHaveBeenCalledWith({ price: 10 }));
    });

    it('shows the category by its Etsy name', () => {
        taxonomy.options = [{ id: 1, label: 'Jewellery > Rings' }];
        render(<EtsyPushDialog design={design()} open onOpenChange={() => {}} />);
        expect(screen.getByText('Jewellery > Rings')).toBeTruthy();
        expect(screen.queryByText(/Taxonomy #/)).toBeNull();
    });

    it('falls back to the category id while the name is unknown', () => {
        render(<EtsyPushDialog design={design()} open onOpenChange={() => {}} />);
        expect(screen.getByText('Etsy category 1')).toBeTruthy();
        expect(screen.queryByText(/Taxonomy #/)).toBeNull();
    });

    it('says when no category is mapped and keeps Send disabled', () => {
        render(<EtsyPushDialog design={design({ designType: 'NECKLACE' as never })} open onOpenChange={() => {}} />);
        expect(screen.getByText(/No category is set for necklaces/)).toBeTruthy();
        expect(sendButton().disabled).toBe(true);
    });

    it.each([
        [0, 'No product photos. You can add them on Etsy before publishing.'],
        [1, '1 photo will be sent'],
        [3, '3 photos will be sent'],
    ])('describes %i product photos', (count, text) => {
        const imageIds = Array.from({ length: count }, (_, i) => `img-${i}`);
        render(<EtsyPushDialog design={design({ imageIds })} open onOpenChange={() => {}} />);
        expect(screen.getByText(text)).toBeTruthy();
    });

    it('labels the AI action by its outcome', () => {
        render(<EtsyPushDialog design={design()} open onOpenChange={() => {}} />);
        expect(screen.getByRole('button', { name: 'Write title and description' })).toBeTruthy();
    });
});
