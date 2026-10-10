import type { Design } from '@jewellery-catalogue/types';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EtsyPushDialog from '.';

vi.mock('../../hooks/useUserSettings', () => ({
    useUserSettings: () => ({ etsyDescriptionTemplate: '{description}', etsyTaxonomyMap: { RING: 1 } }),
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
    afterEach(cleanup);

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
            screen.getByText('Resuming an interrupted upload — the listing text was already sent to Etsy.')
        ).toBeTruthy();
        expect((screen.getByRole('button', { name: /Generate/ }) as HTMLButtonElement).disabled).toBe(true);
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
});
