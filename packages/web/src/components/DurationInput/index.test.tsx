import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { Form } from '@/components/ui/form';

import DurationInput from '.';

type Values = { timeRequired: string };

let form: UseFormReturn<Values>;

const Harness = ({ initial = '', error }: { initial?: string; error?: string }) => {
    const f = useForm<Values>({ defaultValues: { timeRequired: initial } });
    form = f;

    useEffect(() => {
        if (error) f.setError('timeRequired', { message: error });
    }, [error, f]);

    return (
        <Form {...f}>
            <DurationInput form={f} name="timeRequired" />
        </Form>
    );
};

const hours = () => screen.getByLabelText('Hours') as HTMLInputElement;
const minutes = () => screen.getByLabelText('Minutes') as HTMLInputElement;
const type = (el: HTMLInputElement, value: string) => fireEvent.change(el, { target: { value } });

describe('DurationInput', () => {
    afterEach(cleanup);

    it('keeps typed minutes as typed and commits the value straight away', () => {
        render(<Harness />);
        type(minutes(), '6');
        expect(form.getValues('timeRequired')).toBe('00:06');
        type(minutes(), '60');
        expect(minutes().value).toBe('60');
        expect(hours().value).toBe('');
        expect(form.getValues('timeRequired')).toBe('01:00');
    });

    it('normalises minutes of 60 or more on blur', () => {
        render(<Harness />);
        type(minutes(), '90');
        fireEvent.blur(minutes());
        expect(hours().value).toBe('1');
        expect(minutes().value).toBe('30');
        expect(form.getValues('timeRequired')).toBe('01:30');
    });

    it('leaves a cleared box empty while the other holds a value', () => {
        render(<Harness initial="01:15" />);
        type(hours(), '');
        expect(hours().value).toBe('');
        expect(minutes().value).toBe('15');
        expect(form.getValues('timeRequired')).toBe('00:15');
        fireEvent.blur(hours());
        expect(hours().value).toBe('');
    });

    it('stores an empty string when both boxes are blank and 00:00 for an explicit zero', () => {
        render(<Harness initial="00:30" />);
        type(hours(), '');
        type(minutes(), '');
        expect(form.getValues('timeRequired')).toBe('');
        type(hours(), '0');
        type(minutes(), '0');
        expect(form.getValues('timeRequired')).toBe('00:00');
    });

    it('shows a value set from outside, such as a restored draft', () => {
        render(<Harness />);
        fireEvent.focus(hours());
        act(() => form.reset({ timeRequired: '1:5' }));
        expect(hours().value).toBe('1');
        expect(minutes().value).toBe('5');
    });

    it('links the error message to both inputs', async () => {
        render(<Harness error="Please enter the time required" />);
        const message = await screen.findByText('Please enter the time required');

        for (const input of [hours(), minutes()]) {
            expect(input.getAttribute('aria-invalid')).toBe('true');
            expect(input.getAttribute('aria-describedby')).toContain(message.id);
        }
    });
});
