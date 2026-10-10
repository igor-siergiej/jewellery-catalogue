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

    it('clears the error when the draft text changes', () => {
        render(<Harness />);
        add('a'.repeat(21));
        fireEvent.change(screen.getByLabelText('Add tag'), { target: { value: 'ok' } });
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('clears the error when a blank draft is committed', () => {
        render(<Harness />);
        add('a'.repeat(21));
        add('   ');
        expect(screen.queryByRole('alert')).toBeNull();
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
